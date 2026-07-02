import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken, getAuthStatus } from '@/lib/google/google-auth-service';
export type { InboxThread } from '@/lib/inbox-types';
import type { InboxThread } from '@/lib/inbox-types';

async function refreshLegacyToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
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

async function resolveAccessToken(
  supabase: any,
  userId: string
): Promise<{ accessToken: string; googleEmail: string } | null> {
  // Always use maybeSingle to avoid crash on missing/duplicate rows
  const { data: settings } = await supabase
    .from('settings')
    .select('google_access_token, google_refresh_token, google_token_expires_at, google_email')
    .eq('user_id', userId)
    .maybeSingle();

  let accessToken: string | null = settings?.google_access_token ?? null;
  let googleEmail: string = settings?.google_email ?? '';

  // Path 1: legacy settings.google_refresh_token (old OAuth flow)
  if (settings?.google_refresh_token) {
    const needsRefresh = !accessToken ||
      (settings.google_token_expires_at &&
        new Date(settings.google_token_expires_at).getTime() - Date.now() < 300_000);

    if (needsRefresh) {
      try {
        const refreshed = await refreshLegacyToken(settings.google_refresh_token);
        accessToken = refreshed.accessToken;
        await supabase
          .from('settings')
          .update({ google_access_token: refreshed.accessToken, google_token_expires_at: refreshed.expiresAt })
          .eq('user_id', userId);
      } catch {
        // Legacy refresh failed — fall through to newer token path
        accessToken = null;
      }
    }

    if (accessToken) return { accessToken, googleEmail };
  }

  // Path 2: newer google_accounts / google_tokens tables (uses status check)
  try {
    const status = await getAuthStatus(supabase, userId);
    if (status.connected) {
      const freshToken = await getFreshAccessToken(supabase, userId);
      return { accessToken: freshToken, googleEmail: status.email || googleEmail };
    }
  } catch { /* fall through to path 3 */ }

  // Path 3: direct google_tokens query — bypasses status='error' so reconnect heals itself
  try {
    const { data: acct } = await supabase
      .from('google_accounts')
      .select('id, google_email')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (acct) {
      const { data: tok } = await supabase
        .from('google_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('account_id', acct.id)
        .maybeSingle();

      if (tok?.access_token) {
        const exp = new Date(tok.expires_at);
        if (exp.getTime() - Date.now() > 60000) {
          await supabase.from('google_accounts').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', acct.id);
          return { accessToken: tok.access_token, googleEmail: acct.google_email || '' };
        }
        if (tok.refresh_token) {
          const refreshed = await refreshLegacyToken(tok.refresh_token);
          await supabase.from('google_tokens')
            .update({ access_token: refreshed.accessToken, expires_at: refreshed.expiresAt, updated_at: new Date().toISOString() })
            .eq('account_id', acct.id);
          await supabase.from('google_accounts').update({ status: 'connected', updated_at: new Date().toISOString() }).eq('id', acct.id);
          return { accessToken: refreshed.accessToken, googleEmail: acct.google_email || '' };
        }
      }
    }
  } catch { }

  return null;
}

function getHeaderValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseFromEmail(fromRaw: string): { fromEmail: string; fromName: string } {
  const match = fromRaw.match(/<([^>]+)>/);
  const fromEmail = (match ? match[1] : fromRaw).toLowerCase().trim();
  const fromName = fromRaw.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail;
  return { fromEmail, fromName };
}

// Mode "all" — fetch all Gmail INBOX threads, auto-link to leads by email
async function getAllInboxThreads(
  accessToken: string,
  googleEmail: string,
  supabase: any,
  workspaceId: string
): Promise<{ threads: InboxThread[]; needsReauth: boolean }> {
  const listRes = await fetch(
    'https://gmail.googleapis.com/v1/users/me/threads?labelIds=INBOX&maxResults=30',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (listRes.status === 403) return { threads: [], needsReauth: true };
  if (!listRes.ok) return { threads: [], needsReauth: false };

  const listData = await listRes.json();
  const threadIds: string[] = (listData.threads || []).map((t: any) => t.id);
  if (!threadIds.length) return { threads: [], needsReauth: false };

  // Fetch all leads with contact_email for auto-linking
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, contact_email, reply_status, reply_detected_at, status, campaign_id')
    .eq('workspace_id', workspaceId)
    .not('contact_email', 'is', null);

  const leadByEmail = new Map<string, any>();
  for (const lead of leads || []) {
    if (lead.contact_email) {
      leadByEmail.set(lead.contact_email.toLowerCase().trim(), lead);
    }
  }

  let needsReauth = false;

  const results = await Promise.allSettled(
    threadIds.map(async (threadId) => {
      const res = await fetch(
        `https://gmail.googleapis.com/v1/users/me/threads/${threadId}?format=metadata` +
          `&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.status === 403) { needsReauth = true; return null; }
      if (!res.ok) return null;

      const thread = await res.json();
      const messages: any[] = thread.messages || [];
      if (!messages.length) return null;

      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];
      const headers: { name: string; value: string }[] = firstMsg.payload?.headers || [];

      const subject = getHeaderValue(headers, 'Subject') || '(Sans objet)';
      const fromRaw = getHeaderValue(headers, 'From');
      const { fromEmail, fromName } = parseFromEmail(fromRaw);

      const matchedLead = leadByEmail.get(fromEmail) ?? null;

      const lastDate = lastMsg?.internalDate
        ? new Date(Number(lastMsg.internalDate)).toISOString()
        : new Date().toISOString();

      const hasUnread = messages.some((m: any) => (m.labelIds || []).includes('UNREAD'));

      return {
        leadId: matchedLead?.id ?? null,
        leadName: matchedLead?.business_name ?? null,
        fromName,
        contactEmail: fromEmail,
        subject,
        gmailThreadId: threadId,
        replyStatus: matchedLead?.reply_status ?? null,
        replyDetectedAt: matchedLead?.reply_detected_at ?? null,
        leadStatus: matchedLead?.status ?? null,
        campaignId: matchedLead?.campaign_id ?? null,
        snippet: thread.snippet || '',
        lastMessageDate: lastDate,
        messageCount: messages.length,
        hasUnread,
        isLeadLinked: !!matchedLead,
      } as InboxThread;
    })
  );

  const threads = results
    .filter((r): r is PromiseFulfilledResult<InboxThread | null> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value as InboxThread)
    .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

  return { threads, needsReauth };
}

// Mode "leads" — only show threads from leads that have replied (existing behavior)
function isBusinessReply(
  subject: string,
  fromHeader: string,
  snippet: string,
  headers: { name: string; value: string }[]
): boolean {
  const fromLower = fromHeader.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  if (
    fromLower.includes('mailer-daemon') ||
    fromLower.includes('postmaster') ||
    fromLower.includes('noreply') ||
    fromLower.includes('no-reply')
  ) return false;

  if (
    subjectLower.includes('undeliver') ||
    subjectLower.includes('failure') ||
    subjectLower.includes('non distribué') ||
    subjectLower.includes('réponse automatique') ||
    subjectLower.includes('out of office') ||
    subjectLower.includes('absent') ||
    subjectLower.includes('auto-repl') ||
    subjectLower.includes('auto:') ||
    subjectLower.includes('automatic reply')
  ) return false;

  if (
    snippetLower.includes('out of office') ||
    snippetLower.includes('je suis absent') ||
    snippetLower.includes('réponse automatique') ||
    snippetLower.includes('automatic reply') ||
    snippetLower.includes('delivery failure') ||
    snippetLower.includes('adresse introuvable') ||
    snippetLower.includes('address not found')
  ) return false;

  if (headers && Array.isArray(headers)) {
    const autoSubmitted = headers.find(h => h.name.toLowerCase() === 'auto-submitted')?.value || '';
    if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') return false;
  }

  return true;
}

async function getLeadReplyThreads(
  accessToken: string,
  googleEmail: string,
  supabase: any,
  workspaceId: string
): Promise<{ threads: InboxThread[]; needsReauth: boolean }> {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, contact_email, gmail_thread_id, reply_status, reply_detected_at, status, campaign_id')
    .eq('workspace_id', workspaceId)
    .not('gmail_thread_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (!leads || leads.length === 0) return { threads: [], needsReauth: false };

  let needsReauth = false;

  const results = await Promise.allSettled(
    leads.map(async (lead: any) => {
      const res = await fetch(
        `https://gmail.googleapis.com/v1/users/me/threads/${lead.gmail_thread_id}?format=metadata` +
          `&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Auto-Submitted`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.status === 403) { needsReauth = true; return null; }
      if (!res.ok) return null;

      const thread = await res.json();
      const messages: any[] = thread.messages || [];
      if (messages.length < 2) return null;

      const senderEmail = googleEmail;
      const hasBusinessReply = messages.some((msg: any, idx: number) => {
        if (idx === 0) return false;
        const headers = msg.payload?.headers || [];
        const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
        if (fromHeader.includes(senderEmail)) return false;
        const subjectHeader = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const snippet = msg.snippet || '';
        return isBusinessReply(subjectHeader, fromHeader, snippet, headers);
      });

      if (!hasBusinessReply) return null;

      const firstMsg = messages[0];
      const firstHeaders: { name: string; value: string }[] = firstMsg.payload?.headers || [];
      const subject = getHeaderValue(firstHeaders, 'Subject') || '(Sans objet)';
      const lastMsg = messages[messages.length - 1];

      return {
        leadId: lead.id,
        leadName: lead.business_name,
        fromName: lead.business_name,
        contactEmail: lead.contact_email || '',
        subject,
        gmailThreadId: lead.gmail_thread_id,
        replyStatus: lead.reply_status || null,
        replyDetectedAt: lead.reply_detected_at || null,
        leadStatus: lead.status || null,
        campaignId: lead.campaign_id || null,
        snippet: thread.snippet || '',
        lastMessageDate: lastMsg?.internalDate
          ? new Date(Number(lastMsg.internalDate)).toISOString()
          : new Date().toISOString(),
        messageCount: messages.length,
        hasUnread: messages.some((m: any) => (m.labelIds || []).includes('UNREAD')),
        isLeadLinked: true,
      } as InboxThread;
    })
  );

  const threads = results
    .filter((r): r is PromiseFulfilledResult<InboxThread | null> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value as InboxThread)
    .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

  return { threads, needsReauth };
}

async function getSentThreads(
  accessToken: string,
  googleEmail: string,
  supabase: any,
  workspaceId: string
): Promise<{ threads: InboxThread[]; needsReauth: boolean }> {
  const listRes = await fetch(
    'https://gmail.googleapis.com/v1/users/me/threads?labelIds=SENT&maxResults=30',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (listRes.status === 403) return { threads: [], needsReauth: true };
  if (!listRes.ok) return { threads: [], needsReauth: false };

  const listData = await listRes.json();
  const threadIds: string[] = (listData.threads || []).map((t: any) => t.id);
  if (!threadIds.length) return { threads: [], needsReauth: false };

  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, contact_email, reply_status, reply_detected_at, status, campaign_id')
    .eq('workspace_id', workspaceId)
    .not('contact_email', 'is', null);

  const leadByEmail = new Map<string, any>();
  for (const lead of leads || []) {
    if (lead.contact_email) {
      leadByEmail.set(lead.contact_email.toLowerCase().trim(), lead);
    }
  }

  let needsReauth = false;

  const results = await Promise.allSettled(
    threadIds.map(async (threadId) => {
      const res = await fetch(
        `https://gmail.googleapis.com/v1/users/me/threads/${threadId}?format=metadata` +
          `&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.status === 403) { needsReauth = true; return null; }
      if (!res.ok) return null;

      const thread = await res.json();
      const messages: any[] = thread.messages || [];
      if (!messages.length) return null;

      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];
      const headers: { name: string; value: string }[] = firstMsg.payload?.headers || [];

      const subject = getHeaderValue(headers, 'Subject') || '(Sans objet)';
      const toRaw = getHeaderValue(headers, 'To');
      const { fromEmail: toEmail, fromName: toName } = parseFromEmail(toRaw);

      const matchedLead = leadByEmail.get(toEmail) ?? null;

      const lastDate = lastMsg?.internalDate
        ? new Date(Number(lastMsg.internalDate)).toISOString()
        : new Date().toISOString();

      return {
        leadId: matchedLead?.id ?? null,
        leadName: matchedLead?.business_name ?? null,
        fromName: toName || toEmail,
        contactEmail: toEmail,
        subject,
        gmailThreadId: threadId,
        replyStatus: matchedLead?.reply_status ?? null,
        replyDetectedAt: matchedLead?.reply_detected_at ?? null,
        leadStatus: matchedLead?.status ?? null,
        campaignId: matchedLead?.campaign_id ?? null,
        snippet: thread.snippet || '',
        lastMessageDate: lastDate,
        messageCount: messages.length,
        hasUnread: false,
        isLeadLinked: !!matchedLead,
      } as InboxThread;
    })
  );

  const threads = results
    .filter((r): r is PromiseFulfilledResult<InboxThread | null> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value as InboxThread)
    .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

  return { threads, needsReauth };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 });

    const mode = req.nextUrl.searchParams.get('mode') || 'leads';

    const tokenData = await resolveAccessToken(supabase, user.id);
    if (!tokenData) {
      return NextResponse.json({ threads: [], needsReauth: false, isConnected: false });
    }

    const { accessToken, googleEmail } = tokenData;

    let threads: InboxThread[];
    let needsReauth: boolean;

    if (mode === 'all') {
      ({ threads, needsReauth } = await getAllInboxThreads(accessToken, googleEmail, supabase, workspaceId));
    } else if (mode === 'sent') {
      ({ threads, needsReauth } = await getSentThreads(accessToken, googleEmail, supabase, workspaceId));
    } else {
      ({ threads, needsReauth } = await getLeadReplyThreads(accessToken, googleEmail, supabase, workspaceId));
    }

    // Join reply_intent from gmail_threads table (written by classify_reply agent tool)
    if (threads.length > 0) {
      const threadIds = threads.map(t => t.gmailThreadId);
      const { data: intentRows } = await supabase
        .from('gmail_threads')
        .select('thread_id, reply_intent, intent_confidence')
        .in('thread_id', threadIds);
      if (intentRows && intentRows.length > 0) {
        const intentMap = new Map<string, { intent: string; confidence: number }>(
          intentRows.map((r: any) => [r.thread_id, { intent: r.reply_intent, confidence: r.intent_confidence }])
        );
        threads = threads.map(t => {
          const row = intentMap.get(t.gmailThreadId);
          return row
            ? { ...t, replyIntent: row.intent as InboxThread['replyIntent'], intentConfidence: row.confidence ?? null }
            : { ...t, replyIntent: null, intentConfidence: null };
        });
      } else {
        threads = threads.map(t => ({ ...t, replyIntent: null, intentConfidence: null }));
      }
    }

    return NextResponse.json({ threads, needsReauth, isConnected: true });
  } catch (err) {
    console.error('GET /api/inbox/threads error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
