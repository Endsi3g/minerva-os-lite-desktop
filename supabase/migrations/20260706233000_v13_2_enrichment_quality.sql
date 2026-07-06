-- v13.2 — Phase 4 de l'initiative "Fiabilité IA & Prospection en masse" : colonnes
-- d'enrichissement calculées par enrich-contact mais jamais persistées (ou jamais
-- suivies en migration — decision_maker_role notamment, dont l'absence probable
-- faisait échouer silencieusement tout le reste de l'UPDATE sur cette ligne).
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- Si = 0 → STOP, ne pas lancer la migration.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS decision_maker_role TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_vibe TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS decision_maker_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS suggested_emails JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_completeness INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_sufficient BOOLEAN DEFAULT FALSE;
