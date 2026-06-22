-- Migration v3.9.0 — Integrations: Slack + Notion columns in settings
-- Run in Supabase SQL editor

ALTER TABLE settings ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS notion_token TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS notion_database_id TEXT;
