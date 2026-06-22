-- ============================================================
-- Minerva OS Lite — Migration v3.6.0 (Phase 6: Behavioral Intelligence)
-- Run in Supabase SQL Editor. Idempotent.
-- ============================================================

-- Toggles for behavioral intelligence (weekly insights + Today action suggestions)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS auto_insights boolean DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS auto_follow_ups boolean DEFAULT false;
