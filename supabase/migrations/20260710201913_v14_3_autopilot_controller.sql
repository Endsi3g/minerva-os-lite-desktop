-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- v14.3 — Moteur de contrôle Autopilot des programmes de croissance.
--
-- Jusqu'ici, "autopilot" n'était qu'un booléen (campaigns.autopilot_enabled)
-- orthogonal à campaigns.status ('draft'|'active'|'paused'|'completed'), et
-- une suspension automatique (app/api/cron/autopilot-guardrail) se contentait
-- de repasser status à 'paused' — impossible de distinguer une pause
-- manuelle d'une suspension pour anomalie sans lire autopilot_paused_reason.
-- autopilot_state formalise ces 5 états en un seul champ, sans retirer les
-- colonnes existantes (autopilot_enabled reste lu par lib/autopilot-guard.ts
-- et les crons d'envoi — inchangés, gardés synchronisés par le contrôleur).

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_state TEXT DEFAULT 'draft';

-- Backfill déterministe depuis l'état actuel (status / autopilot_enabled /
-- autopilot_paused_reason) — ne s'applique qu'aux lignes pas encore migrées.
UPDATE public.campaigns SET autopilot_state = CASE
  WHEN status = 'completed' THEN 'completed'
  WHEN autopilot_enabled = true AND COALESCE(autopilot_paused_reason, '') != '' THEN 'suspended'
  WHEN autopilot_enabled = true THEN 'autopilot'
  WHEN status = 'active' THEN 'active'
  ELSE 'draft'
END
WHERE autopilot_state IS NULL OR autopilot_state = 'draft';

CREATE INDEX IF NOT EXISTS idx_campaigns_autopilot_state ON public.campaigns (autopilot_state);

-- Journal d'actions du contrôleur Autopilot — une ligne par cycle/transition,
-- lisible directement (raison en texte + résultat structuré), distinct de
-- agent_actions (qui journalise les actions de l'agent IA conversationnel,
-- pas les cycles Autopilot par programme).
CREATE TABLE IF NOT EXISTS public.program_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- autopilot_activated | autopilot_suspended | autopilot_resumed | autopilot_cycle
  reasoning TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  executed BOOLEAN DEFAULT TRUE,
  incident BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_actions_log_campaign ON public.program_actions_log (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_program_actions_log_workspace ON public.program_actions_log (workspace_id);

ALTER TABLE public.program_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "program_actions_log workspace access" ON public.program_actions_log;
CREATE POLICY "program_actions_log workspace access" ON public.program_actions_log FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

COMMENT ON COLUMN public.campaigns.autopilot_state IS 'État du moteur Autopilot : draft | active | autopilot | suspended | completed. autopilot_enabled reste la source de vérité pour lib/autopilot-guard.ts, gardée synchronisée par lib/autopilot-controller.ts.';
COMMENT ON TABLE public.program_actions_log IS 'Journal lisible des transitions et cycles du contrôleur Autopilot, un par programme (campaign_id).';
