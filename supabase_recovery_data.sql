-- ============================================================
-- SCRIPT DE RÉCUPÉRATION DE DONNÉES — Minerva OS
-- Exécuter dans l'éditeur SQL Supabase (onglet SQL Editor)
-- ÉTAPE 1 : Diagnostic — trouve où sont tes données
-- ============================================================

-- 1A. Tous tes workspaces + nombre de leads dans chacun
SELECT
  w.id                         AS workspace_id,
  w.name                       AS workspace_name,
  w.owner_id,
  COUNT(DISTINCT l.id)         AS leads_count,
  COUNT(DISTINCT tm.id)        AS team_members_count,
  COUNT(DISTINCT t.id)         AS tasks_count,
  w.created_at
FROM workspaces w
LEFT JOIN leads         l  ON l.workspace_id  = w.id
LEFT JOIN team_members  tm ON tm.workspace_id = w.id
LEFT JOIN tasks         t  ON t.workspace_id  = w.id
GROUP BY w.id, w.name, w.owner_id, w.created_at
ORDER BY leads_count DESC;

-- ============================================================
-- ÉTAPE 2 : Vérifie ton active_workspace_id dans settings
-- ============================================================

SELECT
  user_id,
  full_name,
  company_name,
  active_workspace_id,
  workspace_id
FROM settings
WHERE user_id = auth.uid();

-- ============================================================
-- ÉTAPE 3 (SI NÉCESSAIRE) : Corriger le workspace actif
-- Remplace 'WORKSPACE_ID_AVEC_TES_LEADS' par l'ID trouvé
-- à l'étape 1A (celui qui a le plus de leads)
-- ============================================================

-- UPDATE settings
-- SET active_workspace_id = 'WORKSPACE_ID_AVEC_TES_LEADS'
-- WHERE user_id = auth.uid();

-- ============================================================
-- ÉTAPE 4 : Vérifie que tes leads sont bien là
-- ============================================================

SELECT
  id,
  business_name,
  status,
  workspace_id,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- ÉTAPE 5 : Vérifie les membres d'équipe
-- ============================================================

SELECT
  tm.id,
  tm.email,
  tm.role,
  tm.workspace_id,
  w.name AS workspace_name
FROM team_members tm
LEFT JOIN workspaces w ON w.id = tm.workspace_id
ORDER BY tm.created_at DESC;
