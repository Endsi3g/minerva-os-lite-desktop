import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveAccessToken } from '@/lib/google/google-auth-service';
import { isWithinSendingWindow, getRemainingQuota } from '@/lib/outreach-quota';
import { createAutopilotCapChecker } from '@/lib/autopilot-guard';

function makeMimeMessage(to: string, subject: string, body: string, isHtml = true): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const contentType = isHtml ? 'text/html; charset="UTF-8"' : 'text/plain; charset="UTF-8"';
  const parts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ];
  return Buffer.from(parts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function advanceEnrollment(supabase: any, enrollmentId: string, sentAt: Date, fromStepIndex?: number) {
  const { data: enrollment } = await supabase
    .from('sequence_enrollments')
    .select('*, sequence_templates(steps, workspace_id), leads(contact_email, business_name, contact_name)')
    .eq('id', enrollmentId)
    .maybeSingle();

  if (!enrollment || enrollment.status !== 'active') return;

  type Step = {
    id: string;
    type: 'email' | 'delay' | 'task' | 'condition';
    subject?: string;
    bodyHtml?: string;
    delayDays?: number;
  };
  const steps: Step[] = enrollment.sequence_templates?.steps ?? [];

  let nextIdx = fromStepIndex ?? (enrollment.current_step + 1);
  let accumulatedDays = 0;

  while (nextIdx < steps.length) {
    const step = steps[nextIdx];
    if (step.type === 'delay') {
      accumulatedDays += step.delayDays ?? 1;
      nextIdx++;
    } else if (step.type === 'email') {
      const scheduledAt = new Date(sentAt);
      scheduledAt.setDate(scheduledAt.getDate() + accumulatedDays);
      scheduledAt.setHours(9, 30, 0, 0);

      const toEmail: string = enrollment.leads?.contact_email ?? '';
      const toName: string =
        enrollment.leads?.contact_name || enrollment.leads?.business_name || '';

      await supabase.from('email_queue').insert({
        workspace_id: enrollment.workspace_id,
        lead_id: enrollment.lead_id,
        enrollment_id: enrollmentId,
        to_email: toEmail,
        to_name: toName,
        subject: step.subject ?? '',
        body_html: step.bodyHtml ?? '',
        status: 'pending',
        scheduled_at: scheduledAt.toISOString(),
      });

      await supabase
        .from('sequence_enrollments')
        .update({
          current_step: nextIdx,
          next_action_at: scheduledAt.toISOString(),
        })
        .eq('id', enrollmentId);
      return;
    } else {
      nextIdx++;
    }
  }

  await supabase
    .from('sequence_enrollments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      current_step: steps.length,
    })
    .eq('id', enrollmentId);
}

// Bulk-enrolling leads into a sequence (composer-queue-cadence-root.tsx's handleEnroll)
// only ever inserts the sequence_enrollments row — it never seeds the first email_queue
// row, so a freshly-enrolled lead (current_step=0, next_action_at never set) would
// otherwise sit forever. advanceEnrollment normally starts at current_step + 1, which
// would skip step 0 entirely for a fresh enrollment, so this passes fromStepIndex=0
// explicitly instead of relying on the default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedUnstartedEnrollments(supabase: any): Promise<number> {
  const { data: unseeded } = await supabase
    .from('sequence_enrollments')
    .select('id')
    .eq('status', 'active')
    .eq('current_step', 0)
    .is('next_action_at', null)
    .limit(200);

  for (const enr of unseeded ?? []) {
    await advanceEnrollment(supabase, enr.id, new Date(), 0);
  }
  return unseeded?.length ?? 0;
}

const MAX_SENDS_PER_WORKSPACE_PER_TICK = 10;

