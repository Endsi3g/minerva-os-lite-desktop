-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;

-- Facebook Lead Ads connections table
CREATE TABLE IF NOT EXISTS fb_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  access_token TEXT,
  page_id TEXT,
  page_name TEXT,
  form_id TEXT,
  form_name TEXT,
  page_access_token TEXT,
  status TEXT DEFAULT 'active',
  leads_count INTEGER DEFAULT 0,
  connected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, page_id, form_id)
);

CREATE INDEX IF NOT EXISTS idx_fb_connections_workspace ON fb_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_fb_connections_form ON fb_connections(form_id);

-- RLS for fb_connections
ALTER TABLE fb_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fb_connections workspace access" ON fb_connections;
CREATE POLICY "fb_connections workspace access" ON fb_connections FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- New columns on leads for attribution + enrichissement avancé
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gclid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_form_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_ad_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_campaign_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'ok';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_logo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_size_estimate TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tech_stack TEXT; -- JSON array stored as text
ALTER TABLE leads ADD COLUMN IF NOT EXISTS web_presence_score INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS duplicate_group_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS merged_from_ids TEXT; -- JSON array

-- Indexes for attribution queries
CREATE INDEX IF NOT EXISTS idx_leads_source_type ON leads(lead_source_type);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_leads_first_contact ON leads(first_contact_at);
CREATE INDEX IF NOT EXISTS idx_leads_is_duplicate ON leads(is_duplicate);
