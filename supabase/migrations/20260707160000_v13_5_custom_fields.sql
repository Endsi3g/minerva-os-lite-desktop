-- Migration to add custom_fields JSONB column to the public.leads table for arbitrary user-defined metadata.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
