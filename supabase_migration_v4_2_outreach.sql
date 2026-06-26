-- v4.2: Outreach Phase

-- Sequence templates (reusable, not lead-specific)
CREATE TABLE IF NOT EXISTS sequence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]',
  -- Each step: { id, type: 'email'|'delay'|'task'|'condition', subject?, bodyHtml?, delayDays?, taskTitle?, condition? }
  status TEXT DEFAULT 'active', -- active | archived
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments: link a lead to a sequence template
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES sequence_templates(id) ON DELETE SET NULL,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active | paused | completed | stopped | replied
  next_action_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  enrolled_by UUID,
  metadata JSONB DEFAULT '{}'
);

-- Email queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES sequence_enrollments(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  status TEXT DEFAULT 'pending', -- pending | sending | sent | failed | cancelled
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  gmail_message_id TEXT,
  gmail_thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_queue_workspace_status ON email_queue(workspace_id, status);
CREATE INDEX IF NOT EXISTS email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'pending';

-- Outreach settings (added to settings table)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS outreach_daily_quota INTEGER DEFAULT 50;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS outreach_window_start TEXT DEFAULT '09:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS outreach_window_end TEXT DEFAULT '18:00';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS outreach_window_days TEXT DEFAULT 'mon,tue,wed,thu,fri';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS outreach_warmup_delay INTEGER DEFAULT 30;

-- RLS
ALTER TABLE sequence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access sequence_templates" ON sequence_templates FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
CREATE POLICY "Workspace access sequence_enrollments" ON sequence_enrollments FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
CREATE POLICY "Workspace access email_queue" ON email_queue FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
