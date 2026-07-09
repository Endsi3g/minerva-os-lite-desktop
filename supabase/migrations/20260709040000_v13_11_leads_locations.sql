-- Migration: Add locations column to leads table to support multiple locations
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS locations jsonb DEFAULT '[]'::jsonb;
