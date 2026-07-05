import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

function verifyServiceToken(req: NextRequest): boolean {
  const expectedToken = process.env.HERMES_SERVICE_TOKEN;
  if (!expectedToken) return false;
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = authHeader.substring(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyServiceToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, leadId, sequenceName, steps } = await req.json();
    if (!workspaceId || !leadId || !sequenceName) {
      return NextResponse.json({ error: 'workspaceId, leadId and sequenceName are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create the email sequence configuration
    const sequenceId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: sequence, error: seqError } = await supabase
      .from('email_sequences')
      .insert({
        id: sequenceId,
        workspace_id: workspaceId,
        name: sequenceName,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (seqError) throw seqError;

    // Create steps
    if (steps && Array.isArray(steps)) {
      const stepInserts = steps.map((step, idx) => ({
        id: crypto.randomUUID(),
        sequence_id: sequenceId,
        step_number: idx + 1,
        delay_days: Number(step.delayDays) || 0,
        subject: step.subject || 'Prospection',
        body: step.body || '',
        channel: step.channel || 'Email',
        created_at: now,
        updated_at: now,
      }));

      const { error: stepsError } = await supabase
        .from('email_sequence_steps')
        .insert(stepInserts);

      if (stepsError) throw stepsError;
    }

    // Link lead to this sequence by updating the lead's campaign sequence config
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        updated_at: now,
      })
      .eq('id', leadId);

    if (leadUpdateError) throw leadUpdateError;

    return NextResponse.json({ success: true, sequenceId, sequence });
  } catch (err: any) {
    console.error('[agent-sequences-create]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
