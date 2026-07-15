import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAccessToken } from '@/lib/google/google-auth-service';

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

async function sendGmailStep(accessToken: string, to: string, subject: string, body: string) {
  const raw = makeMimeMessage(to, subject, body);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || 'Gmail send failed');
  }
}

// GET /api/email-sequences?leadId=xxx  — list sequences (with steps) for current user
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get('leadId');

  let query = supabase
    .from('email_sequences')
    .select('*, email_sequence_steps(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (leadId) query = query.eq('lead_id', leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/email-sequences — create a new sequence
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId, leadName, leadEmail, sequenceName, steps, workspaceId, sendFirstNow } = await req.json() as {
    leadId: string;
    leadName: string;
    leadEmail: string;
    sequenceName: string;
    workspaceId?: string;
    sendFirstNow?: boolean;
    steps: { stepNumber: number; delayDays: number; subject: string; body: string }[];
  };

  if (!leadEmail) return NextResponse.json({ error: 'Email du lead manquant' }, { status: 400 });
  if (!steps || steps.length === 0) return NextResponse.json({ error: 'Aucune étape définie' }, { status: 400 });

  // Create sequence
  const { data: seq, error: seqErr } = await supabase
    .from('email_sequences')
    .insert({
      user_id: user.id,
      workspace_id: workspaceId || null,
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      name: sequenceName || `Séquence — ${leadName}`,
      status: 'active',
    })
    .select()
    .single();

  if (seqErr) return NextResponse.json({ error: seqErr.message }, { status: 500 });

  const now = new Date();
  const stepRows = steps.map((s) => {
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + s.delayDays);
    return {
      sequence_id: seq.id,
      step_number: s.stepNumber,
      delay_days: s.delayDays,
      subject: s.subject,
      body: s.body,
      status: 'pending',
      scheduled_at: scheduledAt.toISOString(),
    };
  });

  const { error: stepsErr } = await supabase.from('email_sequence_steps').insert(stepRows);
  if (stepsErr) return NextResponse.json({ error: stepsErr.message }, { status: 500 });

  // Optionally send step 1 immediately
  if (sendFirstNow) {
    try {
      const tokenData = await resolveAccessToken(supabase, user.id);
      const step1 = steps.find((s) => s.stepNumber === 1);
      if (step1 && tokenData) {
        await sendGmailStep(tokenData.accessToken, leadEmail, step1.subject, step1.body);
        await supabase
          .from('email_sequence_steps')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('sequence_id', seq.id)
          .eq('step_number', 1);
      }
    } catch {
      // Non-fatal: sequence created, first email failed
    }
  }

  return NextResponse.json({ ok: true, sequenceId: seq.id });
}

// PATCH /api/email-sequences — update sequence status
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sequenceId, status } = await req.json() as { sequenceId: string; status: string };

  const { error } = await supabase
    .from('email_sequences')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', sequenceId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/email-sequences?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Steps cascade via FK
  const { error } = await supabase.from('email_sequences').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
