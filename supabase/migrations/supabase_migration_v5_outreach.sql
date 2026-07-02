-- PRE-MIGRATION CHECK
-- SELECT COUNT(*) FROM leads;       -- > 0
-- SELECT COUNT(*) FROM workspaces;  -- > 0

-- ── drafts : colonne source pour attribution agent ──────────────────────────
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS source         TEXT    DEFAULT 'user';
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMPTZ;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS intent_type   TEXT; -- 'follow_up'|'introduction'|'closing'|'reactivation'
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS approved      BOOLEAN;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;

-- ── sequence_enrollments : gestion état complet ──────────────────────────────
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS current_step  INTEGER     DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS next_send_at  TIMESTAMPTZ;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS paused_at     TIMESTAMPTZ;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS paused_reason TEXT;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS total_opens   INTEGER DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS total_replies INTEGER DEFAULT 0;
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS last_sent_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_seq_enroll_status    ON sequence_enrollments(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_seq_enroll_lead      ON sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_seq_enroll_next_send ON sequence_enrollments(next_send_at) WHERE status = 'active';

-- ── campaigns : colonne stats synthèse ──────────────────────────────────────
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_sent       INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_opens      INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_replies    INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS positive_replies INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meetings_booked  INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS alert            TEXT;   -- alerte de perf

-- ── leads : colonne outreach_tags ────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_reply_intent TEXT; -- 'interested'|'not_interested'|'scheduling'|'info_request'|'other'

-- ── gmail_threads : stocker l'intent classifié ──────────────────────────────
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS reply_intent  TEXT;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS intent_confidence INTEGER;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS next_action  TEXT;

-- ── agent_actions : colonne outreach_type pour autonomie granulaire ──────────
ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS outreach_type TEXT;
-- valeurs: 'draft'|'initial_send'|'followup'|'reply'|'sequence_pause'|'pipeline_update'

-- ── settings : autonomie outreach granulaire ─────────────────────────────────
-- Déjà dans agent_autonomy JSONB — ajout de clés sans migration de colonnes
-- Les clés outreach_draft/outreach_initial_send/etc. sont dans le JSON existant
