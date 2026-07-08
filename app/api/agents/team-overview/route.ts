import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AGENT_TEAMS, getTeamForActionType } from '@/lib/agent-domains';

export const dynamic = 'force-dynamic';

// Phase 4 des Programmes de croissance — agrège agent_actions des 7 derniers
// jours par "équipe" (Growth / Outreach & Inbox / Terrain) : combien
// d'actions, combien exécutées, combien de leads distincts touchés, et
// combien de programmes de croissance distincts touchés (via
// growth_program_leads) — pour répondre à "qui a fait quoi, dans quel
// programme, avec quel niveau d'autonomie, et quel impact".
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 });

  const { data: settingsRow } = await supabase
    .from('settings')
    .select('agent_autonomy')
    .eq('user_id', user.id)
    .maybeSingle();
  const autonomy: Record<string, string> = settingsRow?.agent_autonomy ?? {};

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: actions } = await supabase
    .from('agent_actions')
    .select('action_type, lead_id, executed, suggested, assigned_to')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since);

  const rows = actions ?? [];

  // lead_id → programme(s) — via growth_program_leads (appartenance multi-programme)
  const leadIds = Array.from(new Set(rows.map((r) => r.lead_id).filter(Boolean)));
  const leadToPrograms = new Map<string, Set<string>>();
  if (leadIds.length > 0) {
    const { data: programLinks } = await supabase
      .from('growth_program_leads')
      .select('lead_id, campaign_id')
      .in('lead_id', leadIds);
    for (const link of programLinks ?? []) {
      const set = leadToPrograms.get(link.lead_id) ?? new Set<string>();
      set.add(link.campaign_id);
      leadToPrograms.set(link.lead_id, set);
    }
  }

  const teams = AGENT_TEAMS.map((team) => {
    const teamRows = rows.filter((r) => getTeamForActionType(r.action_type) === team.id);
    const distinctLeads = new Set(teamRows.map((r) => r.lead_id).filter(Boolean));
    const distinctPrograms = new Set<string>();
    for (const leadId of distinctLeads) {
      for (const campaignId of leadToPrograms.get(leadId) ?? []) distinctPrograms.add(campaignId);
    }
    const autonomyLevels = Object.fromEntries(
      team.autonomyKeys.map((key) => [key, autonomy[key] ?? 'suggest'])
    );

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      color: team.color,
      actionsCount: teamRows.length,
      executedCount: teamRows.filter((r) => r.executed).length,
      suggestedCount: teamRows.filter((r) => r.suggested && !r.executed).length,
      leadsTouched: distinctLeads.size,
      programsTouched: distinctPrograms.size,
      autonomyLevels,
    };
  });

  return NextResponse.json({ teams, sinceDays: 7 });
}
