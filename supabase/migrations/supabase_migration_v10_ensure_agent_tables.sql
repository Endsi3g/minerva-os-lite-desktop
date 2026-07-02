-- ============================================================
-- Migration v10 — Ensure agent + memory tables exist
-- PRE-MIGRATION CHECK (run separately first):
-- SELECT COUNT(*) FROM leads;       -- vérifier > 0
-- SELECT COUNT(*) FROM workspaces;  -- vérifier > 0
-- ============================================================

-- ── agent_actions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_actions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL,
  user_id        UUID,
  action_type    TEXT NOT NULL,
  lead_id        UUID,
  reasoning      TEXT,
  data_signals   TEXT,
  result         JSONB DEFAULT '{}',
  autonomy_level TEXT DEFAULT 'suggest',
  executed       BOOLEAN DEFAULT FALSE,
  suggested      BOOLEAN DEFAULT TRUE,
  approved       BOOLEAN,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- SLA columns (added in v8_sla migration)
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agent_actions_workspace ON agent_actions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created   ON agent_actions (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_lead      ON agent_actions (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_actions_sla       ON agent_actions(sla_due_at) WHERE sla_due_at IS NOT NULL AND executed = FALSE;

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_actions workspace access" ON agent_actions;
CREATE POLICY "agent_actions workspace access" ON agent_actions FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── agent_memory ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_memory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id      UUID,
  type         TEXT NOT NULL DEFAULT 'learning',
  key          TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, type, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_workspace ON agent_memory (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_updated   ON agent_memory (workspace_id, updated_at DESC);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_memory workspace access" ON agent_memory;
CREATE POLICY "agent_memory workspace access" ON agent_memory FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── agent_insights (NBA engine) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  niche        TEXT,
  city         TEXT,
  insight_type TEXT NOT NULL DEFAULT 'opportunity',
  content      TEXT NOT NULL,
  score        INTEGER DEFAULT 50,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_insights_workspace ON agent_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_niche     ON agent_insights(workspace_id, niche);

ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace members can access agent_insights" ON agent_insights;
CREATE POLICY "Workspace members can access agent_insights" ON agent_insights FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── settings : autonomy columns ───────────────────────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agent_autonomy JSONB DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_provider    TEXT DEFAULT 'openrouter';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_model       TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS openrouter_key TEXT;
