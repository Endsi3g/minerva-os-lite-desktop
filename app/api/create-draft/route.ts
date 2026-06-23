import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function makeMimeMessage(to: string, subject: string, body: string) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    ...(to ? [`To: ${to}`] : []),
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ];
  const message = messageParts.join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to refresh token');
  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { to, subject = 'Prospection', body, leadId } = await req.json();
    if (!body) return NextResponse.json({ error: 'body requis' }, { status: 400 });

    const { data: settings } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();

    const isMockMode = !process.env.GOOGLE_CLIENT_ID || !settings?.google_refresh_token;

    if (isMockMode) {
      // Fallback: store as a document draft
      if (leadId) {
        await supabase.from('drafts').insert({
          user_id: user.id,
          lead_id: leadId,
          subject,
          body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().maybeSingle();
      }
      return NextResponse.json({ ok: true, simulated: true, draftId: null, message: 'Brouillon sauvegardé localement (Google non connecté).' });
    }

    // Refresh token if needed
    let token = settings.google_access_token;
    const isExpired = !settings.google_token_expires_at || new Date(settings.google_token_expires_at).getTime() - 5 * 60 * 1000 < Date.now();
    if (isExpired && settings.google_refresh_token) {
      const refreshed = await refreshAccessToken(settings.google_refresh_token);
      token = refreshed.accessToken;
      await supabase.from('settings').update({ google_access_token: token, google_token_expires_at: refreshed.expiresAt }).eq('user_id', user.id);
    }

    const rawMime = makeMimeMessage(to || '', subject, body);

    // Create Gmail draft (does NOT send)
    const gmailRes = await fetch('https://gmail.googleapis.com/v1/users/me/drafts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { raw: rawMime } }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.json();
      return NextResponse.json({ error: err.error?.message || 'Erreur Gmail' }, { status: 500 });
    }

    const draft = await gmailRes.json();

    return NextResponse.json({ ok: true, draftId: draft.id, simulated: false, message: `Brouillon créé dans Gmail (ID: ${draft.id}). Ouvrez Gmail pour compléter et envoyer.` });
  } catch (err) {
    console.error('create-draft error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
