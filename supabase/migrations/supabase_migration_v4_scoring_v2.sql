-- v4.4: Scoring v2 — colonnes multidimensionnelles
-- Chaque dimension : 0-25, total (score) : 0-100

ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_icp        INTEGER DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_engagement  INTEGER DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_urgency     INTEGER DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_revenue     INTEGER DEFAULT NULL;

-- Index pour trier par score total dans la liste leads
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(workspace_id, score DESC NULLS LAST);