// Exported so both the recurring cron (GET below) and the manual
// "process now" route (app/api/outreach/queue/process-now) share one implementation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processQueue(supabase: any, workspaceIdFilter?: string): Promise<{ sent: number; skipped: number; failed: number; seeded: number }> {
  const seeded = await seedUnstartedEnrollments(supabase);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const pendingQuery = supabase
    .from('email_queue')
    .select('workspace_id')
    .eq('status', 'pending')
    .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
    .limit(500);
  const { data: pendingRows } = workspaceIdFilter
    ? await pendingQuery.eq('workspace_id', workspaceIdFilter)
    : await pendingQuery;

  if (!pendingRows || pendingRows.length === 0) {
    return { sent: 0, skipped: 0, failed: 0, seeded };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceIds: string[] = [...new Set<string>(pendingRows.map((r: any) => r.workspace_id as string))];

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const autopilotChecker = createAutopilotCapChecker(supabase);

  for (const workspaceId of workspaceIds) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (!workspace?.owner_id) { totalSkipped++; continue; }

    const { data: ownerSettings } = await supabase
      .from('settings')
      .select('outreach_daily_quota, outreach_window_start, outreach_window_end, outreach_window_days')
      .eq('user_id', workspace.owner_id)
      .maybeSingle();

    const settings = ownerSettings ?? {};
    const windowStart: string = settings.outreach_window_start ?? '09:00';
    const windowEnd: string = settings.outreach_window_end ?? '18:00';
    const windowDays: string = settings.outreach_window_days ?? 'mon,tue,wed,thu,fri';

    if (!isWithinSendingWindow(windowStart, windowEnd, windowDays)) {
      totalSkipped++;
      continue;
    }

    for (let tick = 0; tick < MAX_SENDS_PER_WORKSPACE_PER_TICK; tick++) {
      const { remaining } = await getRemainingQuota(supabase, workspaceId, settings);
      if (remaining <= 0) { totalSkipped++; break; }

      const { data: item } = await supabase
        .from('email_queue')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
        .order('scheduled_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .maybeSingle();

      if (!item) break;

      // Plafond Autopilot par programme (n'affecte que les leads d'une
      // campagne avec Autopilot activé — voir lib/autopilot-guard.ts).
      // `break` et non `continue` : cet item reste 'pending' et serait
      // re-sélectionné en boucle sinon (c'est toujours "le plus ancien
      // pending"), consommant tout le budget de ticks sans avancer.
      if (item.lead_id) {
        const autopilotCheck = await autopilotChecker.checkAndReserve(item.lead_id);
        if (!autopilotCheck.allowed) {
          totalSkipped++;
          break;
        }
      }

      // A paused/stopped enrollment must block an already-queued send too — pausing the
      // enrollment alone doesn't retroactively cancel steps already sitting in email_queue.
      if (item.enrollment_id) {
        const { data: enrollment } = await supabase
          .from('sequence_enrollments')
          .select('status')
          .eq('id', item.enrollment_id)
          .maybeSingle();
        if (enrollment && enrollment.status !== 'active') {
          await supabase.from('email_queue').update({
            status: 'cancelled',
            error_message: `Séquence en pause (enrollment ${enrollment.status})`,
            updated_at: now.toISOString(),
          }).eq('id', item.id);
          totalSkipped++;
          continue;
        }
      }

      await supabase.from('email_queue').update({ status: 'sending', updated_at: now.toISOString() }).eq('id', item.id);

      const tokenData = await resolveAccessToken(supabase, workspace.owner_id);
      const accessToken = tokenData?.accessToken;
      if (!accessToken) {
        await supabase.from('email_queue').update({
          status: 'failed',
          error_message: 'Aucun token Google valide — reconnectez Gmail dans les paramètres',
          updated_at: now.toISOString(),
        }).eq('id', item.id);
        totalFailed++;
        continue;
      }

      const body = item.body_html || item.body_text || '';
      const isHtml = !!item.body_html;
      const raw = makeMimeMessage(item.to_email, item.subject, body, isHtml);

      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });

      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        await supabase.from('email_queue').update({
          status: 'sent',
          sent_at: now.toISOString(),
          gmail_message_id: gmailData.id,
          gmail_thread_id: gmailData.threadId,
          updated_at: now.toISOString(),
        }).eq('id', item.id);
        totalSent++;

        // Without this, a lead emailed via the queue is never thread-linked, so it never
        // gets reply-detection (cron/gmail-check-replies keys off leads.gmail_thread_id)
        // and never shows in the Inbox "Réponses leads" tab.
        if (item.lead_id) {
          await supabase.from('leads').update({
            gmail_thread_id: gmailData.threadId,
            updated_at: now.toISOString(),
          }).eq('id', item.lead_id);
        }

        if (item.enrollment_id) {
          await advanceEnrollment(supabase, item.enrollment_id, now);
        }
      } else {
        const errData = await gmailRes.json().catch(() => ({})) as { error?: { message?: string } };
        await supabase.from('email_queue').update({
          status: 'failed',
          error_message: errData?.error?.message ?? `Gmail API ${gmailRes.status}`,
          updated_at: now.toISOString(),
        }).eq('id', item.id);
        totalFailed++;
      }
    }
  }

  return { sent: totalSent, skipped: totalSkipped, failed: totalFailed, seeded };
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = await processQueue(supabase);
  return NextResponse.json({ ok: true, ...result });
}
