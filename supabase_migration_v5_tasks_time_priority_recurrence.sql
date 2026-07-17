-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM team_members;  -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Migration v5 — Heure d'échéance, priorité et récurrence pour les tâches
-- (audit UX : les tâches n'avaient qu'une date, sans heure/priorité/récurrence,
-- contrairement à Google Tasks / Apple Reminders)

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Index pour retrouver rapidement les tâches récurrentes actives (génération de la prochaine occurrence)
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks (recurrence) WHERE recurrence != 'none';
