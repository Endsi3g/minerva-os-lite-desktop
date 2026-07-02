import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken, getAuthStatus } from '@/lib/google/google-auth-service';

async function refreshLegacyToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to refresh token');
  return { accessToken: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { threadId } = await req.json();
    if (!threadId) return NextResponse.json({ error: 'threadId requis' }, { status: 400 });

    const { data: settings } = await supabase
      .from('settings')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('user_id', user.id)
      .single();

    let accessToken: string | null = settings?.google_access_token ?? null;

    if (settings?.google_refresh_token) {
      if (!accessToken || (settings.google_token_expires_at && new Date(settings.google_token_expires_at).getTime() - Date.now() < 300_000)) {
        const refreshed = await refreshLegacyToken(settings.google_refresh_token);
        accessToken = refreshed.accessToken;
        await supabase.from('settings').update({ google_access_token: refreshed.accessToken, google_token_expires_at: refreshed.expiresAt }).eq('user_id', user.id);
      }
    } else {
      try {
        const status = await getAuthStatus(supabase, user.id);
        if (!status.connected) return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
        accessToken = await getFreshAccessToken(supabase, user.id);
      } catch {
        return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
      }
    }

    if (!accessToken) return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });

    // Remove INBOX label — requires gmail.modify scope
    const res = await fetch(`https://gmail.googleapis.com/v1/users/me/threads/${threadId}/modify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
    });

    if (res.status === 403) {
      return NextResponse.json({ error: 'scope_missing', needsReauth: true }, { status: 403 });
    }
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err?.error?.message || 'Erreur Gmail' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[inbox/archive]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
