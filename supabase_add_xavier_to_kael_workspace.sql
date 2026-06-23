-- ============================================================
-- AJOUT DE XAVIER TARDIF AU WORKSPACE DE KAEL TEST
-- ============================================================
-- Owner (Kael Test)  : fc3c1083-e521-4e73-a746-d8504e862cf6
-- Membre (Xavier)    : 38921d03-6e0b-4208-b496-3f40850a1e52
-- ============================================================

-- ÉTAPE 0 : Vérifications préalables (exécuter séparément d'abord)
-- Vérifier que le workspace du owner existe
-- SELECT id, name FROM workspaces WHERE owner_id = 'fc3c1083-e521-4e73-a746-d8504e862cf6';

-- Vérifier si Xavier est déjà membre
-- SELECT * FROM team_members WHERE member_user_id = '38921d03-6e0b-4208-b496-3f40850a1e52';

-- ============================================================
-- ÉTAPE 1 : Insérer Xavier dans team_members du workspace Kael
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
  'fc3c1083-e521-4e73-a746-d8504e862cf6'::uuid  AS workspace_owner_id,
  w.id                                           AS workspace_id,
  '38921d03-6e0b-4208-b496-3f40850a1e52'::uuid  AS member_user_id,
  'xavier.tardif24@hotmail.com'                  AS email,
  'editor'                                       AS role,
  'active'                                       AS status,
  'fc3c1083-e521-4e73-a746-d8504e862cf6'::uuid  AS invited_by,
  now()                                          AS invited_at,
  now()                                          AS joined_at,
  'Business'                                     AS plan,
  0                                              AS usage_count
FROM public.workspaces w
WHERE w.owner_id = 'fc3c1083-e521-4e73-a746-d8504e862cf6'
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
WHERE tm.member_user_id = '38921d03-6e0b-4208-b496-3f40850a1e52';
