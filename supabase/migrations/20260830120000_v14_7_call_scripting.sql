-- v14.7 — Scripting d'appel IA : channel field/call + bibliothèque de templates.
--
-- Contexte : le mode "Terrain" existant (route_plans + field_visits) sert de
-- moteur de plan/résultat aussi bien pour les visites en personne que pour un
-- nouveau flux "Appels" (écran compagnon, pas de VoIP). Plutôt que dupliquer
-- 2 nouvelles tables + toute l'automatisation post-visite déjà présente dans
-- app/api/route-plans/visits/handler.ts (et re-répliquée dans electron/sync.cjs),
-- on ajoute une colonne `channel` : 'field' (défaut, comportement inchangé)
-- ou 'call'.
--
-- script_templates est une NOUVELLE table : bibliothèque de scripts d'appel/
-- visite réutilisables, privée par membre par défaut, avec partage optionnel
-- à tout le workspace via `is_shared`.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM route_plans;
-- SELECT COUNT(*) FROM field_visits;
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

ALTER TABLE public.route_plans ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'field';
ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'field';

DO $$ BEGIN
  ALTER TABLE public.route_plans ADD CONSTRAINT route_plans_channel_check
    CHECK (channel IN ('field', 'call'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.field_visits ADD CONSTRAINT field_visits_channel_check
    CHECK (channel IN ('field', 'call'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.script_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'text',
  source        TEXT NOT NULL DEFAULT 'manual',
  is_shared     BOOLEAN NOT NULL DEFAULT false,
  file_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE public.script_templates ADD CONSTRAINT script_templates_format_check
    CHECK (format IN ('text', 'flowchart'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.script_templates ADD CONSTRAINT script_templates_source_check
    CHECK (source IN ('manual', 'imported', 'ai_style'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_script_templates_workspace ON public.script_templates (workspace_id);
CREATE INDEX IF NOT EXISTS idx_script_templates_owner ON public.script_templates (owner_user_id);

ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;

-- Lecture : le propriétaire voit toujours ses templates ; les templates
-- partagés (`is_shared = true`) sont lisibles par tout le workspace.
DROP POLICY IF EXISTS "script_templates select" ON public.script_templates;
CREATE POLICY "script_templates select" ON public.script_templates FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR (
      is_shared = true
      AND workspace_id IN (
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        UNION ALL
        SELECT workspace_id FROM public.team_members WHERE member_user_id = auth.uid()
      )
    )
  );

-- Écriture : réservée au propriétaire.
DROP POLICY IF EXISTS "script_templates write" ON public.script_templates;
CREATE POLICY "script_templates write" ON public.script_templates FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "script_templates update" ON public.script_templates;
CREATE POLICY "script_templates update" ON public.script_templates FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "script_templates delete" ON public.script_templates;
CREATE POLICY "script_templates delete" ON public.script_templates FOR DELETE
  USING (owner_user_id = auth.uid());

-- 3. Vérification post-migration
-- SELECT channel, count(*) FROM route_plans GROUP BY channel;
-- SELECT channel, count(*) FROM field_visits GROUP BY channel;
-- SELECT count(*) FROM script_templates;
