import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('settings')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('user_id', userId)
    .single();

  if (!data?.google_refresh_token) return null;

  const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : new Date(0);
  if (expiresAt > new Date(Date.now() + 60_000)) return data.google_access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const refreshData = await res.json();

  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in - 60) * 1000).toISOString();
  await supabase.from('settings').update({
    google_access_token: refreshData.access_token,
    google_token_expires_at: newExpiresAt,
  }).eq('user_id', userId);

  return refreshData.access_token;
}

function isWithinSendingWindow(
  windowStart: string,
  windowEnd: string,
  windowDays: string,
): boolean {
  const now = new Date();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayName = dayNames[now.getDay()];

  const allowedDays = windowDays.split(',').map((d) => d.trim().toLowerCase());
  if (!allowedDays.includes(todayName)) return false;

  const [startH, startM] = windowStart.split(':').map(Number);
  const [endH, endM] = windowEnd.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function advanceEnrollment(supabase: any, enrollmentId: string, sentAt: Date) {
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

  let nextIdx = enrollment.current_step + 1;
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const { data: pendingRows } = await supabase
    .from('email_queue')
    .select('workspace_id')
    .eq('status', 'pending')
    .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
    .limit(200);

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, failed: 0 });
  }

  const workspaceIds = [...new Set(pendingRows.map((r) => r.workspace_id as string))];

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

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

    const quota: number = (ownerSettings as { outreach_daily_quota?: number | null } | null)?.outreach_daily_quota ?? 50;
    const windowStart: string = (ownerSettings as { outreach_window_start?: string | null } | null)?.outreach_window_start ?? '09:00';
    const windowEnd: string = (ownerSettings as { outreach_window_end?: string | null } | null)?.outreach_window_end ?? '18:00';
    const windowDays: string = (ownerSettings as { outreach_window_days?: string | null } | null)?.outreach_window_days ?? 'mon,tue,wed,thu,fri';

    if (!isWithinSendingWindow(windowStart, windowEnd, windowDays)) {
      totalSkipped++;
      continue;
    }

    const { count: sentToday } = await supabase
      .from('email_queue')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'sent')
      .gte('sent_at', todayStart.toISOString());

    if ((sentToday ?? 0) >= quota) {
      totalSkipped++;
      continue;
    }

    const { data: item } = await supabase
      .from('email_queue')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
      .order('scheduled_at', { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();

    if (!item) continue;

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

    const accessToken = await getValidAccessToken(supabase, workspace.owner_id);
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

  return NextResponse.json({ ok: true, sent: totalSent, skipped: totalSkipped, failed: totalFailed });
}
