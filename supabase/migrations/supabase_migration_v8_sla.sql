-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM agent_actions; -- noter le nombre

ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agent_actions_sla ON agent_actions(sla_due_at) WHERE sla_due_at IS NOT NULL AND executed = FALSE;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS sla_hot_lead_hours INTEGER DEFAULT 2;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sla_approval_hours INTEGER DEFAULT 4;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sla_proposal_followup_hours INTEGER DEFAULT 24;
