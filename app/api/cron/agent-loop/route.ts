import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  listLeadsToFollowUp,
  generateEmailDraft,
  createTask,
  updatePipelineStage,
  summarizePipeline,
  type AgentContext,
} from '@/lib/agent-tools';
import { generateCompletion } from '@/lib/ai';
import { TOOL_DESCRIPTIONS } from '@/lib/agent-tools';

function cronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const authHeader = req.headers.get('authorization');
  return !!(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);
}

async function runAgentForWorkspace(
  adminClient: any,
  workspaceId: string,
  userId: string,
  settings: { ai_provider?: string; ai_model?: string; openrouter_key?: string },
) {
  const ctx: AgentContext = { workspaceId, userId, supabase: adminClient, settings };

  // PERCEIVE
  const coldLeads = await listLeadsToFollowUp(ctx, { threshold_days: 5, min_score: 30 });
  const pipelineSummary = await summarizePipeline(ctx);
  const { data: memory } = await adminClient
    .from('agent_memory')
    .select('key, value')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (coldLeads.length === 0) return { actions_executed: 0, actions_suggested: 0 };

  const memoryContext = (memory || []).map((m: any) => `${m.key}: ${m.value}`).join('\n');
  const leadsContext = coldLeads.slice(0, 5).map((l: any) =>
    `- ${l.business_name || l.name} (score: ${l.score}, inactif: ${l.days_since_contact}j, statut: ${l.status})`
  ).join('\n');

  // PLAN (Claude)
  let actions: any[] = [];
  try {
    const planText = await generateCompletion({
      system: `Tu es Minerva, agent commercial autonome. Analyse le pipeline et génère 1 à 3 actions commerciales concrètes en JSON.
Format: { "reasoning": "...", "actions": [{ "tool": "...", "params": {...}, "reasoning": "...", "data_signals": "..." }] }
${TOOL_DESCRIPTIONS}`,
      messages: [{
        role: 'user',
        content: `Leads à relancer:\n${leadsContext}\n\nPipeline:\n${JSON.stringify(pipelineSummary)}\n\nMémoire agent:\n${memoryContext}\n\nGénère les actions prioritaires.`,
      }],
      jsonMode: true,
      maxTokens: 800,
      settings,
      userId,
    });
    const parsed = JSON.parse(planText);
    actions = parsed.actions || [];
  } catch {
    return { actions_executed: 0, actions_suggested: 0 };
  }

  let executed = 0;
  let suggested = 0;

  for (const action of actions.slice(0, 3)) {
    const actionId = crypto.randomUUID();
    let result: any = {};
    let didExecute = false;

    try {
      switch (action.tool) {
        case 'generate_email_draft':
          if (action.params?.lead_id) {
            result = await generateEmailDraft(ctx, { lead_id: action.params.lead_id, template_type: action.params.template_type || 'follow_up' });
            didExecute = true;
          }
          break;
        case 'create_task':
          if (action.params?.lead_id) {
            const due = action.params.due_date || new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
            result = await createTask(ctx, { lead_id: action.params.lead_id, type: action.params.type || 'follow_up', due_date: due, description: action.params.description || 'Relance auto — Minerva' });
            didExecute = true;
          }
          break;
        case 'update_pipeline_stage':
          if (action.params?.lead_id && action.params?.stage) {
            result = await updatePipelineStage(ctx, { lead_id: action.params.lead_id, stage: action.params.stage, reason: action.params.reason || '' });
            didExecute = true;
          }
          break;
        default:
          didExecute = false;
      }
    } catch {
      didExecute = false;
    }

    await adminClient.from('agent_actions').insert({
      id: actionId,
      workspace_id: workspaceId,
      user_id: userId,
      action_type: action.tool,
      lead_id: action.params?.lead_id ?? null,
      reasoning: action.reasoning,
      data_signals: action.data_signals,
      result: result ?? {},
      autonomy_level: 'auto',
      executed: didExecute,
      suggested: !didExecute,
      created_at: new Date().toISOString(),
    });

    if (didExecute) {
      executed++;
      // Notification
      await adminClient.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: workspaceId,
        type: 'agent_action',
        title: `Minerva — ${action.tool.replace(/_/g, ' ')}`,
        body: action.reasoning || 'Action exécutée automatiquement',
        link: action.params?.lead_id ? `/leads/${action.params.lead_id}` : '/today',
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
    .select('user_id, active_workspace_id, ai_provider, ai_model, openrouter_key, agent_enabled')
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
