-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM team_members;  -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Migration v5 — Table weekly_reports (persistance des bilans de semaine)

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report TEXT,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_workspace ON weekly_reports (workspace_id, week_start DESC);

-- RLS
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_reports workspace access" ON weekly_reports;
CREATE POLICY "weekly_reports workspace access" ON weekly_reports FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
