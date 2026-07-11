// GET /api/insights/weekly/activity?workspaceId=...
// Returns the actual action-by-action log for the current week (Monday → now),
// used by the dedicated /weekly-report page to show a complete breakdown
// instead of just aggregate metrics.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TOOL_LABELS: Record<string, string> = {
  create_task: 'Tâche créée',
  update_pipeline_stage: 'Étape pipeline mise à jour',
  generate_email_draft: 'Brouillon e-mail généré',
  enroll_in_sequence: 'Inscrit en séquence',
  update_agent_memory: 'Apprentissage mémorisé',
  summarize_pipeline: 'Pipeline résumé',
  pause_sequence: 'Séquence mise en pause',
  resume_sequence: 'Séquence reprise',
  tag_lead: 'Lead tagué',
  classify_reply: 'Réponse classifiée',
  summarize_inbox: 'Boîte de réception résumée',
  suggest_follow_up: 'Relance suggérée',
  send_email: 'E-mail envoyé',
  trigger_enrichment: 'Enrichissement lancé',
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday of this week
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  const { data: actions } = await supabase
    .from('agent_actions')
    .select('id, action_type, lead_id, reasoning, data_signals, executed, suggested, approved, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', weekStartIso)
    .order('created_at', { ascending: false })
    .limit(200);

  const leadIds = Array.from(new Set((actions ?? []).map((a) => a.lead_id).filter(Boolean))) as string[];
  const leadNames: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, business_name')
      .in('id', leadIds);
    for (const l of leads ?? []) leadNames[l.id] = l.business_name;
  }

  const activity = (actions ?? []).map((a) => ({
    id: a.id,
    tool: a.action_type,
    label: TOOL_LABELS[a.action_type] ?? a.action_type,
    leadId: a.lead_id,
    leadName: a.lead_id ? leadNames[a.lead_id] ?? null : null,
    reasoning: a.reasoning,
    dataSignals: a.data_signals,
    executed: a.executed,
    suggested: a.suggested,
    approved: a.approved,
    createdAt: a.created_at,
  }));

  const [
    { count: draftsGenerated },
    { count: emailsSent },
    { count: bookingsThisWeek },
    { count: positiveRepliesThisWeek },
  ] = await Promise.all([
    supabase.from('drafts').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).gte('created_at', weekStartIso),
    supabase.from('notes').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('type', 'email').gte('created_at', weekStartIso),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('status', 'Meeting Booked').gte('updated_at', weekStartIso),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('reply_status', 'positive').gte('updated_at', weekStartIso),
  ]);

  return NextResponse.json({
    weekStart: weekStartIso,
    activity,
    totals: {
      actionsTotal: activity.length,
      actionsExecuted: activity.filter((a) => a.executed).length,
      draftsGenerated: draftsGenerated ?? 0,
      emailsSent: emailsSent ?? 0,
      bookingsThisWeek: bookingsThisWeek ?? 0,
      positiveRepliesThisWeek: positiveRepliesThisWeek ?? 0,
    },
  });
}
