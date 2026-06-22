-- ============================================================
-- Minerva OS Lite — Migration v3.00.0 (Team Messages Fix)
-- Run this in Supabase SQL Editor (Settings → SQL Editor → New query)
-- All statements are idempotent (safe to run multiple times)
-- ============================================================

-- 1. Ensure required columns exist on public.team_messages
ALTER TABLE public.team_messages ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.team_messages ADD COLUMN IF NOT EXISTS sender_name text;
ALTER TABLE public.team_messages ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default now();

-- Update existing rows where sender_name or updated_at might be null (if any)
UPDATE public.team_messages SET sender_name = 'Système' WHERE sender_name IS NULL;
UPDATE public.team_messages SET updated_at = now() WHERE updated_at IS NULL;

-- Set constraints
ALTER TABLE public.team_messages ALTER COLUMN sender_name SET NOT NULL;
ALTER TABLE public.team_messages ALTER COLUMN updated_at SET NOT NULL;

-- 2. Drop deprecated policies to prevent duplicates/errors
DROP POLICY IF EXISTS "Team members can read messages" ON public.team_messages;
DROP POLICY IF EXISTS "Team members can insert messages" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_workspace" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_select" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;

-- 3. Create updated RLS policies based on active workspace membership
CREATE POLICY "team_messages_select"
    ON public.team_messages FOR SELECT
    TO authenticated
    USING (
        exists (
            select 1 from public.team_members tm
            where tm.workspace_id = team_messages.workspace_id
            and tm.member_user_id = auth.uid()
            and tm.status = 'active'
        )
        or exists (
            select 1 from public.workspaces w
            where w.id = team_messages.workspace_id
            and w.owner_id = auth.uid()
        )
    );

CREATE POLICY "team_messages_insert"
    ON public.team_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        exists (
            select 1 from public.team_members tm
            where tm.workspace_id = team_messages.workspace_id
            and tm.member_user_id = auth.uid()
            and tm.status = 'active'
        )
        or exists (
            select 1 from public.workspaces w
            where w.id = team_messages.workspace_id
            and w.owner_id = auth.uid()
        )
    );

-- 4. Enable Supabase Realtime for team_messages table
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'team_messages'
  ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
exception
  when others then
    raise notice 'Could not add team_messages to supabase_realtime publication';
end;
$$;
