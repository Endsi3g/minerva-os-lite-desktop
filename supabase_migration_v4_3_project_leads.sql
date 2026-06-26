-- Migration v4.3 — Project association on leads
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;    -- noter le nombre
-- SELECT COUNT(*) FROM projects; -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Add project_id FK to leads (safe, additive)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Index for fast project → leads queries
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads (project_id);
