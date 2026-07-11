// Moteur de contrôle Autopilot des programmes de croissance (campaigns).
//
// Formalise 5 états (draft/active/autopilot/suspended/completed) dans
// campaigns.autopilot_state, journalise chaque transition et chaque cycle
// dans program_actions_log (lisible : raison en texte + résultat structuré),
// et applique la règle de suspension automatique (taux de réponses négatives).
//
// Ne remplace PAS l'existant : campaigns.autopilot_enabled reste la source de
// vérité lue par lib/autopilot-guard.ts (plafond quotidien d'emails, déjà
// branché dans les crons d'envoi) — ce contrôleur la garde synchronisée à
// chaque transition d'état plutôt que de dupliquer cette logique.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type ProgramAutopilotState = 'draft' | 'active' | 'autopilot' | 'suspended' | 'completed';

export type ProgramActionType =
  | 'autopilot_activated'
  | 'autopilot_suspended'
  | 'autopilot_resumed'
  | 'autopilot_cycle';

interface LogParams {
  workspaceId: string;
  campaignId: string;
  actionType: ProgramActionType;
  reasoning: string;
  result?: Record<string, unknown>;
  executed?: boolean;
  incident?: boolean;
}

// Négatif au-delà de ce seuil, sur un échantillon d'au moins MIN_SAMPLE_SIZE
// leads contactés, déclenche une suspension automatique (voir
// evaluateNegativeReplyGuardrail). Repris tel quel de l'ancien
// app/api/cron/autopilot-guardrail/route.ts — seuil volontairement
// conservateur pour éviter les faux positifs sur les programmes tout juste
// lancés.
const NEGATIVE_RATE_THRESHOLD = 0.4;
const MIN_SAMPLE_SIZE = 5;

async function logAction(supabase: SupabaseLike, params: LogParams): Promise<void> {
  await supabase.from('program_actions_log').insert({
    workspace_id: params.workspaceId,
    campaign_id: params.campaignId,
    action_type: params.actionType,
    reasoning: params.reasoning,
    result: params.result ?? {},
    executed: params.executed ?? true,
    incident: params.incident ?? false,
    created_at: new Date().toISOString(),
  }).then(() => {}, () => {});
}

interface CampaignRow {
  id: string;
  name: string;
  user_id: string | null;
  workspace_id: string | null;
  autopilot_daily_email_cap: number | null;
  autopilot_weekly_meeting_cap: number | null;
}

// ── State transitions ───────────────────────────────────────────────────────

export async function activateAutopilot(supabase: SupabaseLike, campaignId: string): Promise<void> {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, workspace_id')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return;

  const nowStr = new Date().toISOString();
  await supabase.from('campaigns').update({
    autopilot_state: 'autopilot',
    autopilot_enabled: true,
    status: 'active',
    autopilot_paused_reason: null,
    autopilot_paused_at: null,
    updated_at: nowStr,
  }).eq('id', campaignId);

  await logAction(supabase, {
    workspaceId: campaign.workspace_id,
    campaignId,
    actionType: 'autopilot_activated',
    reasoning: 'Autopilot activé manuellement.',
  });
}

export async function resumeProgram(supabase: SupabaseLike, campaignId: string): Promise<void> {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, workspace_id')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return;

  const nowStr = new Date().toISOString();
  await supabase.from('campaigns').update({
    autopilot_state: 'autopilot',
    autopilot_enabled: true,
    autopilot_paused_reason: null,
    autopilot_paused_at: null,
    updated_at: nowStr,
  }).eq('id', campaignId);

  await logAction(supabase, {
    workspaceId: campaign.workspace_id,
    campaignId,
    actionType: 'autopilot_resumed',
    reasoning: 'Reprise manuelle après suspension.',
  });
}

export async function suspendProgram(
  supabase: SupabaseLike,
  campaignId: string,
  reason: string,
  opts: { incident?: boolean; workspaceId?: string; userId?: string; name?: string } = {}
): Promise<void> {
  const nowStr = new Date().toISOString();
  let workspaceId = opts.workspaceId;
  let userId = opts.userId;
  let name = opts.name;

  if (!workspaceId || !userId || !name) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('workspace_id, user_id, name')
      .eq('id', campaignId)
      .maybeSingle();
    workspaceId = workspaceId ?? campaign?.workspace_id;
    userId = userId ?? campaign?.user_id;
    name = name ?? campaign?.name;
  }

  await supabase.from('campaigns').update({
    autopilot_state: 'suspended',
    autopilot_enabled: false,
    status: 'paused',
    autopilot_paused_reason: reason,
    autopilot_paused_at: nowStr,
    updated_at: nowStr,
  }).eq('id', campaignId);

  await logAction(supabase, {
    workspaceId: workspaceId!,
    campaignId,
    actionType: 'autopilot_suspended',
    reasoning: reason,
    incident: opts.incident ?? true,
  });

  if (userId) {
    await supabase.from('notifications').insert({
      user_id: userId,
      workspace_id: workspaceId ?? null,
      type: 'autopilot_suspended',
      title: `Autopilot suspendu — ${name ?? 'Programme'}`,
      body: reason,
      link: `/campaigns/${campaignId}`,
      is_read: false,
      created_at: nowStr,
      updated_at: nowStr,
    }).then(() => {}, () => {});
  }
}

