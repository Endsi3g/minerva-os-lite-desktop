-- v4.1: Acquisition Phase — lead_source_type, UTM tracking, lead_events

-- New columns on leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source_type TEXT DEFAULT 'manual';
-- Valid values: 'osm', 'csv', 'manual', 'form', 'facebook', 'google', 'import'

ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- Backfill lead_source_type from existing source text field
UPDATE leads SET lead_source_type = 'osm'
  WHERE (source ILIKE '%maps%' OR source ILIKE '%osm%' OR source ILIKE '%google maps%' OR source ILIKE '%places%')
  AND lead_source_type = 'manual';
UPDATE leads SET lead_source_type = 'csv'
  WHERE (source ILIKE '%csv%' OR source ILIKE '%import%')
  AND lead_source_type = 'manual';

-- Unified lead events table (timeline)
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  -- 'created' | 'status_changed' | 'email_sent' | 'reply' | 'call' | 'visit' | 'note' | 'meeting' | 'task' | 'enrichment' | 'score_updated' | 'campaign_step' | 'booking'
  title TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_events_lead_id_idx ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS lead_events_workspace_idx ON lead_events(workspace_id);
CREATE INDEX IF NOT EXISTS lead_events_created_at_idx ON lead_events(lead_id, created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage lead events in their workspace" ON lead_events FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM settings WHERE user_id = auth.uid()));
