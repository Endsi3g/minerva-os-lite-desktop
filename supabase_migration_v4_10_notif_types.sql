-- Migration v4.10 — Extend notifications.type enum with new app notification types
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM notifications; -- noter le nombre

-- If notifications.type is stored as text (no enum constraint), nothing to do —
-- the new values will be accepted automatically. If there is a CHECK constraint,
-- run the ALTER below. Check first:
--   SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'notifications'::regclass AND contype = 'c';

-- Only run if a CHECK constraint exists that restricts the type column:
-- ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
--   CHECK (type IN (
--     'info','lead_assigned','overdue','digest','report','team_message',
--     'email_sent','email_received','scraping_done','lead_aging'
--   ));

-- Safe no-op migration — adds project_id to leads if not already present
-- (included for completeness; the real change is in application code)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads (project_id);
