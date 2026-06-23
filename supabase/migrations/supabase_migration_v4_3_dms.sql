-- v4.3.0 — Team DMs: add recipient_id to team_messages
-- NULL = group chat, UUID = DM recipient

ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS team_messages_dm_idx
  ON team_messages(workspace_id, sender_id, recipient_id)
  WHERE recipient_id IS NOT NULL;
