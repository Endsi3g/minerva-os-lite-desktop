-- v14.5 — Fix: le partage/assignation de leads à l'équipe ne fonctionnait pas.
-- La policy RLS UPDATE sur public.leads était restée bloquée sur "auth.uid() = user_id"
-- (jamais migrée vers le pattern workspace_id canonique), donc quand un membre de
-- l'équipe essayait d'assigner un lead qui ne lui appartenait pas (assigned_to = un
-- collègue ou '__team__'), Postgres RLS rejetait silencieusement la ligne : aucune
-- erreur remontée côté client, mais 0 ligne réellement mise à jour en base.
--
-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

-- Anciennes policies (owner-only ou jamais confirmées en prod) à remplacer
DROP POLICY IF EXISTS "Users can select their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users and team members can select leads" ON public.leads;
DROP POLICY IF EXISTS "Users and team members can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users and team members can update leads" ON public.leads;
DROP POLICY IF EXISTS "Users and team members can delete leads" ON public.leads;
DROP POLICY IF EXISTS "leads_workspace_access" ON public.leads;

CREATE POLICY "leads_workspace_access" ON public.leads FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
