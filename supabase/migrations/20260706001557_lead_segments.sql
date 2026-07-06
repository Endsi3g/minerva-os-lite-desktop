-- v12.0 — Groupes dynamiques de leads par règles (ex: score > 80 ET tag=chaud).
-- Permet d'attacher un segment entier (au lieu d'un seul lead) à une séquence.
--
-- PRE-MIGRATION CHECK (exécuté séparément avant d'appliquer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

CREATE TABLE IF NOT EXISTS public.lead_segments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  rules jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_segments_workspace ON public.lead_segments(workspace_id);

ALTER TABLE public.lead_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_segments_workspace_access" ON public.lead_segments;
CREATE POLICY "lead_segments_workspace_access" ON public.lead_segments FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
