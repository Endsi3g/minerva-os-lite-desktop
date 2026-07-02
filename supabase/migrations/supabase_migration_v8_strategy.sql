-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

CREATE TABLE IF NOT EXISTS strategy_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('timing', 'channel', 'campaign', 'sequence', 'objection')),
  niche TEXT,
  city TEXT,
  campaign_id UUID,
  insight TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, memory_type, niche, key)
);

CREATE INDEX IF NOT EXISTS idx_strategy_memory_workspace ON strategy_memory(workspace_id);
CREATE INDEX IF NOT EXISTS idx_strategy_memory_type ON strategy_memory(workspace_id, memory_type);

ALTER TABLE strategy_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members strategy_memory" ON strategy_memory;
CREATE POLICY "Workspace members strategy_memory" ON strategy_memory FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
