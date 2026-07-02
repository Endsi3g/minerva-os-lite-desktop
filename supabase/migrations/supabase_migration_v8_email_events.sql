-- PRE-MIGRATION CHECK
-- SELECT COUNT(*) FROM leads; -- Si = 0 → STOP

-- ── email_events : journal des événements de livraison Resend ─────────────────
CREATE TABLE IF NOT EXISTS email_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_email_id TEXT,
  event_type      TEXT NOT NULL,
  to_email        TEXT,
  subject         TEXT,
  lead_id         UUID,
  workspace_id    UUID,
  raw             JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_events_lead ON email_events (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_events_workspace ON email_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_resend_id ON email_events (resend_email_id) WHERE resend_email_id IS NOT NULL;

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_events workspace access" ON email_events;
CREATE POLICY "email_events workspace access" ON email_events FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── Colonne resend_id sur email_queue ────────────────────────────────────────
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS resend_id TEXT;
CREATE INDEX IF NOT EXISTS idx_email_queue_resend_id ON email_queue (resend_id) WHERE resend_id IS NOT NULL;
