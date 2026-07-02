-- ============================================================
-- Minerva OS Lite — Migration v3.52 (Schema mismatch fixes)
-- Erreurs production observées :
--   column sequence_enrollments.created_at does not exist
--   column settings.workspace_id does not exist
--   column route_plans.title does not exist
--   column tasks.description / status / type / lead_id does not exist
--   column notifications.lead_id / link / is_read / updated_at does not exist
--   invalid input syntax for type uuid: "" (empty-string UUID guard)
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration
-- ============================================================

-- ── 1. notifications — colonnes manquantes ───────────────────────────────────
-- La table existe mais est incomplète (link, is_read, updated_at, lead_id absents)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link          TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read       BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS lead_id       UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title         TEXT;

-- Index pour les filtres lead_id utilisés par la timeline
CREATE INDEX IF NOT EXISTS idx_notifications_lead_id
  ON notifications (lead_id) WHERE lead_id IS NOT NULL;

-- ── 2. sequence_enrollments — created_at + sequence_id manquants ─────────────
-- Table créée en v4.2 sans created_at ; utilise enrolled_at à la place.
-- Le code ordonne par created_at et sélectionne sequence_id (alias de template_id).
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS sequence_id  UUID REFERENCES sequence_templates(id) ON DELETE SET NULL;

-- Backfill : created_at ← enrolled_at si disponible
UPDATE sequence_enrollments
SET created_at = enrolled_at
WHERE created_at IS NULL AND enrolled_at IS NOT NULL;

-- Backfill : sequence_id ← template_id
UPDATE sequence_enrollments
SET sequence_id = template_id
WHERE sequence_id IS NULL AND template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seq_enroll_created
  ON sequence_enrollments (created_at DESC);

-- ── 3. settings — workspace_id + reminder_overdue manquants ─────────────────
-- workspace_id : workspace principal de l'utilisateur (≈ active_workspace_id
--   pour les propriétaires). Référencé par ~10 routes cron/outreach.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS workspace_id      UUID REFERENCES workspaces(id) ON DELETE SET NULL;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS reminder_overdue  BOOLEAN DEFAULT TRUE;

-- Backfill workspace_id depuis le workspace dont l'user est propriétaire
UPDATE settings s
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = s.user_id
  AND s.workspace_id IS NULL;

-- Fallback : si workspace_id est toujours NULL, copier active_workspace_id
UPDATE settings s
SET workspace_id = s.active_workspace_id
WHERE s.workspace_id IS NULL
  AND s.active_workspace_id IS NOT NULL;

-- ── 4. route_plans — titre manquant ─────────────────────────────────────────
-- La timeline sélectionne route_plans.title pour afficher le nom de la tournée.
ALTER TABLE route_plans ADD COLUMN IF NOT EXISTS title TEXT;

-- ── 5. tasks — colonnes manquantes pour timeline + agent-tools ───────────────
-- description : inséré par agent-tools.ts et affiché dans la timeline.
-- status      : 'pending' | 'in_progress' | 'completed' — utilisé en timeline.
-- type        : type de tâche (follow_up, call, etc.) — sélectionné en timeline.
-- lead_id     : liaison optionnelle vers un lead — filtré en timeline.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status      TEXT    DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type        TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_lead_id
  ON tasks (lead_id) WHERE lead_id IS NOT NULL;

-- Normalise les tâches existantes : completed=true → status='completed'
UPDATE tasks SET status = 'completed' WHERE completed = TRUE AND status = 'pending';

-- ============================================================
-- DONE. Vérification post-migration recommandée :
--   SELECT COUNT(*) FROM leads;
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'workspace_id';
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'description';
-- ============================================================
