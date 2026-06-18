import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export type { ThreadMessage } from '@/lib/inbox-types';
import type { ThreadMessage } from '@/lib/inbox-types';

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials missing');

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
  if (!res.ok) throw new Error(data.error_description || 'Failed to refresh token');
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  return { accessToken: data.access_token, expiresAt };
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload: any): string {
  if (!payload) return '';

  // Single part with body data
  if (payload.body?.data) {
    const text = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/html') {
      return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    return text;
  }

  // Multipart: prefer text/plain, fall back to text/html
  const parts: any[] = payload.parts || [];
  const textPart = parts.find(p => p.mimeType === 'text/plain');
  if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);

  const htmlPart = parts.find(p => p.mimeType === 'text/html');
  if (htmlPart?.body?.data) {
    return decodeBase64Url(htmlPart.body.data).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Nested multipart (e.g. multipart/alternative inside multipart/mixed)
  for (const part of parts) {
    const nested = extractBody(part);
    if (nested) return nested;
  }

  return '';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data: settings } = await supabase
      .from('settings')
      .select('google_access_token, google_refresh_token, google_token_expires_at, google_email')
      .eq('user_id', user.id)
      .single();

    if (!settings?.google_refresh_token) {
      return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
    }

    let accessToken = settings.google_access_token;
    if (!accessToken || (settings.google_token_expires_at && new Date(settings.google_token_expires_at).getTime() - Date.now() < 300_000)) {
      const refreshed = await refreshAccessToken(settings.google_refresh_token);
      accessToken = refreshed.accessToken;
      await supabase.from('settings').update({
        google_access_token: refreshed.accessToken,
        google_token_expires_at: refreshed.expiresAt,
      }).eq('user_id', user.id);
    }

    const res = await fetch(
      `https://gmail.googleapis.com/v1/users/me/threads/${threadId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (res.status === 403) {
      return NextResponse.json({ error: 'scope_missing', needsReauth: true }, { status: 403 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Gmail API error' }, { status: res.status });
    }

    const thread = await res.json();
    const userEmail = settings.google_email || '';

    const messages: ThreadMessage[] = (thread.messages || []).map((msg: any) => {
      const headers: { name: string; value: string }[] = msg.payload?.headers || [];
      const from = getHeader(headers, 'From');
      return {
        id: msg.id,
        from,
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject'),
        date: new Date(Number(msg.internalDate)).toLocaleString('fr-FR', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        body: extractBody(msg.payload),
        isFromUser: from.includes(userEmail),
      };
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('GET /api/inbox/thread/[threadId] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
