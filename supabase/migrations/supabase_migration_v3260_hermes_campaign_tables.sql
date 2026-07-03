-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;    -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Phase 32.6: Hermès campaign execution tables
-- outreach_campaigns: campaigns created by the Hermès orchestrator or manually
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  lead_count   INTEGER DEFAULT 0,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_workspace ON outreach_campaigns (workspace_id);

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outreach_campaigns workspace access" ON outreach_campaigns;
CREATE POLICY "outreach_campaigns workspace access" ON outreach_campaigns FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- campaign_leads: enrollment records for leads in campaigns
CREATE TABLE IF NOT EXISTS campaign_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email_subject TEXT,
  email_body    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  enrolled_by   TEXT DEFAULT 'manual',
  enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead     ON campaign_leads (lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_workspace ON campaign_leads (workspace_id);

ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_leads workspace access" ON campaign_leads;
CREATE POLICY "campaign_leads workspace access" ON campaign_leads FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
