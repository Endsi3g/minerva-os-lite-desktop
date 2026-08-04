-- Correction: la première version de cette migration (supabase_migration_preferred_channel.sql)
-- a été appliquée avec DEFAULT 'cold_call', ce qui a donné à CHAQUE lead existant une
-- "préférence" que personne n'a réellement choisie. Ce correctif :
--   1. retire le DEFAULT (le champ doit rester NULL tant qu'un humain ne l'a pas réglé)
--   2. remet à NULL les lignes qui ont 'cold_call' aujourd'hui — aucun chemin de code
--      n'écrit encore cette colonne intentionnellement, donc 100% de ces valeurs
--      viennent du DEFAULT buggé, pas d'un vrai choix utilisateur
--   3. ajoute la contrainte CHECK qui manquait (valeurs autorisées uniquement)
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier le nombre avant de continuer)
-- SELECT COUNT(*) FROM leads WHERE preferred_channel = 'cold_call';

ALTER TABLE leads ALTER COLUMN preferred_channel DROP DEFAULT;

UPDATE leads SET preferred_channel = NULL WHERE preferred_channel = 'cold_call';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_preferred_channel_check;
ALTER TABLE leads ADD CONSTRAINT leads_preferred_channel_check
  CHECK (preferred_channel IS NULL OR preferred_channel IN ('sms', 'cold_call', 'instagram_dm'));
