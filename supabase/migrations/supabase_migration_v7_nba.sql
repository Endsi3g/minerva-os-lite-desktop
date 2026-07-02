-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP

CREATE TABLE IF NOT EXISTS agent_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  niche TEXT NOT NULL,
  city TEXT,
  response_rate DECIMAL(5,2) DEFAULT 0,
  booking_rate DECIMAL(5,2) DEFAULT 0,
  leads_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  positive_replies INTEGER DEFAULT 0,
  bookings INTEGER DEFAULT 0,
  recommended_channel TEXT DEFAULT 'email',
  best_cadence_days INTEGER DEFAULT 3,
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, niche, city)
);

CREATE INDEX IF NOT EXISTS idx_agent_insights_workspace ON agent_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_niche ON agent_insights(workspace_id, niche);

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

ALTER TABLE leads ADD COLUMN IF NOT EXISTS nba_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nba_action TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nba_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nba_channel TEXT DEFAULT 'email';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nba_computed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_opens_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_clicks_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_stagnation_days INTEGER DEFAULT 0;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS v7_strategy_niche TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS v7_strategy_goal TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS v7_strategy_done BOOLEAN DEFAULT FALSE;
