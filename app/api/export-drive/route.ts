import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials missing in env variables');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString()
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { leadId, fileName, content } = await req.json();
    if (!leadId || !fileName || !content) {
      return NextResponse.json({ error: 'leadId, fileName et content sont requis' }, { status: 400 });
    }

    // 2. Fetch Lead details
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 });
    }

    // 3. Fetch User Google tokens
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const isMockMode = !clientId || clientId.includes('placeholder') || !settings?.google_refresh_token;

    let refreshSuccess = false;

    // 4. Export to Google Drive (Real API or Simulated Mock)
    if (!isMockMode && settings) {
      try {
        let currentToken = settings.google_access_token;
        let expiresAt = settings.google_token_expires_at;

        // Check token expiration (refresh 5 minutes early to be safe)
        const isExpired = !expiresAt || new Date(expiresAt).getTime() - 5 * 60 * 1000 < Date.now();
        
        if (isExpired && settings.google_refresh_token) {
          const refreshed = await refreshAccessToken(settings.google_refresh_token);
          currentToken = refreshed.accessToken;
          expiresAt = refreshed.expiresAt;

          // Save refreshed tokens back to settings
          await supabase
            .from('settings')
            .update({
              google_access_token: currentToken,
              google_token_expires_at: expiresAt,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }

        // Upload via Google Drive Multipart API
        const fileMetadata = {
          name: fileName,
          mimeType: 'text/plain'
        };

        const boundary = 'minerva_drive_boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(fileMetadata) +
          delimiter +
          'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
          content +
          closeDelimiter;

        const driveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        });

        if (!driveResponse.ok) {
          const driveErr = await driveResponse.json();
          throw new Error(driveErr.error?.message || "Erreur de l'API Google Drive");
        }
        
        refreshSuccess = true;
      } catch (err) {
        console.warn("Google Drive API call failed, falling back to simulated mode for local sandbox:", err);
      }
    }

    const simulated = !refreshSuccess;
    if (simulated) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Append historical note
    const logText = simulated 
      ? `[Simulé] Audit SEO exporté avec succès sur Google Drive (mode bac à sable) :\nFichier : ${fileName}` 
      : `Audit SEO exporté avec succès sur Google Drive (compte ${settings?.google_email || 'connecté'}) :\nFichier : ${fileName}`;

    const { error: noteErr } = await supabase
      .from('notes')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        workspace_id: lead.workspace_id,
        type: 'general',
        content: logText
      });

    if (noteErr) throw noteErr;

    return NextResponse.json({
      success: true,
      simulated,
      fileName
    });

  } catch (err) {
    console.error("Error in export-drive API endpoint:", err);
    const msg = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
