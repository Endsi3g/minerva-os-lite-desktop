-- Migration to add custom_columns JSONB column to public.workspaces table
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS custom_columns JSONB DEFAULT '[]'::jsonb;
