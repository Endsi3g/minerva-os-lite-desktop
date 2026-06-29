import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: return pending approval items — agent_actions (suggested, not executed) + agent-drafted emails
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const [{ data: agentActions }, { data: drafts }] = await Promise.all([
    supabase
      .from('agent_actions')
      .select('id, action_type, lead_id, reasoning, data_signals, result, autonomy_level, outreach_type, created_at, leads(id, name, company)')
      .eq('workspace_id', workspaceId)
      .eq('executed', false)
      .is('approved', null)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('drafts')
      .select('id, lead_id, subject, body, intent_type, source, created_at, leads(id, name, company)')
      .eq('workspace_id', workspaceId)
      .eq('source', 'agent')
      .is('approved', null)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return NextResponse.json({
    agent_actions: agentActions ?? [],
    drafts: drafts ?? [],
    total: (agentActions?.length ?? 0) + (drafts?.length ?? 0),
  });
}

// PATCH: approve or reject an item
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, type, decision } = await req.json();
  // type: 'agent_action' | 'draft'
  // decision: 'approve' | 'reject'
  if (!id || !type || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'id, type, decision required' }, { status: 400 });
  }

  const approved = decision === 'approve';

  if (type === 'draft') {
    const { error } = await supabase
      .from('drafts')
      .update({ approved, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('agent_actions')
      .update({ approved })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, approved });
}
