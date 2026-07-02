import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logLeadEvent } from '@/lib/timeline-logger';

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
      .select('id, action_type, lead_id, reasoning, data_signals, result, autonomy_level, outreach_type, created_at, leads(id, business_name, niche)')
      .eq('workspace_id', workspaceId)
      .eq('executed', false)
      .is('approved', null)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('drafts')
      .select('id, lead_id, subject, body, intent_type, source, created_at, leads(id, business_name, niche)')
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

// PATCH: approve or reject an item — and log to timeline
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, type, decision, workspace_id } = await req.json();
  if (!id || !type || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'id, type, decision required' }, { status: 400 });
  }

  const approved = decision === 'approve';

  if (type === 'draft') {
    const { data: draft, error } = await supabase
      .from('drafts')
      .update({ approved, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select('lead_id, subject, workspace_id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (draft?.lead_id) {
      logLeadEvent({
        lead_id: draft.lead_id,
        workspace_id: draft.workspace_id ?? workspace_id ?? '',
        user_id: user.id,
        event_type: approved ? 'email_draft_approved' : 'email_draft_rejected',
        title: approved
          ? `Brouillon approuvé : ${draft.subject || 'email'}`
          : `Brouillon rejeté : ${draft.subject || 'email'}`,
        metadata: { draft_id: id, decision },
      });
    }
  } else {
    const { data: action, error } = await supabase
      .from('agent_actions')
      .update({ approved })
      .eq('id', id)
      .select('lead_id, action_type, workspace_id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (action?.lead_id) {
      logLeadEvent({
        lead_id: action.lead_id,
        workspace_id: action.workspace_id ?? workspace_id ?? '',
        user_id: user.id,
        event_type: approved ? 'agent_action_approved' : 'agent_action_rejected',
        title: approved
          ? `Action agent approuvée : ${action.action_type}`
          : `Action agent rejetée : ${action.action_type}`,
        metadata: { action_id: id, action_type: action.action_type, decision },
      });
    }
  }

  return NextResponse.json({ ok: true, approved });
}
