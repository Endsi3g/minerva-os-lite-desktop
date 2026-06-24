-- PRE-MIGRATION CHECK (run separately and verify > 0 before continuing)
-- SELECT COUNT(*) FROM leads;

-- Add Google Places enrichment columns to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_place_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_enriched_at TIMESTAMPTZ;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_leads_google_place_id ON leads (google_place_id) WHERE google_place_id IS NOT NULL;
