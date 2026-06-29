-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- ============================================================
-- v5.3 — Corrections de schéma (colonnes manquantes)
-- Erreurs Supabase observées le 2026-06-29 :
--   column email_sequences.user_id does not exist
--   column email_sequences_1.lead_name does not exist
--   column settings.todoist_token does not exist
-- ============================================================

-- email_sequences : colonnes manquantes
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS lead_email TEXT;

-- settings : intégrations tierces
ALTER TABLE settings ADD COLUMN IF NOT EXISTS todoist_token TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS todoist_project_id TEXT;

-- settings : colonnes AI setup (v5.2 — safe re-run)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_setup_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_persona JSONB DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_email_templates JSONB DEFAULT '[]';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_objection_responses JSONB DEFAULT '[]';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_terrain_script TEXT;
