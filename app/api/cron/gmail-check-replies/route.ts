import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { classifyReply } from '@/lib/agent-tools';

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

function isBusinessReply(subject: string, fromHeader: string, snippet: string, headers: { name: string; value: string }[]): boolean {
  const fromLower = fromHeader.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  // 1. Check for Bounce / Undelivered email senders
  if (
    fromLower.includes('mailer-daemon') ||
    fromLower.includes('postmaster') ||
    fromLower.includes('noreply') ||
    fromLower.includes('no-reply')
  ) {
    return false;
  }

  // 2. Check for bounce / automatic subjects
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
  ) {
    return false;
  }

  // 3. Check snippet content for automatic / away responses
  if (
    snippetLower.includes('out of office') ||
    snippetLower.includes('je suis absent') ||
    snippetLower.includes('réponse automatique') ||
    snippetLower.includes('automatic reply') ||
    snippetLower.includes('delivery failure') ||
    snippetLower.includes('adresse introuvable') ||
    snippetLower.includes('address not found')
  ) {
    return false;
  }

  // 4. Check headers for auto-submitted flags
  if (headers && Array.isArray(headers)) {
    const autoSubmitted = headers.find(h => h.name.toLowerCase() === 'auto-submitted')?.value || '';
    if (autoSubmitted && autoSubmitted.toLowerCase() !== 'no') {
      return false;
    }
  }

  return true;
}

async function getGmailThread(accessToken: string, threadId: string) {
  const res = await fetch(
    `https://gmail.googleapis.com/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Subject&metadataHeaders=Auto-Submitted`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        let replyMessage: { subject: string; snippet: string } | null = null;
        for (let idx = 1; idx < thread.messages.length; idx++) {
          const msg = thread.messages[idx];
          const headers = msg.payload?.headers || [];
          const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
          if (fromHeader.includes(senderEmail)) continue;

          const subjectHeader = headers.find((h: any) => h.name === 'Subject')?.value || '';
          const snippet = msg.snippet || '';

          if (isBusinessReply(subjectHeader, fromHeader, snippet, headers)) {
            replyMessage = { subject: subjectHeader, snippet };
            break;
          }
        }

        if (!replyMessage) continue;

        const now = new Date().toISOString();

        // Check if auto_tag_replies is enabled (default true) + load AI settings for classification
        const { data: userSettings } = await supabase
          .from('settings')
          .select('auto_tag_replies, ai_provider, ai_model, openrouter_key')
          .eq('user_id', settings.user_id)
          .maybeSingle();

        const autoTagEnabled = userSettings?.auto_tag_replies !== false;
        const workspaceId = lead.workspace_id || settings.workspace_id;

        // Real AI classification of the reply — replaces the previous "always assume interested" behavior.
        let classification: { intent?: string; should_pause_sequence?: boolean } = {};
        try {
          classification = await classifyReply(
            {
              workspaceId,
              userId: settings.user_id,
              supabase,
              settings: {
                ai_provider: userSettings?.ai_provider,
                ai_model: userSettings?.ai_model,
                openrouter_key: userSettings?.openrouter_key,
              },
            },
            { lead_id: lead.id, subject: replyMessage.subject, snippet: replyMessage.snippet.slice(0, 800), thread_id: lead.gmail_thread_id },
          );
        } catch (err) {
          console.error('[gmail-check-replies] classification failed, defaulting to neutral:', err);
        }

        const intent = classification.intent ?? 'other';
        const isPositive = intent === 'interested' || intent === 'scheduling';
        const isNegative = intent === 'not_interested' || intent === 'objection';

        const INTENT_TAG_MAP: Record<string, string> = {
          interested: 'Intéressé',
          scheduling: 'RDV demandé',
          not_interested: 'Pas intéressé',
          objection: 'Objection',
          info_request: 'Demande info',
          other: 'Réponse reçue',
        };
        const tagForIntent = INTENT_TAG_MAP[intent] ?? INTENT_TAG_MAP.other;

        let tagsUpdate: string[] | undefined;
        if (autoTagEnabled) {
          const { data: currentLead } = await supabase
            .from('leads')
            .select('tags')
            .eq('id', lead.id)
            .maybeSingle();

          const existingTags: string[] = currentLead?.tags || [];
          const responseTags = Object.values(INTENT_TAG_MAP);
          const filteredTags = existingTags.filter((t: string) => !responseTags.includes(t));
          tagsUpdate = [...filteredTags, tagForIntent];
        }

        await supabase
          .from('leads')
          .update({
            reply_detected_at: now,
            reply_status: isPositive ? 'positive' : isNegative ? 'negative' : 'followup',
            // Only upgrade to a warm-prospect status when the reply is genuinely positive —
            // a negative/neutral reply must not fake a meeting or overwrite the real pipeline stage.
            ...(isPositive ? { status: 'Meeting Booked' } : {}),
            updated_at: now,
            ...(tagsUpdate !== undefined ? { tags: tagsUpdate } : {}),
          })
          .eq('id', lead.id);

        // Intelligent cadences: pause any active sequence for this lead when the reply
        // is negative/an objection, across both sequencing systems in use in this app.
        if (isNegative || classification.should_pause_sequence) {
          await supabase
            .from('email_sequences')
            .update({ status: 'paused', updated_at: now })
            .eq('lead_id', lead.id)
            .eq('status', 'active');
          await supabase
            .from('sequence_enrollments')
            .update({ status: 'paused', paused_at: now, paused_reason: `reply_intent:${intent}` })
            .eq('lead_id', lead.id)
            .eq('status', 'active');
        }

        // Create reply notification
        await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: settings.user_id,
          workspace_id: workspaceId,
          type: 'reply_detected',
          title: 'Réponse détectée',
          body: `${lead.business_name} a répondu à votre e-mail — intention détectée : ${tagForIntent}.${autoTagEnabled ? ` Tag « ${tagForIntent} » ajouté.` : ''}`,
          link: `/leads/${lead.id}`,
          is_read: false,
          created_at: now,
          updated_at: now,
        });

        // Auto-create Google Calendar event only for genuinely positive replies
        if (accessToken && isPositive) {
          try {
            const tomorrow = new Date(Date.now() + 86_400_000);
            const startDt = new Date(tomorrow);
            startDt.setHours(10, 0, 0, 0);
            const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);

            const calRes = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  summary: `RDV — ${lead.business_name}`,
                  description: `Lead a répondu à votre email de prospection.\n\nPlanifié automatiquement par Minerva.\nLead: /leads/${lead.id}`,
                  start: { dateTime: startDt.toISOString(), timeZone: 'America/Toronto' },
                  end: { dateTime: endDt.toISOString(), timeZone: 'America/Toronto' },
                }),
              },
            );
            if (calRes.ok) {
              const calData = await calRes.json();
              await supabase.from('notifications').insert({
                id: crypto.randomUUID(),
                user_id: settings.user_id,
                workspace_id: lead.workspace_id || settings.workspace_id,
                type: 'calendar_event_created',
                title: '📅 RDV créé automatiquement',
                body: `RDV avec ${lead.business_name} ajouté dans Google Calendar pour demain 10h.`,
                link: calData.htmlLink || `/leads/${lead.id}`,
                is_read: false,
                created_at: now,
                updated_at: now,
              });
            }
          } catch {
            // Calendar event creation is best-effort — never block
          }
        }

        totalReplies++;
      } catch {
        // Silently skip threads that fail (rate limits, deleted threads, etc.)
      }
    }
  }

  return NextResponse.json({ ok: true, repliesDetected: totalReplies });
}
