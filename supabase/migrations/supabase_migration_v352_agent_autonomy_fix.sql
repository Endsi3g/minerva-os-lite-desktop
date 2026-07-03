-- PRE-MIGRATION CHECK (run separately before applying)
-- SELECT COUNT(*) FROM settings;  -- must be > 0

-- Fix agent autonomy defaults so the agent actually executes actions.
-- Previous default was {"tasks":"suggest",...} which caused canExecute() to
-- always return false and the agent to only suggest, never act.

-- Ensure all autonomy keys exist with actionable defaults for new rows
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS agent_autonomy JSONB
  DEFAULT '{"tasks":"auto","pipeline":"act_with_approval","sequences":"off","outreach_draft":"prepare","outreach_followup":"auto","outreach_initial_send":"prepare","field":"suggest"}';

-- Update existing rows that still have the old all-suggest default
UPDATE settings
SET agent_autonomy = agent_autonomy
  || '{"tasks":"auto","outreach_followup":"auto"}'::jsonb
WHERE agent_autonomy IS NOT NULL
  AND agent_autonomy->>'tasks' = 'suggest';

-- Ensure agent_enabled defaults to true
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT TRUE;

-- Set enabled for any rows where it wasn't set
UPDATE settings
SET agent_enabled = TRUE
WHERE agent_enabled IS NULL;
