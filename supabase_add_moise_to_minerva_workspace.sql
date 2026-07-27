-- ============================================================
-- AJOUT DE MOÏSE RAYMOND AU WORKSPACE "Minerva"
-- ============================================================
-- Owner (workspace Minerva) : bc7cbda5-dd0f-4ca6-9381-0fb0b8bd2c31 (quebecsaas@gmail.com)
-- Membre (Moïse Raymond)    : 7034f54d-e1e3-46d3-b3f3-92e335711dc6 (mosesshifts@gmail.com)
-- ============================================================

-- PRE-MIGRATION CHECK (exécuter séparément, vérifier > 0 avant de continuer)
-- SELECT COUNT(*) FROM public.team_members;
-- SELECT COUNT(*) FROM public.workspaces;

-- ============================================================
-- ÉTAPE 1 : Insérer Moïse dans team_members du workspace Minerva
-- (ON CONFLICT = mise à jour si la ligne existait déjà)
-- ============================================================
INSERT INTO public.team_members (
  workspace_owner_id,
  workspace_id,
  member_user_id,
  email,
  role,
  status,
  invited_by,
  invited_at,
  joined_at,
  plan,
  usage_count
)
SELECT
  'bc7cbda5-dd0f-4ca6-9381-0fb0b8bd2c31'::uuid  AS workspace_owner_id,
  w.id                                           AS workspace_id,
  '7034f54d-e1e3-46d3-b3f3-92e335711dc6'::uuid  AS member_user_id,
  'mosesshifts@gmail.com'                        AS email,
  'editor'                                       AS role,
  'active'                                       AS status,
  'bc7cbda5-dd0f-4ca6-9381-0fb0b8bd2c31'::uuid  AS invited_by,
  now()                                          AS invited_at,
  now()                                          AS joined_at,
  'Business'                                     AS plan,
  0                                              AS usage_count
FROM public.workspaces w
WHERE w.owner_id = 'bc7cbda5-dd0f-4ca6-9381-0fb0b8bd2c31'
LIMIT 1
ON CONFLICT (workspace_owner_id, email)
DO UPDATE SET
  member_user_id = EXCLUDED.member_user_id,
  workspace_id   = EXCLUDED.workspace_id,
  status         = 'active',
  joined_at      = now();

-- ============================================================
-- ÉTAPE 2 : Vérification post-insertion
-- ============================================================
SELECT
  tm.id,
  tm.email,
  tm.role,
  tm.status,
  tm.joined_at,
  w.name  AS workspace_name,
  w.owner_id
FROM public.team_members tm
JOIN public.workspaces w ON w.id = tm.workspace_id
WHERE tm.member_user_id = '7034f54d-e1e3-46d3-b3f3-92e335711dc6';
