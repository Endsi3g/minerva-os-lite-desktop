import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveAccessToken } from '@/lib/google/google-auth-service';
import { createAutopilotCapChecker } from '@/lib/autopilot-guard';

function makeMimeMessage(to: string, subject: string, body: string): string {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const parts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
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

  // Find all pending steps due now, joined with sequence info
  const { data: dueSteps, error } = await supabase
    .from('email_sequence_steps')
    .select('*, email_sequences(id, user_id, lead_id, lead_email, lead_name, status)')
    .eq('status', 'pending')
    .lte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!dueSteps || dueSteps.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Collect distinct user IDs from due steps
  const userIds = [...new Set(
    dueSteps
      .map((s) => (s.email_sequences as { user_id: string } | null)?.user_id)
      .filter((id): id is string => !!id)
  )];

  // Per-user: load daily cap from settings + count already sent today
  const userQuota: Record<string, { cap: number; sentToday: number }> = {};
  for (const uid of userIds) {
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('daily_email_limit')
      .eq('user_id', uid)
      .maybeSingle();
    const cap: number = (settingsRow as { daily_email_limit?: number | null } | null)?.daily_email_limit ?? 50;

    const { count: sentToday } = await supabase
      .from('email_sequence_steps')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayStart.toISOString())
      .in('sequence_id',
        (await supabase
          .from('email_sequences')
          .select('id')
          .eq('user_id', uid)
        ).data?.map((r: { id: string }) => r.id) ?? []
      );

    userQuota[uid] = { cap, sentToday: sentToday ?? 0 };
  }

  let sent = 0;
  let failed = 0;
  let skippedCap = 0;
  let skippedAutopilotCap = 0;
  const errors: Array<{ stepId: string; reason: string }> = [];
  const autopilotChecker = createAutopilotCapChecker(supabase);

  for (const step of dueSteps) {
    const seq = step.email_sequences as { id: string; user_id: string; lead_id: string | null; lead_email: string; lead_name: string; status: string } | null;
    if (!seq || seq.status !== 'active') continue;

    // Enforce daily cap (per-user)
    const quota = userQuota[seq.user_id];
    if (quota && quota.sentToday >= quota.cap) {
      skippedCap++;
      continue;
    }

    // Enforce daily cap (par programme, si Autopilot est activé sur la
    // campagne de ce lead — n'affecte aucun lead hors programme Autopilot)
    if (seq.lead_id) {
      const autopilotCheck = await autopilotChecker.checkAndReserve(seq.lead_id);
      if (!autopilotCheck.allowed) {
        skippedAutopilotCap++;
        continue;
      }
    }

    // Skip non-email steps (Call, LinkedIn, SMS) — they are manual reminders
    const channel = (step as { channel?: string }).channel;
    if (channel && channel !== 'Email') continue;

    try {
      const tokenData = await resolveAccessToken(supabase, seq.user_id);
      const accessToken = tokenData?.accessToken;
      if (!accessToken) {
        const reason = `Aucun token Google valide pour user ${seq.user_id}`;
        console.error(`[email-sequences] step ${step.id} failed: ${reason}`);
        errors.push({ stepId: step.id, reason });
        await supabase.from('email_sequence_steps').update({ status: 'failed' }).eq('id', step.id);
        failed++;
        continue;
      }

      const raw = makeMimeMessage(seq.lead_email, step.subject, step.body);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });

      if (res.ok) {
        await supabase.from('email_sequence_steps').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', step.id);
        sent++;
        if (quota) quota.sentToday++;
      } else {
        const errBody = await res.text().catch(() => '');
        const reason = `Gmail API ${res.status}: ${errBody.slice(0, 300)}`;
        console.error(`[email-sequences] step ${step.id} failed: ${reason}`);
        errors.push({ stepId: step.id, reason });
        await supabase.from('email_sequence_steps').update({ status: 'failed' }).eq('id', step.id);
        failed++;
      }
    } catch (err) {
      const reason = (err as Error).message || 'Erreur inconnue';
      console.error(`[email-sequences] step ${step.id} threw:`, err);
      errors.push({ stepId: step.id, reason });
      await supabase.from('email_sequence_steps').update({ status: 'failed' }).eq('id', step.id);
      failed++;
    }
  }

  // Mark sequences as completed if all steps are sent
  const seqIds = [...new Set(dueSteps.map((s) => (s.email_sequences as { id: string } | null)?.id).filter(Boolean))];
  for (const seqId of seqIds) {
    if (!seqId) continue;
    const { data: remaining } = await supabase
      .from('email_sequence_steps')
      .select('id')
      .eq('sequence_id', seqId)
      .eq('status', 'pending');
    if (!remaining || remaining.length === 0) {
      await supabase.from('email_sequences').update({ status: 'completed' }).eq('id', seqId);
    }
  }

  if (failed > 0) {
    console.error(`[email-sequences] ${failed} step(s) échouée(s) sur ${dueSteps.length} dues.`);
  }

  return NextResponse.json({ ok: true, sent, failed, skippedCap, skippedAutopilotCap, errors });
}
