-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM team_members;  -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Migration v5 — Tâches assignées à des membres d'équipe

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- Index pour chercher rapidement les tâches d'un membre
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to) WHERE assigned_to IS NOT NULL;

-- RLS: les membres du workspace peuvent voir les tâches assignées à eux ou créées dans leur workspace
-- (les policies existantes basées sur workspace_id couvrent déjà cela)
