-- PRE-MIGRATION CHECK (exécuter séparément d'abord)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP

-- Ajoute la colonne active_workspace_id à settings (manquante en production)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS active_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Backfill : pour chaque user, met le workspace dont ils sont propriétaire
UPDATE settings s
SET active_workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = s.user_id
  AND s.active_workspace_id IS NULL;
