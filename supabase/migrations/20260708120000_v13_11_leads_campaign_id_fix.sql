-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration (sauf base neuve/dev)

-- v13.11 — Corrige une dérive de schéma supplémentaire, du même type que
-- v11.1 et v12.0 : `leads.campaign_id` est lu/écrit par tout le code (import
-- CRM, Playbook Wizard, campagnes/programmes de croissance) depuis des mois,
-- mais n'a jamais été appliqué en production — aucun fichier de migration ne
-- le créait. Confirmé par l'erreur "Could not find the 'campaign_id' column
-- of 'leads' in the schema cache" lors d'un test réel du 8 juillet 2026.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);

COMMENT ON COLUMN public.leads.campaign_id IS 'Campagne/programme principal du lead (relation 1-1) — distinct de growth_program_leads (multi-programme)';
