-- v12.0 — Corrige la dérive de schéma accumulée depuis plusieurs mois : le code
-- interroge des colonnes qui n'ont jamais été appliquées en production (les ~47
-- fichiers supabase_migration_v*.sql historiques n'étaient pas suivis par le CLI
-- Supabase — aucune table supabase_migrations.schema_migrations n'existait).
--
-- Diagnostic établi en comparant un pg_dump --schema-only de la prod avec les
-- requêtes réelles du code (pas les fichiers de migration historiques, qui ne
-- reflètent pas forcément ce qui a été exécuté). Chaque bloc ci-dessous cible
-- une colonne précise qui manque et qui provoque une erreur 42703 en prod.
--
-- PRE-MIGRATION CHECK (exécuté séparément avant d'appliquer — voir scripts/pre-migration-check.js)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

-- ── leads : enrichissement Google Places + suivi Gmail (déjà utilisés par le code) ──
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_place_data jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_enriched_at timestamp with time zone;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS gmail_thread_id text;

-- ── email_sequences : le code attend workspace_id/lead_id/status/created_at/updated_at ──
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.email_sequences ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- ── email_sequence_steps : la colonne existante s'appelle email_sequence_id, mais
-- TOUT le code (app/api/email-sequences, app/api/agent/sequences/create,
-- app/api/route-plans/visits, app/api/cron/email-sequences, today-stats-card)
-- utilise sequence_id. Renommage pur (aucune perte de données, contrainte NOT
-- NULL et FK conservées) plutôt que d'ajouter une colonne dupliquée en conflit
-- avec le NOT NULL existant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_sequence_steps' AND column_name = 'email_sequence_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_sequence_steps' AND column_name = 'sequence_id'
  ) THEN
    ALTER TABLE public.email_sequence_steps RENAME COLUMN email_sequence_id TO sequence_id;
  END IF;
END $$;
ALTER TABLE public.email_sequence_steps ADD COLUMN IF NOT EXISTS channel text DEFAULT 'Email'::text;

-- ── campaigns : app/api/outreach/campaigns attend ces colonnes en plus des
-- colonnes niches/cities (multi-niche) déjà en place ──
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_niche text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS target_city text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sequence_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS created_by uuid;

-- ── settings : clé Firecrawl + personnalisation des instructions IA ──
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS firecrawl_api_key text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS firecrawl_api_key_masked text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_instructions_about text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_instructions_model text;
