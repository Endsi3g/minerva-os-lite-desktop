-- v12.0 — Groupes d'équipe réels, liés aux vrais membres (remplace le widget
-- Settings > Groupes qui ne persistait rien nulle part et n'avait aucun moyen
-- d'assigner un membre réel à un groupe).
--
-- PRE-MIGRATION CHECK (exécuté séparément avant d'appliquer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

CREATE TABLE IF NOT EXISTS public.team_groups (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_group_members (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.team_groups(id),
  team_member_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (group_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_team_groups_workspace ON public.team_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_group_members_group ON public.team_group_members(group_id);

ALTER TABLE public.team_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_groups_workspace_access" ON public.team_groups;
CREATE POLICY "team_groups_workspace_access" ON public.team_groups FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "team_group_members_workspace_access" ON public.team_group_members;
CREATE POLICY "team_group_members_workspace_access" ON public.team_group_members FOR ALL
  USING (
    group_id IN (
      SELECT id FROM public.team_groups WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION ALL
        SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
      )
    )
  );
