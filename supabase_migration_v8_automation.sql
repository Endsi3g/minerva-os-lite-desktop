-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP

-- ── daily_digests : récapitulatif quotidien par workspace ─────────────────────
CREATE TABLE IF NOT EXISTS daily_digests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    UUID NOT NULL,
  date            DATE NOT NULL,
  emails_sent     INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  leads_created   INTEGER DEFAULT 0,
  leads_moved     INTEGER DEFAULT 0,
  appointments_created INTEGER DEFAULT 0,
  agent_actions_count  INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  summary_text    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_digests_workspace_date ON daily_digests (workspace_id, date DESC);

ALTER TABLE daily_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_digests workspace access" ON daily_digests;
CREATE POLICY "daily_digests workspace access" ON daily_digests FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── Colonnes supplémentaires sur agent_actions ────────────────────────────────
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
