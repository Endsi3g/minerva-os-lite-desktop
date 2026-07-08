-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION BUNDLE — Minerva OS — 8 juillet 2026
--
-- Bundle de TOUTES les migrations connues comme non appliquées à la
-- production, en un seul script à exécuter dans l'éditeur SQL Supabase.
-- Chaque bloc est idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT
-- EXISTS / DROP POLICY IF EXISTS + CREATE POLICY) — le réexécuter sur une
-- base qui a déjà reçu une partie de ces changements ne fait rien de plus
-- sur les colonnes/tables déjà présentes, aucun risque de double-application.
--
-- Contenu, dans l'ordre :
--   1. v12.0  — dérive de schéma historique (leads/email_sequences/campaigns/settings)
--   2. v11.1  — dérive de schéma (leads.last_activity_at/deal_probability/deal_closing_date)
--   3. v5.1   — table ai_gateway_logs (observabilité IA)
--   4. v5     — outreach (drafts/sequence_enrollments/campaigns/leads/gmail_threads/agent_actions)
--   5. v13.6  — lead_validations.maps_url + leads.address/notes (garde-fou)
--   6. v13.7  — workspaces.custom_columns
--   7. v13.8  — notifications d'erreurs cliquables
--   8. v13.9  — édition/suppression des messages d'équipe
--   9. v13.10 — Programmes de croissance Phase 1 (goal_type/target_value + growth_program_leads)
--  10. v13.11 — CORRECTIF CRITIQUE : leads.campaign_id (cassait l'import CRM)
--  11. v13.12 — tasks.lead_id (lien agenda ↔ lead)
--  12. v13.13 — Autopilot par programme (campaigns.autopilot_*)
--  13. v14.1  — Packs de plateforme (workspaces.enabled_packs)
--  14. v14.2  — Recherche web approfondie pour l'enrichissement (leads.enrichment_review)
--
-- PRE-MIGRATION CHECK (exécuter séparément avant tout le reste, noter les
-- comptes — si un seul est à 0, STOP, ne pas lancer ce script)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- SELECT COUNT(*) FROM campaigns;
-- SELECT COUNT(*) FROM notifications;
-- SELECT COUNT(*) FROM settings;
-- SELECT COUNT(*) FROM team_messages;
-- ═══════════════════════════════════════════════════════════════════════════


-- ── 1. v12.0 — dérive de schéma historique ──────────────────────────────────
-- (supabase/migrations/20260705232011_v12_schema_drift_fix.sql)

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_place_data jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_enriched_at timestamp with time zone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS gmail_thread_id text;

ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_sequence_steps' AND column_name = 'email_sequence_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_sequence_steps' AND column_name = 'sequence_id'
  ) THEN
    ALTER TABLE public.email_sequence_steps RENAME COLUMN email_sequence_id TO sequence_id;
  END IF;
END $$;
ALTER TABLE public.email_sequence_steps ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Email'::text;

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_niche text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_city text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS firecrawl_api_key text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS firecrawl_api_key_masked text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_instructions_about text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_instructions_model text;


-- ── 2. v11.1 — dérive de schéma (leads) ─────────────────────────────────────
-- (supabase/migrations/supabase_migration_v11_1_leads_schema_drift.sql)

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_probability INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_closing_date DATE;


-- ── 3. v5.1 — ai_gateway_logs (observabilité IA) ────────────────────────────
-- (supabase_migration_v5_1_ai_gateway_logs.sql)

CREATE TABLE IF NOT EXISTS ai_gateway_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_logs_user_id ON ai_gateway_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_logs_created_at ON ai_gateway_logs (created_at DESC);

ALTER TABLE ai_gateway_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_gateway_logs user access" ON ai_gateway_logs;
CREATE POLICY "ai_gateway_logs user access" ON ai_gateway_logs FOR ALL
  USING (user_id = auth.uid());


-- ── 4. v5 — outreach (drafts/sequence_enrollments/campaigns/leads/...) ─────
-- (supabase/migrations/supabase_migration_v5_outreach.sql)

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS source         TEXT    DEFAULT 'user';
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMPTZ;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS intent_type   TEXT;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS approved      BOOLEAN;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;

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

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_sent       INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_opens      INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_replies    INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS positive_replies INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meetings_booked  INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS alert            TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_reply_intent TEXT;

ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS reply_intent  TEXT;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS intent_confidence INTEGER;
ALTER TABLE gmail_threads ADD COLUMN IF NOT EXISTS next_action  TEXT;

