import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logLeadEvent } from '@/lib/timeline-logger';

// GET: list enrollments for a workspace (with lead info + sequence name)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  const status = req.nextUrl.searchParams.get('status');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  let query = supabase
    .from('sequence_enrollments')
    .select(`
      id, lead_id, sequence_id, status, enrolled_at, enrolled_by,
      current_step, next_send_at, paused_at, paused_reason,
      total_opens, total_replies, last_sent_at,
      leads(id, business_name, niche, status, score),
      sequence_templates(id, name, steps)
    `)
    .eq('workspace_id', workspaceId)
    .order('enrolled_at', { ascending: false })
    .limit(50);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrollments: data });
}

// POST: pause or resume an enrollment — and log to timeline
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, action, reason } = await req.json();
  if (!id || !['pause', 'resume'].includes(action)) {
    return NextResponse.json({ error: 'id and action (pause|resume) required' }, { status: 400 });
  }

  const updates =
    action === 'pause'
      ? { status: 'paused', paused_at: new Date().toISOString(), paused_reason: reason ?? null }
      : { status: 'active', paused_at: null, paused_reason: null };

  const { data: enrollment, error } = await supabase
    .from('sequence_enrollments')
    .update(updates)
    .eq('id', id)
    .select('lead_id, workspace_id, sequence_templates(name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (enrollment?.lead_id) {
    const seqName = (enrollment.sequence_templates as any)?.name ?? 'Séquence';
    logLeadEvent({
      lead_id: enrollment.lead_id,
      workspace_id: enrollment.workspace_id ?? '',
      user_id: user.id,
      event_type: action === 'pause' ? 'sequence_paused' : 'sequence_resumed',
      title: action === 'pause'
        ? `Séquence mise en pause : ${seqName}`
        : `Séquence reprise : ${seqName}`,
      body: reason ?? undefined,
      metadata: { enrollment_id: id, sequence_name: seqName, action },
    });
  }

  return NextResponse.json({ ok: true, action });
}
