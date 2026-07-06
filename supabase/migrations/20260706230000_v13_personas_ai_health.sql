-- v13.0 — Phase 1 de l'initiative "Fiabilité IA & Prospection en masse" :
-- table personas manquante (le code l'interroge depuis longtemps, mais elle
-- n'a jamais été créée côté Supabase — seul electron/database.cjs l'avait,
-- ce qui rendait les personas invisibles/non persistantes en mode web),
-- toggle IA activée + suivi de santé, et notifications d'échec IA.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- SELECT COUNT(*) FROM settings;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

-- ── personas : colonnes identiques à electron/database.cjs et lib/use-personas.ts ──
CREATE TABLE IF NOT EXISTS public.personas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  target_niches     JSONB DEFAULT '[]',
  target_cities     JSONB DEFAULT '[]',
  scoring_criteria  JSONB DEFAULT '{}',
  case_studies      JSONB DEFAULT '[]',
  faqs              JSONB DEFAULT '[]',
  call_scripts      JSONB DEFAULT '{}',
  email_templates   JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_workspace_id ON public.personas(workspace_id);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personas workspace access" ON public.personas;
CREATE POLICY "personas workspace access" ON public.personas FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── settings : toggle IA activée (distinct de agent_enabled, qui contrôle
-- l'agent autonome) + suivi de la dernière vérification de santé ──
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ai_last_health_check_at TIMESTAMPTZ;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ai_last_health_status TEXT; -- 'ok' | 'degraded' | 'down'

-- ── ai_failure_notifications : anti-spam pour les notifications d'échec IA
-- immédiates (une seule notification par utilisateur toutes les 15 minutes) ──
CREATE TABLE IF NOT EXISTS public.ai_failure_notifications (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_notified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_failure_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_failure_notifications self access" ON public.ai_failure_notifications;
CREATE POLICY "ai_failure_notifications self access" ON public.ai_failure_notifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "ai_failure_notifications service write" ON public.ai_failure_notifications;
CREATE POLICY "ai_failure_notifications service write" ON public.ai_failure_notifications FOR ALL
  USING (true) WITH CHECK (true);
