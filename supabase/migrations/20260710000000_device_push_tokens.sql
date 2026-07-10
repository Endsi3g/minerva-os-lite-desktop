-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- Native (Capacitor iOS/Android) push notification device tokens — FCM/APNs, distinct
-- from the browser Web Push `push_subscriptions` table. One row per (user, device token).
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON device_push_tokens (user_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own device push tokens" ON device_push_tokens;
CREATE POLICY "Users can manage own device push tokens"
  ON device_push_tokens FOR ALL
  USING (auth.uid() = user_id);

COMMENT ON TABLE device_push_tokens IS 'Native FCM/APNs device tokens for Capacitor mobile push notifications, one row per device.';