ALTER TABLE agent_actions ADD COLUMN IF NOT EXISTS outreach_type TEXT;


-- ── 5. v13.6 — lead_validations.maps_url + garde-fous leads ────────────────
-- (supabase/migrations/20260708000000_v13_6_lead_validations_maps_url.sql)

ALTER TABLE public.lead_validations ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;


-- ── 6. v13.7 — workspaces.custom_columns ────────────────────────────────────
-- (supabase/migrations/20260709000000_v13_7_workspace_custom_columns.sql)

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '[]'::jsonb;


-- ── 7. v13.8 — notifications d'erreurs applicatives cliquables ─────────────
-- (supabase/migrations/20260709010000_v13_8_app_error_notifications.sql)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS error_detail JSONB;

CREATE TABLE IF NOT EXISTS public.app_error_notifications (
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_signature   TEXT NOT NULL,
  last_notified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, error_signature)
);

ALTER TABLE public.app_error_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_error_notifications self access" ON public.app_error_notifications;
CREATE POLICY "app_error_notifications self access" ON public.app_error_notifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "app_error_notifications service write" ON public.app_error_notifications;
CREATE POLICY "app_error_notifications service write" ON public.app_error_notifications FOR ALL
  USING (true) WITH CHECK (true);


-- ── 8. v13.9 — édition/suppression des messages d'équipe ────────────────────
-- (supabase/migrations/20260709020000_v13_9_team_messages_edit_delete.sql)

ALTER TABLE public.team_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "team_messages_update" ON public.team_messages;
CREATE POLICY "team_messages_update"
    ON public.team_messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;
CREATE POLICY "team_messages_delete"
    ON public.team_messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());


-- ── 9. v13.10 — Programmes de croissance, Phase 1 ───────────────────────────
-- (supabase/migrations/20260709030000_v13_10_growth_programs.sql)

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_value NUMERIC;

DO $$ BEGIN
  ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_goal_type_check
    CHECK (goal_type IS NULL OR goal_type IN ('rdv', 'clients', 'mrr'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.growth_program_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_program_leads_campaign ON public.growth_program_leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_growth_program_leads_lead ON public.growth_program_leads (lead_id);
CREATE INDEX IF NOT EXISTS idx_growth_program_leads_workspace ON public.growth_program_leads (workspace_id);

ALTER TABLE public.growth_program_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "growth_program_leads workspace access" ON public.growth_program_leads;
CREATE POLICY "growth_program_leads workspace access" ON public.growth_program_leads FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM public.team_members WHERE member_user_id = auth.uid()
    )
  );


-- ── 10. v13.11 — CORRECTIF CRITIQUE : leads.campaign_id ─────────────────────
-- (supabase/migrations/20260708120000_v13_11_leads_campaign_id_fix.sql)
-- Cassait l'import CRM ("Could not find the 'campaign_id' column of 'leads'
-- in the schema cache") — jamais appliqué en prod malgré des mois d'usage.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);


-- ── 11. v13.12 — tasks.lead_id (lien agenda ↔ lead) ─────────────────────────
-- (supabase/migrations/20260708130000_v13_12_tasks_lead_id.sql)

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON public.tasks(lead_id);


-- ── 12. v13.13 — Autopilot par programme de croissance ──────────────────────
-- (supabase/migrations/20260708140000_v13_13_autopilot.sql)

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_daily_email_cap INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_weekly_meeting_cap INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_paused_reason TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS autopilot_paused_at TIMESTAMPTZ;


-- ── 13. v14.1 — Packs de plateforme par workspace ───────────────────────────
-- (supabase/migrations/20260708150000_v14_1_workspace_packs.sql)

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS enabled_packs JSONB DEFAULT '["acquisition","outreach","field","analytics_growth"]'::jsonb;


-- ── 14. v14.2 — Recherche web approfondie pour l'enrichissement ────────────
-- (supabase/migrations/20260708220000_v14_2_enrichment_review.sql)

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_review JSONB;


-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DU BUNDLE — vérification rapide après exécution :
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'campaign_id';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns' AND column_name = 'goal_type';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'lead_id';
-- ═══════════════════════════════════════════════════════════════════════════
