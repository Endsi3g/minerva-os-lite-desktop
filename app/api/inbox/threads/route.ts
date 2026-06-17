import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export interface InboxThread {
  leadId: string;
  leadName: string;
  contactEmail: string;
  gmailThreadId: string;
  replyStatus: string | null;
  replyDetectedAt: string | null;
  snippet: string;
  lastMessageDate: string;
  messageCount: number;
  hasUnread: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 });

    const { data: settings } = await supabase
      .from('settings')
      .select('google_access_token, google_refresh_token, google_token_expires_at, google_email')
      .eq('user_id', user.id)
      .single();

    if (!settings?.google_refresh_token) {
      return NextResponse.json({ threads: [], needsReauth: false });
    }

    // Refresh token if expiring within 5 minutes
    let accessToken = settings.google_access_token;
    if (!accessToken || (settings.google_token_expires_at && new Date(settings.google_token_expires_at).getTime() - Date.now() < 300_000)) {
      const refreshed = await refreshAccessToken(settings.google_refresh_token);
      accessToken = refreshed.accessToken;
      await supabase.from('settings').update({
        google_access_token: refreshed.accessToken,
        google_token_expires_at: refreshed.expiresAt,
      }).eq('user_id', user.id);
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('id, business_name, contact_email, gmail_thread_id, reply_status, reply_detected_at')
      .eq('workspace_id', workspaceId)
      .not('gmail_thread_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (!leads || leads.length === 0) {
      return NextResponse.json({ threads: [], needsReauth: false });
    }

    let needsReauth = false;

    const results = await Promise.allSettled(
      leads.map(async (lead) => {
        const res = await fetch(
          `https://gmail.googleapis.com/v1/users/me/threads/${lead.gmail_thread_id}?format=minimal`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (res.status === 403) {
          needsReauth = true;
          return null;
        }
        if (!res.ok) return null;

        const thread = await res.json();
        const messages: any[] = thread.messages || [];
        const lastMsg = messages[messages.length - 1];

        return {
          leadId: lead.id,
          leadName: lead.business_name,
          contactEmail: lead.contact_email || '',
          gmailThreadId: lead.gmail_thread_id,
          replyStatus: lead.reply_status || null,
          replyDetectedAt: lead.reply_detected_at || null,
          snippet: thread.snippet || '',
          lastMessageDate: lastMsg?.internalDate
            ? new Date(Number(lastMsg.internalDate)).toISOString()
            : new Date().toISOString(),
          messageCount: messages.length,
          hasUnread: messages.some((m: any) => (m.labelIds || []).includes('UNREAD')),
        } as InboxThread;
      })
    );

    const threads: InboxThread[] = results
      .filter((r): r is PromiseFulfilledResult<InboxThread | null> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value as InboxThread)
      .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    return NextResponse.json({ threads, needsReauth });
  } catch (err) {
    console.error('GET /api/inbox/threads error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
