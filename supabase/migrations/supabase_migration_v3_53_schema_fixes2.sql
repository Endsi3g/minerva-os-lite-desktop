-- ============================================================
-- Minerva OS Lite — Migration v3.53 (Schema mismatch fixes #2)
-- Erreurs production observées :
--   column email_sequence_steps.status does not exist
--   column email_sequence_steps.subject does not exist
--   column leads.reply_detected_at does not exist
--   column leads_1.name does not exist   ← corrigé côté code (business_name)
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM email_sequence_steps;
-- Si un compte = 0 → STOP, vérifier que la bonne DB est ciblée
-- ============================================================

-- ── 1. leads — colonnes de tracking réponses ────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_detected_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reply_status       TEXT DEFAULT 'none';

-- Index pour les filtres fréquents
CREATE INDEX IF NOT EXISTS idx_leads_reply_detected
  ON leads (reply_detected_at) WHERE reply_detected_at IS NOT NULL;

-- ── 2. email_sequence_steps — colonnes manquantes ───────────────────────────
-- La table existe avec une structure minimale, colonnes métier absentes.
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS subject       TEXT;
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS body          TEXT;
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS status        TEXT    DEFAULT 'pending';
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS delay_days    INTEGER DEFAULT 0;
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS step_number   INTEGER DEFAULT 1;
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS scheduled_at  TIMESTAMPTZ;
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ;
ALTER TABLE email_sequence_steps ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Normalise les lignes existantes sans statut
UPDATE email_sequence_steps
  SET status = 'pending'
  WHERE status IS NULL;

-- Index pour le cron (filtre status=pending + scheduled_at lte now)
CREATE INDEX IF NOT EXISTS idx_email_seq_steps_pending
  ON email_sequence_steps (scheduled_at ASC)
  WHERE status = 'pending';

-- ============================================================
-- DONE. Vérification post-migration :
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'leads' AND column_name = 'reply_detected_at';
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'email_sequence_steps' AND column_name = 'status';
-- ============================================================
