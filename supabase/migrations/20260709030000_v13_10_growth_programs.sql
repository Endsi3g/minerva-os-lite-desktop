-- v13.10 — Programmes de croissance, Phase 1 : modèle de données.
--
-- "Programme de croissance" = une campagne (table `campaigns`, déjà utilisée
-- partout — niches, villes, sequence_config, persona_id) à laquelle on assigne
-- un objectif de croissance explicite (RDV / clients / MRR) et une cible
-- chiffrée. On évolue l'existant plutôt que de dupliquer une nouvelle entité
-- parallèle : une campagne devient un "programme" dès que goal_type est
-- renseigné.
--
-- growth_program_leads est une table de liaison NOUVELLE (beaucoup à beaucoup)
-- distincte du leads.campaign_id existant (qui reste un simple lien "campagne
-- principale" à un seul lead) — elle permet à un lead d'appartenir à
-- PLUSIEURS programmes actifs simultanément, ce que la colonne singulière ne
-- permet pas.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM campaigns;
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_value NUMERIC;

DO $$ BEGIN
  ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_goal_type_check
    CHECK (goal_type IS NULL OR goal_type IN ('rdv', 'clients', 'mrr'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.growth_program_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_program_leads_campaign ON public.growth_program_leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_growth_program_leads_lead ON public.growth_program_leads (lead_id);
CREATE INDEX IF NOT EXISTS idx_growth_program_leads_workspace ON public.growth_program_leads (workspace_id);

ALTER TABLE public.growth_program_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_program_leads workspace access" ON public.growth_program_leads;
CREATE POLICY "growth_program_leads workspace access" ON public.growth_program_leads FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM public.team_members WHERE member_user_id = auth.uid()
    )
  );
