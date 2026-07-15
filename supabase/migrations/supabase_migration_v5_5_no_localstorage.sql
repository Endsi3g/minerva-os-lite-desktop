-- ============================================================
-- v5.5 — Zéro localStorage : migration données utilisateur
-- Toutes les données métier persistantes quittent localStorage
-- et rejoignent des colonnes JSONB dans les tables existantes.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- settings : budgets et objectifs d'acquisition
ALTER TABLE settings ADD COLUMN IF NOT EXISTS acquisition_budgets   JSONB DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS acquisition_goals     JSONB DEFAULT '{"leads":100,"clients":10,"revenue":50000}';

-- settings : sites sauvegardés par le Website Builder
ALTER TABLE settings ADD COLUMN IF NOT EXISTS saved_websites        JSONB DEFAULT '[]';

-- settings : préférences UI (rayon, densité, opacité grille)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS ui_preferences        JSONB DEFAULT '{"radius":"10px","density":"default","gridOpacity":100}';

-- settings : session et canvas actifs de l'assistant IA (par workspace)
-- Stocké comme objet JSON { workspaceId: sessionId } pour multi-workspace
ALTER TABLE settings ADD COLUMN IF NOT EXISTS active_ai_sessions    JSONB DEFAULT '{}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS active_canvases       JSONB DEFAULT '{}';

-- leads : livrables de rapports clients (sections de rapport par lead)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_livrables           JSONB DEFAULT '{}';

-- ai_agents : reviews par agent (ajout définitif — prévu en v2.30.0)
-- Vérifie d'abord que la table existe avant d'ajouter la colonne
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_agents') THEN
    ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS agent_reviews JSONB DEFAULT '[]';
  END IF;
END $$;
