-- v14.8 — Stats de performance d'appels.
--
-- Contexte : la page "Appels" (route_plans/field_visits channel='call') affiche
-- déjà le résultat (outcome) de chaque appel mais rien qui permette de suivre la
-- performance dans le temps : qui appelle, combien de temps, quel taux de
-- contact/RDV. On ajoute 2 colonnes à field_visits pour permettre un dashboard
-- de stats (page /calls) et un leaderboard par membre d'équipe :
--   - user_id : qui a enregistré ce résultat d'appel (pour le classement équipe)
--   - call_duration_seconds : durée mesurée côté client entre le clic sur
--     "Démarrer l'appel" et la confirmation du résultat
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM field_visits;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER;

DO $$ BEGIN
  ALTER TABLE public.field_visits ADD CONSTRAINT field_visits_call_duration_seconds_check
    CHECK (call_duration_seconds IS NULL OR call_duration_seconds >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_field_visits_user_id ON public.field_visits (user_id);
-- Sert la requête de stats : field_visits WHERE workspace_id = ? AND channel = 'call' [AND visited_at >= ?]
CREATE INDEX IF NOT EXISTS idx_field_visits_workspace_channel_visited ON public.field_visits (workspace_id, channel, visited_at);

-- Vérification post-migration
-- SELECT user_id, count(*), avg(call_duration_seconds) FROM field_visits WHERE channel = 'call' GROUP BY user_id;
