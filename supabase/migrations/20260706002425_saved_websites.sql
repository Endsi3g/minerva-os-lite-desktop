-- v12.0 — Galerie de sites web façon marketplace : coller un lien, en récupérer
-- l'aperçu (Open Graph), catégoriser et filtrer. Remplace le besoin d'un
-- stockage localStorage (par device, non partagé) par une vraie table partagée.
--
-- PRE-MIGRATION CHECK (exécuté séparément avant d'appliquer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

CREATE TABLE IF NOT EXISTS public.saved_websites (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  workspace_id uuid NOT NULL,
  url text NOT NULL,
  title text,
  description text,
  image_url text,
  favicon_url text,
  category text DEFAULT 'Autre'::text,
  tags text[] DEFAULT '{}'::text[],
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_websites_workspace ON public.saved_websites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_saved_websites_category ON public.saved_websites(workspace_id, category);

ALTER TABLE public.saved_websites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_websites_workspace_access" ON public.saved_websites;
CREATE POLICY "saved_websites_workspace_access" ON public.saved_websites FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
