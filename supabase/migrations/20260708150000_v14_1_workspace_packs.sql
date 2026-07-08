-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration (sauf base neuve/dev)

-- v14.1 — Packs de plateforme (PRD v12, Sprint 1) : un workspace peut
-- activer/désactiver des capacités (Acquisition, Outreach, Terrain,
-- Analytics & Growth) qui contrôlent la visibilité des items de la
-- sidebar. Tout est activé par défaut — aucune régression pour les
-- workspaces existants tant que personne ne désactive rien explicitement
-- depuis /platform.

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS enabled_packs JSONB DEFAULT '["acquisition","outreach","field","analytics_growth"]'::jsonb;

COMMENT ON COLUMN public.workspaces.enabled_packs IS 'Packs de plateforme activés (acquisition/outreach/field/analytics_growth) — contrôle la visibilité de la sidebar, voir lib/packs.ts';
