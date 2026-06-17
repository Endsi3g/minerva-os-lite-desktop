import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
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
  if (!res.ok) throw new Error(data.error_description || 'Token refresh failed');
  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

async function getGmailThread(accessToken: string, threadId: string) {
  const res = await fetch(
    `https://gmail.googleapis.com/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.includes('placeholder')) {
    return NextResponse.json({ ok: true, skipped: 'Google OAuth not configured' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all users with Gmail connected who have leads with thread IDs
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('user_id, workspace_id, google_refresh_token, google_access_token, google_token_expires_at, google_email')
    .not('google_refresh_token', 'is', null);

  if (!settingsRows || settingsRows.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let totalReplies = 0;

  for (const settings of settingsRows) {
    if (!settings.google_refresh_token) continue;

    // Get leads with a gmail_thread_id that haven't been marked as replied
    const { data: leads } = await supabase
      .from('leads')
      .select('id, workspace_id, business_name, gmail_thread_id, status')
      .eq('user_id', settings.user_id)
      .not('gmail_thread_id', 'is', null)
      .is('reply_detected_at', null)
      .not('status', 'in', '("Won","Lost")');

    if (!leads || leads.length === 0) continue;

    // Ensure we have a valid access token
    let accessToken = settings.google_access_token;
    const isExpired =
      !settings.google_token_expires_at ||
      new Date(settings.google_token_expires_at).getTime() - 5 * 60 * 1000 < Date.now();

    if (isExpired) {
      try {
        const refreshed = await refreshAccessToken(settings.google_refresh_token, clientId, clientSecret);
        accessToken = refreshed.accessToken;
        await supabase
          .from('settings')
          .update({
            google_access_token: refreshed.accessToken,
            google_token_expires_at: refreshed.expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', settings.user_id);
      } catch {
        continue; // Skip this user if token refresh fails
      }
    }

    for (const lead of leads) {
      if (!lead.gmail_thread_id) continue;

      try {
        const thread = await getGmailThread(accessToken, lead.gmail_thread_id);
        if (!thread || !thread.messages || thread.messages.length < 2) continue;

        // A reply exists if the thread has more than 1 message
        // The first message is the one we sent; subsequent messages are replies
        const senderEmail = settings.google_email;
        const hasExternalReply = thread.messages.some((msg: any, idx: number) => {
          if (idx === 0) return false; // skip our own sent message
          const fromHeader = msg.payload?.headers?.find((h: any) => h.name === 'From')?.value || '';
          return !fromHeader.includes(senderEmail);
        });

        if (!hasExternalReply) continue;

        const now = new Date().toISOString();

        await supabase
          .from('leads')
          .update({
            reply_detected_at: now,
            status: 'Meeting Booked', // Upgrade status — replied lead is a warm prospect
            updated_at: now,
          })
          .eq('id', lead.id);

        // Create notification
        await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: settings.user_id,
          workspace_id: lead.workspace_id || settings.workspace_id,
          type: 'reply_detected',
          title: 'Réponse détectée',
          body: `${lead.business_name} a répondu à votre e-mail.`,
          link: `/leads/${lead.id}`,
          is_read: false,
          created_at: now,
          updated_at: now,
        });

        totalReplies++;
      } catch {
        // Silently skip threads that fail (rate limits, deleted threads, etc.)
      }
    }
  }

  return NextResponse.json({ ok: true, repliesDetected: totalReplies });
}
