-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- Si = 0 → STOP, ne pas lancer la migration.

-- v14.2 — Recherche web approfondie (enrichissement, phase 2) : quand
-- l'enrichissement standard ne trouve ni site ni téléphone, une recherche
-- web + IA tente de retrouver l'entreprise. Si la confiance de correspondance
-- n'est pas assez élevée pour appliquer les données automatiquement, elles
-- sont stockées ici comme suggestion à valider manuellement sur la fiche
-- lead (voir lib/enrichment-deep-search.ts, app/api/leads/enrich-batch).

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_review JSONB;

COMMENT ON COLUMN public.leads.enrichment_review IS 'Suggestion de recherche web approfondie en attente de validation : {confidence, reasoning, sourceUrl, candidate: {website, phone, address, socialLinks}, foundAt}';
