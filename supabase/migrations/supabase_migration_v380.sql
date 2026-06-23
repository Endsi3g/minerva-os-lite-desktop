-- ============================================================
-- Minerva OS Lite — Migration v3.19.0 (Skills shared by workspace)
-- Run in Supabase SQL Editor. Idempotent.
-- ============================================================

-- Allow any active member (or owner) of a workspace to read/write the workspace's
-- shared skills (in addition to the per-user fallback policy).
drop policy if exists "workspace_skills_ws" on public.workspace_skills;
create policy "workspace_skills_ws"
  on public.workspace_skills for all
  to authenticated
  using (
    exists (select 1 from public.workspaces w
            where w.id = workspace_skills.workspace_id and w.owner_id = auth.uid())
    or exists (select 1 from public.team_members tm
            where tm.workspace_id = workspace_skills.workspace_id
              and tm.member_user_id = auth.uid() and tm.status = 'active')
  )
  with check (
    exists (select 1 from public.workspaces w
            where w.id = workspace_skills.workspace_id and w.owner_id = auth.uid())
    or exists (select 1 from public.team_members tm
            where tm.workspace_id = workspace_skills.workspace_id
              and tm.member_user_id = auth.uid() and tm.status = 'active')
  );

-- Shared uniqueness: one row per (workspace, skill) instead of per (user, workspace, skill).
alter table public.workspace_skills drop constraint if exists workspace_skills_user_id_workspace_id_skill_id_key;
create unique index if not exists workspace_skills_ws_skill_uniq
  on public.workspace_skills (workspace_id, skill_id);
