-- v12.0 — Vraie détection des appareils/sessions connectés (Paramètres >
-- Sécurité affichait une seule session factice dérivée de navigator.userAgent
-- côté client, incapable de détecter un second appareil réellement connecté).
-- auth.sessions existe déjà nativement dans Supabase Auth (user_agent, ip,
-- created_at, refreshed_at) ; ces fonctions l'exposent en toute sécurité —
-- SECURITY DEFINER pour lire le schéma auth normalement non exposé via
-- PostgREST, mais filtré strictement sur auth.uid() pour qu'un utilisateur ne
-- puisse jamais voir/révoquer les sessions de quelqu'un d'autre.
--
-- PRE-MIGRATION CHECK (exécuté séparément avant d'appliquer)
-- SELECT COUNT(*) FROM leads;
-- SELECT COUNT(*) FROM team_members;
-- SELECT COUNT(*) FROM workspaces;
-- Si un compte = 0 → STOP, ne pas lancer la migration.

CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  refreshed_at timestamp,
  user_agent text,
  ip text,
  not_after timestamptz,
  is_current boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.created_at,
    s.refreshed_at,
    s.user_agent,
    s.ip::text,
    s.not_after,
    (s.id::text = (auth.jwt() ->> 'session_id')) AS is_current
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.refreshed_at DESC NULLS LAST, s.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_my_session(target_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth.sessions WHERE id = target_session_id AND user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated;
