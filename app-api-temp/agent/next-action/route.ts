import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateEmailDraft, createTask, type AgentContext } from '@/lib/agent-tools';

async function resolveWorkspace(supabase: any, userId: string, workspaceId?: string | null) {
  if (workspaceId) return workspaceId;
  const { data: s } = await supabase.from('settings').select('active_workspace_id').eq('user_id', userId).maybeSingle();
  if (s?.active_workspace_id) return s.active_workspace_id;
  const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', userId).limit(1).maybeSingle();
  return ws?.id ?? null;
}

// GET — return the single best pending suggested action
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await resolveWorkspace(supabase, user.id, req.nextUrl.searchParams.get('workspace_id'));
  if (!workspaceId) return NextResponse.json({ action: null });

  // Look for the most recent pending suggested action (last 48h)
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('agent_actions')
    .select('id, action_type, lead_id, reasoning, data_signals, autonomy_level, created_at')
    .eq('workspace_id', workspaceId)
    .eq('suggested', true)
    .eq('executed', false)
    .is('approved', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ action: null });

  // Enrich with lead name if lead_id exists
  let leadName: string | null = null;
  let leadCity: string | null = null;
  if (data.lead_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('business_name, city')
      .eq('id', data.lead_id)
      .maybeSingle();
    leadName = lead?.business_name ?? null;
    leadCity = lead?.city ?? null;
  }

  return NextResponse.json({
    action: { ...data, lead_name: leadName, lead_city: leadCity },
  });
}

// POST — execute the action
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action_id } = body;
  if (!action_id) return NextResponse.json({ error: 'action_id requis' }, { status: 400 });

  // Fetch action
  const { data: action } = await supabase
    .from('agent_actions')
    .select('id, action_type, lead_id, workspace_id')
    .eq('id', action_id)
    .maybeSingle();

  if (!action) return NextResponse.json({ error: 'Action introuvable' }, { status: 404 });

  const { data: dbSettings } = await supabase
    .from('settings')
    .select('ai_provider, ai_model, openrouter_key')
    .eq('user_id', user.id)
    .maybeSingle();

  const ctx: AgentContext = {
    workspaceId: action.workspace_id,
    userId: user.id,
    supabase,
    settings: {
      ai_provider: dbSettings?.ai_provider,
      ai_model: dbSettings?.ai_model,
      openrouter_key: dbSettings?.openrouter_key,
    },
  };

  let result: Record<string, unknown> = {};
  let redirect: string | null = null;
  let message: string | null = null;

  try {
    switch (action.action_type) {
      case 'generate_email_draft':
        if (!action.lead_id) throw new Error('lead_id manquant');
        result = await generateEmailDraft(ctx, { lead_id: action.lead_id, template_type: 'follow_up' });
        redirect = '/outreach';
        message = 'Brouillon créé — disponible dans Outreach pour approbation';
        break;

      case 'create_task': {
        if (!action.lead_id) throw new Error('lead_id manquant');
        const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
        result = await createTask(ctx, {
          lead_id: action.lead_id,
          type: 'follow_up',
          due_date: tomorrow,
          description: 'Relance recommandée par Minerva',
        });
        message = 'Tâche de relance créée pour demain';
        break;
      }

      case 'update_pipeline_stage':
        redirect = action.lead_id ? `/leads/${action.lead_id}` : '/pipeline';
        message = 'Ouvrez le lead pour mettre à jour le pipeline';
        result = { redirected: true };
        break;

      case 'enroll_in_sequence':
        redirect = '/outreach';
        message = 'Choisissez une séquence dans Outreach';
        result = { redirected: true };
        break;

      case 'plan_field_route':
        redirect = '/field';
        message = 'Planifiez votre tournée terrain';
        result = { redirected: true };
        break;

      default:
        redirect = action.lead_id ? `/leads/${action.lead_id}` : '/today';
        message = 'Action ouverte';
        result = { redirected: true };
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur lors de l\'exécution' }, { status: 500 });
  }

  // Mark as executed
  await getAdminClient()
    .from('agent_actions')
    .update({ executed: true, approved: true, result })
    .eq('id', action_id);

  return NextResponse.json({ success: true, result, redirect, message });
}

// DELETE — dismiss action (approved = false)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actionId = req.nextUrl.searchParams.get('id');
  if (!actionId) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  await getAdminClient()
    .from('agent_actions')
    .update({ approved: false })
    .eq('id', actionId);

  return NextResponse.json({ success: true });
}
