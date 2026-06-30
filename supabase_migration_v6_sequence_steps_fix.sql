-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM workspaces;
-- SELECT COUNT(*) FROM email_sequence_steps;
-- Si un compte = 0 sur leads/workspaces → STOP

-- ─────────────────────────────────────────────────────────────────────────────
-- v6 — Fix email_sequence_steps : ajout colonnes manquantes
-- Erreurs observées en prod: "column email_sequence_steps.status does not exist"
--                            "column email_sequence_steps.subject does not exist"
--
-- La table existe mais a été créée avant la migration v296 qui ajoutait ces colonnes.
-- ALTER TABLE ADD COLUMN IF NOT EXISTS est idempotent et non-destructif.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT '';

ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped'));

ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;

ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS error_message text;

-- Index pour accélérer les requêtes du cron (filtre sur status='pending')
CREATE INDEX IF NOT EXISTS idx_ess_status ON public.email_sequence_steps (status);
CREATE INDEX IF NOT EXISTS idx_ess_sequence_id ON public.email_sequence_steps (sequence_id);

-- Vérification finale (doit retourner les colonnes ajoutées)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'email_sequence_steps'
-- ORDER BY ordinal_position;
