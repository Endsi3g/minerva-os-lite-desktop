-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM team_members;  -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Cadence tracking on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cadence_phase TEXT DEFAULT 'initial_email';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cadence_started_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cadence_updated_at TIMESTAMPTZ;

-- Channel switch log
CREATE TABLE IF NOT EXISTS cadence_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  channel TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cadence_events_lead ON cadence_events(lead_id);

ALTER TABLE cadence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members cadence" ON cadence_events;
CREATE POLICY "Workspace members cadence" ON cadence_events FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
