-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Colonnes pour le flow d'onboarding IA
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_setup_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_persona JSONB DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_email_templates JSONB DEFAULT '[]';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_objection_responses JSONB DEFAULT '[]';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_terrain_script TEXT;
