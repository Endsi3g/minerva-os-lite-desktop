-- Migration v2.99.0 — Fix workspace_id in team_members for accepted invitations
-- Run this in the Supabase SQL Editor

-- Patch team_members rows where workspace_id is NULL but status = 'active'
-- Sets workspace_id to the oldest workspace owned by workspace_owner_id
UPDATE public.team_members tm
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.owner_id = tm.workspace_owner_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE tm.workspace_id IS NULL
  AND tm.status = 'active'
  AND tm.member_user_id IS NOT NULL;

-- Also patch pending rows created via invite-link (before the fix)
UPDATE public.team_members tm
SET workspace_id = (
  SELECT w.id
  FROM public.workspaces w
  WHERE w.owner_id = tm.workspace_owner_id
  ORDER BY w.created_at ASC
  LIMIT 1
)
WHERE tm.workspace_id IS NULL
  AND tm.status = 'pending';
