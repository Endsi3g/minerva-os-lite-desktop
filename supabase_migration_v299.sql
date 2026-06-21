-- Migration v2.99.0 — Fix workspace access for invited members
-- Run this in the Supabase SQL Editor

-- 1. Add active_workspace_id to settings (persistent workspace preference, replaces localStorage)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS active_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 2. Patch team_members rows where workspace_id is NULL but status = 'active'
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

-- 3. Patch pending invite-link rows missing workspace_id
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

-- 4. Set active_workspace_id for existing active members to the MOST RECENTLY joined workspace
UPDATE public.settings s
SET active_workspace_id = (
  SELECT tm.workspace_id
  FROM public.team_members tm
  WHERE tm.member_user_id = s.user_id
    AND tm.status = 'active'
    AND tm.workspace_id IS NOT NULL
  ORDER BY tm.joined_at DESC
  LIMIT 1
)
WHERE s.active_workspace_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.member_user_id = s.user_id
      AND tm.status = 'active'
      AND tm.workspace_id IS NOT NULL
  );
