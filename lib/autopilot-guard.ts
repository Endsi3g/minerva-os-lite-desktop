// Programmes de croissance — Autopilot (Sprint 3 du PRD v12).
//
// Garde-fou de plafond d'envoi PAR PROGRAMME, branché dans les deux moteurs
// d'envoi de séquences existants (app/api/cron/email-sequences/route.ts et
// app/api/cron/process-queue/route.ts) qui, avant ce fichier, n'appliquaient
// que des plafonds par utilisateur/workspace — jamais par campagne, alors
// que `campaigns.sequence_config.dailyVolumeCap` était configuré dans le
// Playbook Wizard mais jamais lu nulle part.
//
// N'affecte AUCUN lead qui n'appartient pas à un programme avec Autopilot
// activé (comportement par défaut : autorisé, identique à avant ce fichier).
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

interface CampaignCapState {
  autopilotEnabled: boolean;
  dailyEmailCap: number | null;
  sentToday: number;
}

export function createAutopilotCapChecker(supabase: SupabaseLike) {
  const leadCampaignCache = new Map<string, string | null>();
  const campaignCapCache = new Map<string, CampaignCapState>();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  async function loadCampaignCap(campaignId: string): Promise<CampaignCapState> {
    const cached = campaignCapCache.get(campaignId);
    if (cached) return cached;

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('autopilot_enabled, autopilot_daily_email_cap')
      .eq('id', campaignId)
      .maybeSingle();

    const state: CampaignCapState = {
      autopilotEnabled: !!campaign?.autopilot_enabled,
      dailyEmailCap: campaign?.autopilot_daily_email_cap ?? null,
      sentToday: 0,
    };

    if (state.autopilotEnabled && state.dailyEmailCap !== null) {
      const { data: programLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('campaign_id', campaignId);
      const leadIds: string[] = (programLeads ?? []).map((l: { id: string }) => l.id);

      if (leadIds.length > 0) {
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
        state.sentToday = (stepsCount.count ?? 0) + (queueCount.count ?? 0);
      }
    }

    campaignCapCache.set(campaignId, state);
    return state;
  }

  async function getCampaignIdForLead(leadId: string): Promise<string | null> {
    if (leadCampaignCache.has(leadId)) return leadCampaignCache.get(leadId)!;
    const { data: lead } = await supabase.from('leads').select('campaign_id').eq('id', leadId).maybeSingle();
    const campaignId: string | null = lead?.campaign_id ?? null;
    leadCampaignCache.set(leadId, campaignId);
    return campaignId;
  }

  return {
    // Vérifie ET réserve immédiatement une place dans le plafond (compteur en
    // mémoire incrémenté avant même la confirmation d'envoi) pour éviter un
    // dépassement si plusieurs leads du même programme sont traités dans la
    // même exécution de cron avant qu'une requête de recomptage ait pu tourner.
    async checkAndReserve(leadId: string): Promise<{ allowed: boolean; reason?: string }> {
      try {
        const campaignId = await getCampaignIdForLead(leadId);
        if (!campaignId) return { allowed: true };

        const cap = await loadCampaignCap(campaignId);
        if (!cap.autopilotEnabled || cap.dailyEmailCap === null) return { allowed: true };

        if (cap.sentToday >= cap.dailyEmailCap) {
          return { allowed: false, reason: `Plafond Autopilot atteint (${cap.dailyEmailCap} emails/jour pour ce programme)` };
        }
        cap.sentToday++;
        return { allowed: true };
      } catch (err) {
        // Fail-open : une erreur du garde-fou (ex: table absente si la
        // migration Autopilot n'a pas encore été exécutée) ne doit jamais
        // bloquer les envois normaux hors Autopilot.
        console.error('[autopilot-guard] checkAndReserve error:', err);
        return { allowed: true };
      }
    },
  };
}
