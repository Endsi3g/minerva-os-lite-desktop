import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateCompletion } from '@/lib/ai';
import { reportAppError } from '@/lib/error-notifications';
import { sendPushToUser } from '@/lib/push-service';
import {
  listLeadsToFollowUp,
  summarizePipeline,
  dispatchTool,
  canExecute,
  shouldSuggest,
  TOOL_DESCRIPTIONS,
  type AgentContext,
  type AgentAction,
  type AgentActionResult,
} from '@/lib/agent-tools';

const AGENT_SYSTEM = `Tu es l'Agent Minerva, un assistant commercial intelligent et autonome.
Tu analyses le pipeline de vente d'un commercial et tu décides des meilleures actions à prendre.
Tu raisonnes à partir des données réelles : scores, dates de contact, étapes pipeline, notes terrain.
Tu es concis, pragmatique, et tu justifies chaque action par des signaux concrets.

${TOOL_DESCRIPTIONS}

Limite à 10 actions maximum par cycle. Priorise les leads à score élevé et les plus dormants.`;

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

  // Fetch settings (AI provider + autonomy)
  const { data: dbSettings } = await supabase
    .from('settings')
    .select('ai_provider, ai_model, openrouter_key, agent_autonomy')
    .eq('user_id', user.id)
    .maybeSingle();

  const aiSettings = {
    ai_provider: dbSettings?.ai_provider || 'gemini',
    ai_model: dbSettings?.ai_model || 'gemini-3.7-flash',
    openrouter_key: dbSettings?.openrouter_key,
  };
  const autonomy = dbSettings?.agent_autonomy ?? {};

  const ctx: AgentContext = {
    workspaceId,
    userId: user.id,
    supabase,
    settings: aiSettings,
    autonomy,
  };

  // ── 1. Perceive ──────────────────────────────────────────────────────────────
  const [leadsToFollowUp, pipelineSummary] = await Promise.all([
    listLeadsToFollowUp(ctx, { threshold_days: 7, min_score: 30 }),
    summarizePipeline(ctx),
  ]);

  const { data: recentMemory } = await supabase
    .from('agent_memory')
    .select('type, key, content, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(10);

  const contextBlock = `
Pipeline actuel:
${JSON.stringify(pipelineSummary, null, 2)}

Leads prioritaires à relancer (${leadsToFollowUp.length}):
${leadsToFollowUp.slice(0, 5).map((l: any) => `- ${l.business_name} (${l.niche}) | Score: ${l.score} | Statut: ${l.status} | Dernier contact: ${l.last_activity_at || 'jamais'} | Recommandation NBA: ${l.nba_action} via ${l.nba_channel} (urgence ${l.nba_urgency}) — ${l.nba_reason}`).join('\n')}

Mémoire agent (apprentissages récents):
${recentMemory?.map((m: any) => `[${m.type}] ${m.key}: ${m.content}`).join('\n') || 'Aucune mémoire enregistrée.'}
`;

  // ── 2. Plan (Gemini/Fast model decides what to do) ─────────────────────────
  let plan: { reasoning: string; actions: AgentAction[] };
  try {
    const raw = await generateCompletion({
      system: AGENT_SYSTEM,
      messages: [{ role: 'user', content: `Contexte du workspace:\n${contextBlock}\n\nQue dois-je faire maintenant ? Donne 3 actions prioritaires.` }],
      jsonMode: true,
      maxTokens: 1500,
      settings: aiSettings,
      userId: user.id,
      workspaceId,
    });
    plan = JSON.parse(raw);
  } catch (err: any) {
    const message = err?.message || 'Erreur inconnue lors de la planification de l\'agent';
    console.error('[agent/loop] planning failed:', message);
    await reportAppError({
      userId: user.id,
      workspaceId,
      source: 'agent/loop',
      title: 'Planification de l\'agent échouée',
      message,
    });
    return NextResponse.json({ error: `Agent planning failed: ${message}` }, { status: 500 });
  }

  // Limit to top 3 actions max to avoid serverless timeouts
  const actions: AgentAction[] = Array.isArray(plan?.actions) ? plan.actions.slice(0, 3) : [];

  // ── 3. Act + Log (Parallel / with strict 3s timeout) ───────────────────────
  const results: AgentActionResult[] = [];
  const admin = getAdminClient();

  for (const action of actions) {
    const executed = canExecute(action.tool, autonomy);
    const suggested = shouldSuggest(action.tool, autonomy);
    let result: Record<string, unknown> | null = null;

    if (executed) {
      try {
        const timeoutPromise = new Promise<{ error: string }>((resolve) =>
          setTimeout(() => resolve({ error: 'Action timeout (3s limit)' }), 3000)
        );
        result = await Promise.race([dispatchTool(action.tool, action.params, ctx), timeoutPromise]);
      } catch (err: any) {
        result = { error: err.message };
      }
    }

    const succeeded = executed && !(result && typeof result === 'object' && 'error' in result && result.error);

    if (executed && !succeeded) {
      await reportAppError({
        userId: user.id,
        workspaceId,
        source: 'agent/loop',
        title: `Action agent échouée — ${action.tool}`,
        message: (result?.error as string) || 'Action non exécutée : cause inconnue.',
        context: { tool: action.tool, params: action.params },
      });
    }

    const logEntry: AgentActionResult = {
      ...action,
      id: crypto.randomUUID(),
      result,
      executed,
      succeeded,
      created_at: new Date().toISOString(),
      autonomy_level: (autonomy as any)[(action.tool)] ?? 'suggest',
    };

    results.push(logEntry);

    await admin.from('agent_actions').insert({
      id: logEntry.id,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: action.tool,
      lead_id: (action.params?.lead_id as string) ?? null,
      reasoning: action.reasoning,
      data_signals: action.data_signals,
      result: result ?? {},
      autonomy_level: logEntry.autonomy_level,
      executed,
      suggested,
      created_at: logEntry.created_at,
    }).then(() => {}, () => {});
  }

  const succeededCount = results.filter((r) => r.succeeded).length;
  const failedCount = results.filter((r) => r.executed && !r.succeeded).length;
  if (succeededCount > 0) {
    // Notification native — jusqu'ici aucune action de l'agent IA ne déclenchait
    // de notification, malgré la souscription Realtime déjà en place côté client
    // (reach-context.tsx) sur les INSERT de la table `notifications`.
    await admin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      workspace_id: workspaceId,
      type: 'agent_action',
      title: `Agent IA — ${succeededCount} action${succeededCount > 1 ? 's' : ''} effectuée${succeededCount > 1 ? 's' : ''}`,
      body: plan.reasoning?.slice(0, 200) || 'L\'agent a exécuté des actions sur votre pipeline.',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    sendPushToUser(user.id, {
      title: `Agent IA — ${succeededCount} action${succeededCount > 1 ? 's' : ''} effectuée${succeededCount > 1 ? 's' : ''}`,
      body: plan.reasoning?.slice(0, 200) || 'L\'agent a exécuté des actions sur votre pipeline.',
    }).catch(() => {});
  }

  return NextResponse.json({
    reasoning: plan.reasoning,
    actions_executed: succeededCount,
    actions_failed: failedCount,
    actions_suggested: results.filter((r) => !r.executed).length,
    results,
  });
}

