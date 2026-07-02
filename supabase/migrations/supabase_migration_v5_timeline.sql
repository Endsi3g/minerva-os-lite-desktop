-- PRE-MIGRATION CHECK
-- SELECT COUNT(*) FROM leads;       -- > 0
-- SELECT COUNT(*) FROM workspaces;  -- > 0

-- ── lead_events : table centrale de timeline ──────────────────────────────────
-- Miroir de la table SQLite dans electron/database.cjs (v4.1.0)
-- Chaque action outreach / agent écrit un événement ici, lu par timeline-root.tsx

CREATE TABLE IF NOT EXISTS lead_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id UUID        NOT NULL,
  user_id      UUID,
  event_type   TEXT        NOT NULL,
  -- event_type values:
  --   outreach: 'email_draft_approved' | 'email_draft_rejected' | 'email_sent'
  --             'reply_classified' | 'sequence_enrolled' | 'sequence_paused'
  --             'sequence_resumed' | 'sequence_completed'
  --   agent:    'agent_action_approved' | 'agent_action_rejected' | 'tag_added'
  --             'follow_up_suggested' | 'pipeline_updated_by_agent'
  --   manual:   'note' | 'call' | 'meeting_booked' | 'field_visit'
  title        TEXT,
  body         TEXT,
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  sync_status  TEXT        DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead      ON lead_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_workspace ON lead_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_type      ON lead_events(event_type);

-- RLS
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_events workspace access" ON lead_events;
CREATE POLICY "lead_events workspace access" ON lead_events FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
