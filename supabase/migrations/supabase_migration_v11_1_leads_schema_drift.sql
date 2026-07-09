-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM team_members;  -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration (sauf base neuve/dev)

-- v11.1 — Corrige la dérive de schéma détectée en audit E2E :
-- ces 3 colonnes sont lues/écrites par le code (nba/score, leads/rescue,
-- agent-tools.listLeadsToFollowUp, pipeline forecast) mais n'existaient dans
-- AUCUN fichier de migration — elles avaient vraisemblablement été ajoutées à la
-- main dans l'éditeur SQL du projet de production sans être capturées ici.
-- Toute base recréée depuis les migrations était donc cassée sur ces chemins.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_probability INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_closing_date DATE;

COMMENT ON COLUMN leads.last_activity_at IS 'Dernière activité réelle sur le lead (email, visite, note…) — utilisée par le moteur NBA et le Lead Rescue Center';
COMMENT ON COLUMN leads.deal_probability IS 'Probabilité de closing (0-100) — pipeline forecast';
COMMENT ON COLUMN leads.deal_closing_date IS 'Date de closing estimée — pipeline forecast';
