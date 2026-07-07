-- v13.4 — Les statistiques IA de Paramètres (conversations, emails rédigés,
-- recherches web) étaient des nombres codés en dur (42/18/7), sans aucune
-- donnée réelle derrière — impossible de voir la moindre recherche web déjà
-- effectuée. Cette table journalise chaque recherche web Firecrawl réellement
-- exécutée, pour un compte honnête et une liste consultable.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM settings;
-- Si = 0 → STOP, ne pas lancer la migration.

CREATE TABLE IF NOT EXISTS public.ai_tool_usage_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool          TEXT NOT NULL, -- 'firecrawl_search' | 'firecrawl_scrape' | 'firecrawl_crawl'
  summary       TEXT,          -- requête ou URL, tronquée
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_usage_log_workspace ON public.ai_tool_usage_log (workspace_id, created_at DESC);

ALTER TABLE public.ai_tool_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_tool_usage_log workspace access" ON public.ai_tool_usage_log;
CREATE POLICY "ai_tool_usage_log workspace access" ON public.ai_tool_usage_log FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
