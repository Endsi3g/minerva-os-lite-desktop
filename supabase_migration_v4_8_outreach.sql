-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM settings;
-- Si un compte = 0 → STOP

-- v4.8 — Machine Outreach Automatisée: leverage library, voicemail queue, settings outreach

-- ── 1. Leverage Library (bibliothèque de preuves sociales) ──────────────────
CREATE TABLE IF NOT EXISTS leverage_library (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  title        text NOT NULL,
  niche_target text DEFAULT '',          -- niche cible (ex: "Restaurant", "Coiffeur", "PME")
  results_headline text DEFAULT '',      -- headline résultat (ex: "+30 rdv en 21 jours")
  email_snippet    text DEFAULT '',      -- snippet texte à insérer dans l'email
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE leverage_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leverage_library_workspace_access" ON leverage_library;
CREATE POLICY "leverage_library_workspace_access" ON leverage_library FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── 2. Voicemail Queue ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voicemail_queue (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid NOT NULL,
  lead_id         uuid REFERENCES leads(id) ON DELETE SET NULL,
  script          text NOT NULL,
  phone           text,
  status          text DEFAULT 'pending',  -- pending | sent | failed | cancelled
  drop_cowboy_id  text,
  scheduled_at    timestamptz DEFAULT now(),
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE voicemail_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voicemail_queue_workspace_access" ON voicemail_queue;
CREATE POLICY "voicemail_queue_workspace_access" ON voicemail_queue FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );

-- ── 3. Settings: colonnes outreach intégrations ──────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smartlead_api_key        text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smartlead_campaign_id    text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS drop_cowboy_username     text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS drop_cowboy_api_key      text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_inbox_auto_reply      boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_inbox_confidence_min  integer DEFAULT 80;

-- ── 4. sequence_templates: score_min threshold ────────────────────────────────
ALTER TABLE sequence_templates ADD COLUMN IF NOT EXISTS score_min integer DEFAULT 0;
ALTER TABLE sequence_templates ADD COLUMN IF NOT EXISTS channels  text[] DEFAULT ARRAY['email'];
