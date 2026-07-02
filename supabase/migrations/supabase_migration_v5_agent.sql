-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;        -- noter le nombre
-- SELECT COUNT(*) FROM workspaces;   -- noter le nombre
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- ── agent_memory : mémoire persistante de l'agent par workspace ──────────────
CREATE TABLE IF NOT EXISTS agent_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  type          TEXT NOT NULL, -- 'learning', 'niche_summary', 'campaign_stat', 'decision_log'
  key           TEXT NOT NULL, -- identifiant sémantique (ex: 'niche:boulangerie')
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, type, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_workspace ON agent_memory (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type      ON agent_memory (workspace_id, type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_updated   ON agent_memory (updated_at DESC);

-- RLS
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_memory workspace access" ON agent_memory;
CREATE POLICY "agent_memory workspace access" ON agent_memory FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── agent_actions : journal des actions exécutées ou suggérées ───────────────
CREATE TABLE IF NOT EXISTS agent_actions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL,
  user_id        UUID,
  action_type    TEXT NOT NULL, -- 'create_task', 'update_pipeline_stage', etc.
  lead_id        UUID,
  reasoning      TEXT,          -- "Pourquoi j'ai pris cette décision"
  data_signals   TEXT,          -- "Signaux utilisés : score 82, 9 jours sans contact"
  result         JSONB DEFAULT '{}',
  autonomy_level TEXT DEFAULT 'suggest',
  executed       BOOLEAN DEFAULT FALSE,
  suggested      BOOLEAN DEFAULT TRUE,
  approved       BOOLEAN,       -- NULL = pas encore reviewé, TRUE/FALSE = décision user
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_workspace ON agent_actions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created   ON agent_actions (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_lead      ON agent_actions (lead_id) WHERE lead_id IS NOT NULL;

-- RLS
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_actions workspace access" ON agent_actions;
CREATE POLICY "agent_actions workspace access" ON agent_actions FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── settings : ajout colonnes agent ─────────────────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agent_autonomy JSONB DEFAULT '{"tasks":"suggest","pipeline":"suggest","sequences":"off","emails":"prepare","field":"suggest"}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS agent_enabled  BOOLEAN DEFAULT TRUE;

-- ── ai_gateway_logs : table de logs IA (si pas encore créée) ────────────────
CREATE TABLE IF NOT EXISTS ai_gateway_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  provider    TEXT NOT NULL,
  model       TEXT NOT NULL,
  latency_ms  INTEGER,
  success     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_gateway_logs_user    ON ai_gateway_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_logs_created ON ai_gateway_logs (created_at DESC);

-- RLS (lecture uniquement par l'owner)
ALTER TABLE ai_gateway_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_gateway_logs self access" ON ai_gateway_logs;
CREATE POLICY "ai_gateway_logs self access" ON ai_gateway_logs FOR SELECT
  USING (user_id = auth.uid());

-- Service role peut insérer (pour le logging server-side)
DROP POLICY IF EXISTS "ai_gateway_logs service insert" ON ai_gateway_logs;
CREATE POLICY "ai_gateway_logs service insert" ON ai_gateway_logs FOR INSERT
  WITH CHECK (true);

-- ── sequence_enrollments (si pas encore créée) ──────────────────────────────
CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  lead_id       UUID NOT NULL,
  sequence_id   UUID NOT NULL,
  status        TEXT DEFAULT 'active',
  enrolled_by   TEXT DEFAULT 'user',
  enrolled_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lead_id, sequence_id)
);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sequence_enrollments workspace access" ON sequence_enrollments;
CREATE POLICY "sequence_enrollments workspace access" ON sequence_enrollments FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
