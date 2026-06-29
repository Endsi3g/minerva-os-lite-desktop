import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: list enrollments for a workspace (with lead info + sequence name)
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  const status = req.nextUrl.searchParams.get('status'); // 'active'|'paused'|'completed'
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  let query = supabase
    .from('sequence_enrollments')
    .select(`
      id, lead_id, sequence_id, status, enrolled_at, enrolled_by,
      current_step, next_send_at, paused_at, paused_reason,
      total_opens, total_replies, last_sent_at,
      leads(id, name, company, status, score),
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

// POST: pause or resume an enrollment
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

  const { error } = await supabase
    .from('sequence_enrollments')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action });
}
