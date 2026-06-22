-- Phase 25: push_subscriptions table for Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Enable realtime on tables that don't have it yet
ALTER TABLE leads REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;

COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions per user';
