-- v13.9 — Autorise l'édition et la suppression de ses propres messages d'équipe.
--
-- team_messages n'avait que des policies SELECT et INSERT (supabase_migration_v300.sql)
-- — UPDATE/DELETE étaient donc implicitement refusés par RLS pour tout le monde,
-- ce qui bloquait la fonctionnalité "modifier/supprimer un message" au niveau base
-- de données même si l'UI l'autorisait.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM team_messages;
-- Si = 0 → STOP, ne pas lancer la migration.

-- Marqueur explicite d'édition — plus fiable qu'une comparaison created_at/updated_at,
-- qui dérive de quelques millisecondes dès l'insertion (updated_at a un DEFAULT now()
-- côté DB pendant que created_at est fourni par le client) et afficherait "(modifié)"
-- sur des messages jamais édités.
ALTER TABLE public.team_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE;

DROP POLICY IF EXISTS "team_messages_update" ON public.team_messages;
CREATE POLICY "team_messages_update"
    ON public.team_messages FOR UPDATE
    TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;
CREATE POLICY "team_messages_delete"
    ON public.team_messages FOR DELETE
    TO authenticated
    USING (sender_id = auth.uid());
