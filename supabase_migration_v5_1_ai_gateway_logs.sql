-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;         -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

CREATE TABLE IF NOT EXISTS ai_gateway_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  input_tokens INTEGER,
  output_tokens INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_logs_user_id ON ai_gateway_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_g ateway_logs_created_at ON ai_gateway_logs (created_at DESC);

ALTER TABLE ai_gateway_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_gateway_logs user access" ON ai_gateway_logs;
CREATE POLICY "ai_gateway_logs user access" ON ai_gateway_logs FOR ALL
  USING (user_id = auth.uid());