// Cron-friendly GET: same logic, uses service role to resolve workspace
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminClient();
  const { data: ws } = await admin.from('workspaces').select('owner_id').eq('id', workspaceId).single();
  if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const { data: settings } = await admin
    .from('settings')
    .select('ai_provider, ai_model, openrouter_key, agent_autonomy')
    .eq('user_id', ws.owner_id)
    .maybeSingle();

  const aiSettings = { ai_provider: settings?.ai_provider, ai_model: settings?.ai_model, openrouter_key: settings?.openrouter_key };
  const autonomy = settings?.agent_autonomy ?? {};
  const ctx: AgentContext = { workspaceId, userId: ws.owner_id, supabase: admin as any, settings: aiSettings, autonomy };

  const [leadsToFollowUp, pipelineSummary] = await Promise.all([
    listLeadsToFollowUp(ctx, { threshold_days: 7, min_score: 30 }),
    summarizePipeline(ctx),
  ]);

  const contextBlock = `Pipeline: ${JSON.stringify(pipelineSummary)}\n\nLeads à relancer:\n${leadsToFollowUp.slice(0, 10).map((l: any) => `- ${l.business_name} (score: ${l.score}) | Recommandation NBA: ${l.nba_action} via ${l.nba_channel} (urgence ${l.nba_urgency}) — ${l.nba_reason}`).join('\n')}`;

  let plan: { reasoning: string; actions: AgentAction[] };
  try {
    const raw = await generateCompletion({
      system: AGENT_SYSTEM,
      messages: [{ role: 'user', content: contextBlock }],
      jsonMode: true,
      maxTokens: 4000,
      settings: aiSettings,
      userId: ws.owner_id,
      workspaceId,
    });
    plan = JSON.parse(raw);
  } catch (err: any) {
    const message = err?.message || 'Erreur inconnue lors de la planification de l\'agent';
    console.error('[agent/loop cron] planning failed:', message);
    await reportAppError({
      userId: ws.owner_id,
      workspaceId,
      source: 'agent/loop (cron)',
      title: 'Planification de l\'agent échouée',
      message,
    });
    return NextResponse.json({ error: `Planning failed: ${message}` }, { status: 500 });
  }

  const actions = Array.isArray(plan?.actions) ? plan.actions.slice(0, 10) : [];
  let executed = 0;
  for (const action of actions) {
    if (canExecute(action.tool, autonomy)) {
      try {
        await dispatchTool(action.tool, action.params, ctx);
        executed++;
      } catch (err: any) {
        await reportAppError({
          userId: ws.owner_id,
          workspaceId,
          source: 'agent/loop (cron)',
          title: `Action agent échouée — ${action.tool}`,
          message: err?.message || 'Action non exécutée : cause inconnue.',
          context: { tool: action.tool, params: action.params },
        });
      }
    }
  }

  if (executed > 0) {
    await admin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: ws.owner_id,
      workspace_id: workspaceId,
      type: 'agent_action',
      title: `Agent IA — ${executed} action${executed > 1 ? 's' : ''} effectuée${executed > 1 ? 's' : ''}`,
      body: plan.reasoning?.slice(0, 200) || 'L\'agent a exécuté des actions sur votre pipeline.',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    sendPushToUser(ws.owner_id, {
      title: `Agent IA — ${executed} action${executed > 1 ? 's' : ''} effectuée${executed > 1 ? 's' : ''}`,
      body: plan.reasoning?.slice(0, 200) || 'L\'agent a exécuté des actions sur votre pipeline.',
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, actions_planned: actions.length, actions_executed: executed });
}
