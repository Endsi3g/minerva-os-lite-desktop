-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;       -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;  -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Table sms_messages — logs des SMS entrants et sortants (Twilio)
CREATE TABLE IF NOT EXISTS sms_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_sid      TEXT,
  from_number     TEXT,
  to_number       TEXT,
  body            TEXT,
  direction       TEXT DEFAULT 'outbound',   -- 'inbound' | 'outbound'
  status          TEXT DEFAULT 'queued',
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_lead_id      ON sms_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_workspace_id ON sms_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid   ON sms_messages(twilio_sid);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_messages workspace access" ON sms_messages;
CREATE POLICY "sms_messages workspace access" ON sms_messages FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
