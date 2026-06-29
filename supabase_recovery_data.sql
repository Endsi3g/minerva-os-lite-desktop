-- ============================================================
-- SCRIPT DE RÉCUPÉRATION — Minerva OS
-- Exécuter REQUÊTE PAR REQUÊTE dans le SQL Editor Supabase
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- ÉTAPE 1 : Voir TOUS tes leads (sans filtre workspace)
-- → Confirme que tes données existent encore
-- ═══════════════════════════════════════════════════════════
SELECT
  id,
  business_name,
  status,
  workspace_id,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════
-- ÉTAPE 2 : Voir tous tes workspaces + nombre de leads
-- → Identifie lequel contient tes données
-- ═══════════════════════════════════════════════════════════
SELECT
  w.id                        AS workspace_id,
  w.name                      AS workspace_name,
  w.owner_id,
  COUNT(DISTINCT l.id)        AS leads_count,
  COUNT(DISTINCT tm.id)       AS team_members_count,
  w.created_at
FROM workspaces w
LEFT JOIN leads        l  ON l.workspace_id = w.id
LEFT JOIN team_members tm ON tm.workspace_id = w.id
GROUP BY w.id, w.name, w.owner_id, w.created_at
ORDER BY leads_count DESC;

-- ═══════════════════════════════════════════════════════════
-- ÉTAPE 3 : Voir ton active_workspace_id actuel
-- ═══════════════════════════════════════════════════════════
SELECT
  user_id,
  full_name,
  company_name,
  active_workspace_id
FROM settings
WHERE user_id = auth.uid();

-- ═══════════════════════════════════════════════════════════
-- ÉTAPE 4 : CORRIGER — remplace 'WORKSPACE_ID_ICI' par l'ID
-- du workspace qui a le plus de leads (trouvé à l'étape 2)
-- ═══════════════════════════════════════════════════════════

-- UPDATE settings
-- SET active_workspace_id = 'WORKSPACE_ID_ICI'
-- WHERE user_id = auth.uid();

-- ═══════════════════════════════════════════════════════════
-- ÉTAPE 5 : Voir tous les membres d'équipe
-- ═══════════════════════════════════════════════════════════
SELECT
  tm.id,
  tm.email,
  tm.role,
  tm.workspace_id,
  w.name AS workspace_name
FROM team_members tm
LEFT JOIN workspaces w ON w.id = tm.workspace_id
ORDER BY tm.id;
