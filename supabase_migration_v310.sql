-- ============================================================
-- Minerva OS Lite — Migration v3.1.0 (Phase 1: Field visit context)
-- Run in Supabase SQL Editor. Idempotent (safe to run multiple times).
-- ============================================================

-- Richer field-visit context: who was met, perceived interest, and a photo proof.
ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS contact_met text;
ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS interest_level text;
ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS proof_image text;
