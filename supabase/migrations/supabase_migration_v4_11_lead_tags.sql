-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM settings;      -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- v4.11 — Lead tags + Automation settings

-- Lead tags column (PostgreSQL array)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_leads_tags ON leads USING GIN(tags);

-- Automation toggles on settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_enrich_on_import BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_enrich_scheduled BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_email_on_enrichment BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_tag_replies BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_email_delay_hours INT DEFAULT 0;
