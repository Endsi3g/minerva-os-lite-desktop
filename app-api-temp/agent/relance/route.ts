import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  listLeadsToFollowUp,
  generateEmailDraft,
  type AgentContext,
} from '@/lib/agent-tools';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let workspaceId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    workspaceId = body.workspace_id;
  } catch { /* ignore */ }

  if (!workspaceId) {
    const { data: settings } = await supabase
      .from('settings')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();
    workspaceId = settings?.workspace_id;
  }

  if (!workspaceId) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();
    workspaceId = ws?.id;
  }

  if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const { data: dbSettings } = await supabase
    .from('settings')
    .select('ai_provider, ai_model, openrouter_key')
    .eq('user_id', user.id)
    .maybeSingle();

  const ctx: AgentContext = {
    workspaceId,
    userId: user.id,
    supabase,
    settings: {
      ai_provider: dbSettings?.ai_provider,
      ai_model: dbSettings?.ai_model,
      openrouter_key: dbSettings?.openrouter_key,
    },
  };

  // List top cold leads (7 day threshold, score >= 30, max 3)
  const coldLeads = await listLeadsToFollowUp(ctx, { threshold_days: 7, min_score: 30 });
  const targets = coldLeads.slice(0, 3) as Array<{ id: string; name: string; company: string; score: number }>;

  if (targets.length === 0) {
    return NextResponse.json({ drafted: 0, leads: [], message: 'Aucun lead froid à relancer.' });
  }

  const drafted: Array<{ lead_id: string; lead_name: string; company: string; draft_id: string; subject: string }> = [];

  for (const lead of targets) {
    try {
      const result = await generateEmailDraft(ctx, { lead_id: lead.id, template_type: 'follow_up' });
      drafted.push({
        lead_id: lead.id,
        lead_name: lead.name,
        company: lead.company,
        draft_id: result.draft_id as string,
        subject: result.subject as string,
      });
    } catch { /* skip failed leads silently */ }
  }

  return NextResponse.json({
    drafted: drafted.length,
    leads: drafted,
    message: `${drafted.length} brouillon${drafted.length > 1 ? 's' : ''} créé${drafted.length > 1 ? 's' : ''} — en attente d'approbation.`,
  });
}