// ── Guardrail: negative reply rate ──────────────────────────────────────────

async function evaluateNegativeReplyGuardrail(
  supabase: SupabaseLike,
  campaignId: string
): Promise<{ breached: boolean; reason?: string; contacted: number; negativeRate: number }> {
  const { data: programLeads } = await supabase
    .from('leads')
    .select('status, reply_status')
    .eq('campaign_id', campaignId);

  const contacted = (programLeads ?? []).filter((l: { status: string }) => l.status !== 'New');
  if (contacted.length < MIN_SAMPLE_SIZE) {
    return { breached: false, contacted: contacted.length, negativeRate: 0 };
  }

  const negativeCount = contacted.filter((l: { reply_status: string | null }) => l.reply_status === 'negative').length;
  const negativeRate = negativeCount / contacted.length;

  if (negativeRate > NEGATIVE_RATE_THRESHOLD) {
    return {
      breached: true,
      reason: `Suspendu automatiquement : ${Math.round(negativeRate * 100)}% de réponses négatives sur ${contacted.length} leads contactés (seuil ${Math.round(NEGATIVE_RATE_THRESHOLD * 100)}%)`,
      contacted: contacted.length,
      negativeRate,
    };
  }
  return { breached: false, contacted: contacted.length, negativeRate };
}

// ── Metrics for the cycle log / status card ─────────────────────────────────

async function countEmailsSentToday(supabase: SupabaseLike, leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [stepsCount, queueCount] = await Promise.all([
    supabase
      .from('email_sequence_steps')
      .select('id, email_sequences!inner(lead_id)', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayStart.toISOString())
      .in('email_sequences.lead_id', leadIds),
    supabase
      .from('email_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('sent_at', todayStart.toISOString())
      .in('lead_id', leadIds),
  ]);
  return (stepsCount.count ?? 0) + (queueCount.count ?? 0);
}

async function countMeetingsThisWeek(supabase: SupabaseLike, leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0;
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'Meeting')
    .in('lead_id', leadIds)
    .gte('created_at', weekStart.toISOString());
  return count ?? 0;
}

// ── The cycle: reads every program in 'autopilot' state, evaluates the
//    guardrail, suspends on breach, otherwise logs a readable status entry
//    with today's/this week's metrics. Actual sending stays owned by the
//    existing email-sequences/process-queue crons + autopilot-guard.ts cap
//    checker — this cycle is the state machine + guardrail + audit trail. ──

export async function runAutopilotCycle(supabase: SupabaseLike): Promise<{ checked: number; suspended: number }> {
  const { data: programs } = await supabase
    .from('campaigns')
    .select('id, name, user_id, workspace_id, autopilot_daily_email_cap, autopilot_weekly_meeting_cap')
    .eq('autopilot_state', 'autopilot');

  const rows: CampaignRow[] = programs ?? [];
  let suspended = 0;

  for (const program of rows) {
    const guardrail = await evaluateNegativeReplyGuardrail(supabase, program.id);

    if (guardrail.breached) {
      await suspendProgram(supabase, program.id, guardrail.reason!, {
        workspaceId: program.workspace_id ?? undefined,
        userId: program.user_id ?? undefined,
        name: program.name,
      });
      suspended++;
      continue;
    }

    const { data: programLeadRows } = await supabase.from('leads').select('id').eq('campaign_id', program.id);
    const leadIds: string[] = (programLeadRows ?? []).map((l: { id: string }) => l.id);

    const [emailsSentToday, meetingsThisWeek] = await Promise.all([
      countEmailsSentToday(supabase, leadIds),
      countMeetingsThisWeek(supabase, leadIds),
    ]);

    const dailyCap = program.autopilot_daily_email_cap;
    const weeklyTarget = program.autopilot_weekly_meeting_cap;
    const reasoning = `Cycle quotidien : ${emailsSentToday}${dailyCap ? `/${dailyCap}` : ''} emails envoyés aujourd'hui, ${meetingsThisWeek}${weeklyTarget ? `/${weeklyTarget}` : ''} RDV cette semaine. ${Math.round(guardrail.negativeRate * 100)}% de réponses négatives sur ${guardrail.contacted} leads contactés.`;

    await logAction(supabase, {
      workspaceId: program.workspace_id!,
      campaignId: program.id,
      actionType: 'autopilot_cycle',
      reasoning,
      result: {
        emailsSentToday,
        dailyEmailCap: dailyCap,
        meetingsThisWeek,
        weeklyMeetingTarget: weeklyTarget,
        contactedLeads: guardrail.contacted,
        negativeRate: guardrail.negativeRate,
      },
    });
  }

  return { checked: rows.length, suspended };
}
