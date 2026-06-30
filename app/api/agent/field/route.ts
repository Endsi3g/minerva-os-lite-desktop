import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updatePipelineStage, type AgentContext } from '@/lib/agent-tools';

type VisitOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';
type InterestLevel = 'Hot' | 'Warm' | 'Cold' | null;

function mapOutcomeToStage(
  outcome: VisitOutcome,
  interestLevel: InterestLevel,
  currentStage: string | null,
): string | null {
  switch (outcome) {
    case 'meeting_booked':
      return 'Meeting Booked';
    case 'not_interested':
      return 'Lost';
    case 'visited': {
      // Only upgrade if currently at or below "Contacted"
      const low = ['New', 'Contacted'];
      if (!currentStage || low.includes(currentStage)) {
        return interestLevel === 'Hot' ? 'Proposal Sent' : 'Contacted';
      }
      return null; // already further along, don't downgrade
    }
    case 'absent':
    default:
      return null; // no pipeline change for absent
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { lead_id, outcome, interest_level, workspace_id } = body as {
    lead_id: string;
    outcome: VisitOutcome;
    interest_level: InterestLevel;
    workspace_id: string;
  };

  if (!lead_id || !outcome || !workspace_id) {
    return NextResponse.json({ error: 'lead_id, outcome et workspace_id requis' }, { status: 400 });
  }

  // Fetch current stage
  const { data: lead } = await supabase
    .from('leads')
    .select('pipeline_stage, business_name')
    .eq('id', lead_id)
    .eq('workspace_id', workspace_id)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });

  const targetStage = mapOutcomeToStage(outcome, interest_level, lead.pipeline_stage);
  if (!targetStage) {
    return NextResponse.json({ updated: false, reason: 'Aucun changement nécessaire' });
  }

  const ctx: AgentContext = {
    workspaceId: workspace_id,
    userId: user.id,
    supabase,
    settings: {},
  };

  await updatePipelineStage(ctx, {
    lead_id,
    stage: targetStage,
    reason: `Terrain — ${outcome}${interest_level ? ` (${interest_level})` : ''}`,
  });

  return NextResponse.json({
    updated: true,
    new_stage: targetStage,
    lead_name: lead.business_name,
    message: `Pipeline mis à jour → ${targetStage}`,
  });
}
