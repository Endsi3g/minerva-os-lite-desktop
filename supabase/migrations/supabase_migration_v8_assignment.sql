-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM agent_actions; -- noter le nombre avant de continuer

ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS assignment_reason TEXT;
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agent_actions_assigned ON agent_actions(assigned_to) WHERE assigned_to IS NOT NULL;
