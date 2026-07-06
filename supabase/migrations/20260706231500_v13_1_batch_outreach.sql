-- v13.1 — Phase 3 de l'initiative "Fiabilité IA & Prospection en masse" : colonnes
-- nécessaires au pipeline d'envoi en batch (opt-in auto-draft + message d'erreur
-- visible quand un brouillon approuvé ne peut pas être mis en file d'envoi).
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM settings;
-- SELECT COUNT(*) FROM drafts;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS batch_outreach_auto_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE public.drafts ADD COLUMN IF NOT EXISTS error TEXT;
