import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  listLeadsToFollowUp,
  summarizePipeline,
  dispatchTool,
  canExecute,
  shouldSuggest,
  TOOL_DESCRIPTIONS,
  type AgentContext,
  type AgentAction,
} from '@/lib/agent-tools';
import { generateCompletion } from '@/lib/ai';

function cronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const authHeader = req.headers.get('authorization');
  return !!(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);
}

const AGENT_SYSTEM = `Tu es l'Agent Minerva, un assistant commercial intelligent et autonome qui tourne une fois par jour sans supervision humaine.
Tu analyses le pipeline de vente d'un commercial et tu décides des meilleures actions à prendre.
Tu raisonnes à partir des données réelles : scores, dates de contact, étapes pipeline, notes terrain, recommandations NBA.
Tu es concis, pragmatique, et tu justifies chaque action par des signaux concrets.

${TOOL_DESCRIPTIONS}

Limite à 8 actions maximum par cycle. Priorise les leads à score élevé, les plus dormants, et suis les recommandations NBA fournies pour chaque lead.`;

// Runs the full agent loop for one workspace — shares dispatchTool/canExecute with
// app/api/agent/loop/route.ts (the interactive route) instead of re-implementing a
// thinner switch statement, so this unattended daily run has access to all 14 tools
// and actually respects the user's configured agent_autonomy instead of forcing 'auto'.
async function runAgentForWorkspace(
  adminClient: any,
  workspaceId: string,
  userId: string,
  settings: { ai_provider?: string; ai_model?: string; openrouter_key?: string },
  autonomy: any,
) {
  const ctx: AgentContext = { workspaceId, userId, supabase: adminClient, settings, autonomy };

  // PERCEIVE
  const [coldLeads, pipelineSummary] = await Promise.all([
    listLeadsToFollowUp(ctx, { threshold_days: 5, min_score: 30 }),
    summarizePipeline(ctx),
  ]);

  const { data: memory } = await adminClient
    .from('agent_memory')
    .select('type, key, content, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (coldLeads.length === 0) return { actions_executed: 0, actions_suggested: 0 };

  const memoryContext = (memory || []).map((m: any) => `[${m.type}] ${m.key}: ${m.content}`).join('\n');
  const leadsContext = coldLeads.slice(0, 12).map((l: any) =>
    `- ${l.business_name} (score: ${l.score}, inactif: ${l.last_activity_at || 'jamais'}, statut: ${l.status}) | Recommandation NBA: ${l.nba_action} via ${l.nba_channel} (urgence ${l.nba_urgency}) — ${l.nba_reason}`
  ).join('\n');

  // PLAN (Claude)
  let actions: AgentAction[] = [];
  try {
    const planText = await generateCompletion({
      system: AGENT_SYSTEM,
      messages: [{
        role: 'user',
        content: `Leads à relancer:\n${leadsContext}\n\nPipeline:\n${JSON.stringify(pipelineSummary)}\n\nMémoire agent:\n${memoryContext || 'Aucune mémoire enregistrée.'}\n\nGénère les actions prioritaires.`,
      }],
      jsonMode: true,
      // Un modèle de raisonnement (Cloudflare Kimi K2) peut consommer une
      // bonne partie du budget en reasoning_content avant de produire le
      // JSON final — un plafond trop bas fait échouer l'appel entier.
      maxTokens: 2000,
      settings,
      userId,
    });
    const parsed = JSON.parse(planText);
    actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  } catch {
    return { actions_executed: 0, actions_suggested: 0 };
  }

  let executed = 0;
  let suggested = 0;

  for (const action of actions.slice(0, 8)) {
    const actionId = crypto.randomUUID();
    const willExecute = canExecute(action.tool, autonomy);
    const willSuggest = shouldSuggest(action.tool, autonomy);
    let result: Record<string, unknown> | null = null;
    let didExecute = false;

    if (willExecute) {
      try {
        result = await dispatchTool(action.tool, action.params, ctx);
        didExecute = !(result && typeof result === 'object' && 'error' in result && result.error);
      } catch (err: any) {
        result = { error: err?.message || 'Erreur inconnue' };
        didExecute = false;
      }
    }

    await adminClient.from('agent_actions').insert({
      id: actionId,
      workspace_id: workspaceId,
      user_id: userId,
      action_type: action.tool,
      lead_id: (action.params?.lead_id as string) ?? null,
      reasoning: action.reasoning,
      data_signals: action.data_signals,
      result: result ?? {},
      autonomy_level: (autonomy as any)[action.tool] ?? 'suggest',
      executed: didExecute,
      suggested: willSuggest || !didExecute,
      created_at: new Date().toISOString(),
    });

    if (didExecute) {
      executed++;
      await adminClient.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: workspaceId,
        type: 'agent_action',
        title: `Minerva — ${action.tool.replace(/_/g, ' ')}`,
        body: action.reasoning || 'Action exécutée automatiquement',
        link: action.params?.lead_id ? `/leads/${action.params.lead_id}` : '/weekly-report',
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      suggested++;
    }
  }

  return { actions_executed: executed, actions_suggested: suggested };
}

export async function GET(req: NextRequest) {
  if (!cronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get all workspaces with agent enabled
  const { data: activeSettings } = await adminClient
    .from('settings')
    .select('user_id, active_workspace_id, ai_provider, ai_model, openrouter_key, agent_enabled, agent_autonomy')
    .eq('agent_enabled', true)
    .not('active_workspace_id', 'is', null);

  if (!activeSettings || activeSettings.length === 0) {
    return NextResponse.json({ ok: true, workspaces_processed: 0 });
  }

  let totalExecuted = 0;
  let totalSuggested = 0;
  let workspacesRun = 0;

  for (const s of activeSettings) {
    if (!s.active_workspace_id || !s.user_id) continue;
    try {
      const { actions_executed, actions_suggested } = await runAgentForWorkspace(
        adminClient,
        s.active_workspace_id,
        s.user_id,
        { ai_provider: s.ai_provider, ai_model: s.ai_model, openrouter_key: s.openrouter_key },
        s.agent_autonomy ?? {},
      );
      totalExecuted += actions_executed;
      totalSuggested += actions_suggested;
      workspacesRun++;
    } catch {
      // Continue with next workspace on error
    }
  }

  return NextResponse.json({
    ok: true,
    workspaces_processed: workspacesRun,
    total_executed: totalExecuted,
    total_suggested: totalSuggested,
  });
}
