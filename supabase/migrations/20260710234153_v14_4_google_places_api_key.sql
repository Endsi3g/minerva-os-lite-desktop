-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration

-- v14.4 — Clé Google Places API configurable par utilisateur (Paramètres >
-- Intégrations), même pattern que here_api_key / yelp_api_key /
-- firecrawl_api_key : GOOGLE_PLACES_API_KEY (env serveur) reste un défaut
-- global de secours, cette colonne permet à chaque utilisateur d'utiliser sa
-- propre clé sans dépendre de la configuration du déploiement.
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_places_api_key text;
