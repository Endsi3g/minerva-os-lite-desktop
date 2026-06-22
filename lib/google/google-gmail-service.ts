export interface GmailThreadItem {
  id: string;
  snippet: string;
  historyId: string;
}

export async function listGmailThreads(accessToken: string): Promise<GmailThreadItem[]> {
  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=20';
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to list Gmail threads: ${response.statusText}`);
  }
  const data = await response.json();
  return data.threads || [];
}

export async function getGmailThread(accessToken: string, threadId: string): Promise<any> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch thread ${threadId}: ${response.statusText}`);
  }
  return response.json();
}

function parseHeader(headers: any[], name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function extractEmailAddress(headerValue: string): string {
  if (!headerValue) return '';
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[1].trim().toLowerCase() : headerValue.trim().toLowerCase();
}

function makeRawEmail(to: string, subject: string, body: string, messageId?: string) {
  const headers = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ];

  if (messageId) {
    headers.push(`In-Reply-To: ${messageId}`);
    headers.push(`References: ${messageId}`);
  }

  const email = [
    headers.join('\r\n'),
    '',
    Buffer.from(body).toString('base64')
  ].join('\r\n');

  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  replyToMessageId?: string
): Promise<any> {
  const raw = makeRawEmail(to, subject, body, replyToMessageId);
  const payload: any = { raw };
  if (threadId) {
    payload.threadId = threadId;
  }

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to send email: ${JSON.stringify(resData)}`);
  }
  return resData;
}

export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<any> {
  const raw = makeRawEmail(to, subject, body);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: { raw }
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create draft: ${JSON.stringify(resData)}`);
  }
  return resData;
}

export async function syncGmailThreads(
  supabase: any,
  userId: string,
  accessToken: string,
  workspaceId: string
): Promise<number> {
  try {
    // 1. Fetch leads for this workspace
    const { data: leads } = await supabase
      .from('leads')
      .select('id, contact_email, business_name')
      .eq('workspace_id', workspaceId);

    if (!leads || leads.length === 0) return 0;

    const emailToLeadMap = new Map<string, any>();
    leads.forEach((lead: any) => {
      if (lead.contact_email) {
        emailToLeadMap.set(lead.contact_email.toLowerCase().trim(), lead);
      }
    });

    // 2. Fetch recent Gmail threads
    const threads = await listGmailThreads(accessToken);
    let matchedCount = 0;

    for (const t of threads) {
      // Get detailed thread to examine headers and find corresponding lead
      const details = await getGmailThread(accessToken, t.id);
      const messages = details.messages || [];
      if (messages.length === 0) continue;

      // Extract all email addresses involved in headers (From, To)
      const emailsInThread = new Set<string>();
      let lastMsgAt = new Date().toISOString();
      let lastMsgFrom = '';
      const snippet = details.messages[0].snippet || '';
      let unread = false;

      messages.forEach((msg: any) => {
        const headers = msg.payload?.headers || [];
        const fromVal = parseHeader(headers, 'From');
        const toVal = parseHeader(headers, 'To');
        const dateVal = parseHeader(headers, 'Date');

        if (fromVal) emailsInThread.add(extractEmailAddress(fromVal));
        if (toVal) {
          toVal.split(',').forEach((to: string) => {
            emailsInThread.add(extractEmailAddress(to));
          });
        }

        const dateParsed = new Date(dateVal);
        if (!isNaN(dateParsed.getTime())) {
          lastMsgAt = dateParsed.toISOString();
        }

        // Keep track of the last message info
        lastMsgFrom = extractEmailAddress(fromVal);
        if (msg.labelIds?.includes('UNREAD')) {
          unread = true;
        }
      });

      // Find if any email matches a lead
      let matchingLead: any = null;
      for (const email of emailsInThread) {
        if (emailToLeadMap.has(email)) {
          matchingLead = emailToLeadMap.get(email);
          break;
        }
      }

      if (matchingLead) {
        matchedCount++;
        const subject = parseHeader(messages[messages.length - 1].payload?.headers || [], 'Subject') || 'No Subject';

        // Save inside gmail_threads
        await supabase
          .from('gmail_threads')
          .upsert({
            id: t.id,
            user_id: userId,
            workspace_id: workspaceId,
            lead_id: matchingLead.id,
            subject,
            last_message_at: lastMsgAt,
            snippet,
            unread,
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          });

        // If the last message came from the lead (and not from the user), detect it as reply!
        const userEmailResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        let userEmail = '';
        if (userEmailResponse.ok) {
          const u = await userEmailResponse.json();
          userEmail = (u.email || '').toLowerCase().trim();
        }

        if (lastMsgFrom && lastMsgFrom !== userEmail) {
          // Update lead with reply status
          await supabase
            .from('leads')
            .update({
              reply_detected_at: lastMsgAt,
              reply_status: 'replied',
              gmail_thread_id: t.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', matchingLead.id);
        }
      }
    }

    return matchedCount;
  } catch (err) {
    console.error('Error syncing Gmail threads:', err);
    return 0;
  }
}
