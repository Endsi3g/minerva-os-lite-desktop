-- ============================================================
-- Minerva OS Lite — Migration v3.13.0 (Skills persistence in Supabase)
-- Run in Supabase SQL Editor. Idempotent.
-- ============================================================

create table if not exists public.workspace_skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid not null default auth.uid(),
  skill_id text not null,
  name text,
  description text,
  instructions text,
  is_custom boolean default false,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, workspace_id, skill_id)
);

alter table public.workspace_skills enable row level security;

-- Each user manages their own skill rows (per workspace)
drop policy if exists "workspace_skills_own" on public.workspace_skills;
create policy "workspace_skills_own"
  on public.workspace_skills for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_workspace_skills_user_ws
  on public.workspace_skills (user_id, workspace_id);
