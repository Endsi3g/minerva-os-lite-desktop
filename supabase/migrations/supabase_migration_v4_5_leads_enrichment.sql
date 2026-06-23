-- ============================================================
-- Migration v4.5 — Leads enrichment columns + lead_shares fixes
-- Run in Supabase SQL Editor — all statements are idempotent
-- ============================================================

-- PRE-MIGRATION CHECK (run separately, verify > 0 before continuing)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;

-- ────────────────────────────────────────────────────────────
-- 1. LEADS — add missing enrichment columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reviews_count  INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS maps_url       TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS photos         JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS social_links   JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS latitude       DOUBLE PRECISION;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS longitude      DOUBLE PRECISION;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_icp      INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_engagement INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_urgence  INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_revenu   INTEGER;

-- ────────────────────────────────────────────────────────────
-- 2. LEAD_SHARES — ensure table exists with correct structure
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_shares (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id      UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  share_token  TEXT        NOT NULL UNIQUE,
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.lead_shares ENABLE ROW LEVEL SECURITY;

-- User can manage their own shares
DROP POLICY IF EXISTS "User can manage own lead shares" ON public.lead_shares;
CREATE POLICY "User can manage own lead shares"
  ON public.lead_shares FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Anyone with a valid token can read unexpired shares (used by share-preview API via service_role)
DROP POLICY IF EXISTS "Public can read lead shares" ON public.lead_shares;
CREATE POLICY "Public can read lead shares"
  ON public.lead_shares FOR SELECT
  USING (expires_at > NOW());

-- ────────────────────────────────────────────────────────────
-- 3. GRANT access to lead_shares for authenticated users
-- ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_shares TO authenticated;
GRANT SELECT ON public.lead_shares TO anon;
