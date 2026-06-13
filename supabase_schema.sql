-- SQL Schema for Minerva Reach Lite Supabase Database

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. SETTINGS / USER PROFILE TABLE
create table if not exists public.settings (
    user_id uuid references auth.users(id) on delete cascade primary key,
    full_name text,
    company_name text,
    timezone text default 'Europe/Paris',
    niches text[] default '{}',
    cities text[] default '{}',
    ai_tone text default 'Calme & Professionnel',
    ai_density text default 'Standard',
    quick_note text default 'Notes rapides : Penser à cibler les commerces de la rue de la République la semaine prochaine. L''approche ''SEO Local inexistant'' fonctionne très bien.',
    focus_title text default 'Objectif principal du jour',
    focus_items text[] default array[
        'Finaliser l''onboarding technique du Cabinet Dentaire Dr. Laurent (contrat signé)',
        'Contacter Jean Dupont (Boulangerie L''Épi d''Or) pour bloquer la date de démonstration',
        'Finaliser et envoyer l''audit SEO pour Michel Martin (Garage du Centre)'
    ],
    google_access_token text,
    google_refresh_token text,
    google_token_expires_at timestamp with time zone,
    google_email text,
    apify_token text,
    ai_provider text default 'anthropic',
    openrouter_key text,
    ai_model text default 'meta-llama/llama-3-8b-instruct:free',
    language text default 'fr',
    default_model text default 'None',
    default_image_model text default 'None',
    chat_capabilities text[] default array['web_search', 'image_generation', 'data_analyst', 'canvas'],
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- 2. LEADS TABLE
create table if not exists public.leads (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    business_name text not null,
    contact_name text,
    contact_email text,
    niche text,
    city text,
    source text,
    status text not null default 'New' check (status in ('New', 'Contacted', 'Meeting Booked', 'Won', 'Lost')),
    temperature text not null default 'Warm' check (temperature in ('Hot', 'Warm', 'Cold')),
    next_action text,
    next_action_date date,
    owner text default 'Moi',
    image_url text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- 3. NOTES TABLE
create table if not exists public.notes (
    id uuid default gen_random_uuid() primary key,
    lead_id uuid references public.leads(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null default 'general' check (type in ('visit', 'call', 'email', 'general')),
    content text not null,
    created_at timestamp with time zone default now() not null
);

-- 4. DRAFTS TABLE
create table if not exists public.drafts (
    id uuid default gen_random_uuid() primary key,
    lead_id uuid references public.leads(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    channel text not null default 'Email' check (channel in ('Email', 'DM', 'Call')),
    tone text,
    content text not null,
    status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Archived')),
    created_at timestamp with time zone default now() not null
);

-- 5. TASKS TABLE
create table if not exists public.tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    completed boolean default false not null,
    category text not null default 'General' check (category in ('Follow-up', 'Preparation', 'General', 'Meeting')),
    due_date date,
    created_at timestamp with time zone default now() not null
);

-- 6. AI SUGGESTIONS TABLE (for dynamic recommendations)
create table if not exists public.ai_suggestions (
    id uuid default gen_random_uuid() primary key,
    lead_id uuid references public.leads(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    action_text text not null,
    suggested_channel text not null default 'Email' check (suggested_channel in ('Email', 'DM', 'Call')),
    reasoning text,
    draft_prompt text,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS (Row Level Security) on all tables
alter table public.settings enable row level security;
alter table public.leads enable row level security;
alter table public.notes enable row level security;
alter table public.drafts enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_suggestions enable row level security;

-- Create Security Policies for Settings
create policy "Users can select their own settings" on public.settings
    for select using (auth.uid() = user_id);

create policy "Users can insert their own settings" on public.settings
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own settings" on public.settings
    for update using (auth.uid() = user_id);

create policy "Users can delete their own settings" on public.settings
    for delete using (auth.uid() = user_id);

-- Create Security Policies for Leads
create policy "Users can select their own leads" on public.leads
    for select using (auth.uid() = user_id);

create policy "Users can insert their own leads" on public.leads
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own leads" on public.leads
    for update using (auth.uid() = user_id);

create policy "Users can delete their own leads" on public.leads
    for delete using (auth.uid() = user_id);

-- Create Security Policies for Notes
create policy "Users can select their own notes" on public.notes
    for select using (auth.uid() = user_id);

create policy "Users can insert their own notes" on public.notes
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own notes" on public.notes
    for update using (auth.uid() = user_id);

create policy "Users can delete their own notes" on public.notes
    for delete using (auth.uid() = user_id);

-- Create Security Policies for Drafts
create policy "Users can select their own drafts" on public.drafts
    for select using (auth.uid() = user_id);

create policy "Users can insert their own drafts" on public.drafts
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own drafts" on public.drafts
    for update using (auth.uid() = user_id);

create policy "Users can delete their own drafts" on public.drafts
    for delete using (auth.uid() = user_id);

-- Create Security Policies for Tasks
create policy "Users can select their own tasks" on public.tasks
    for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks" on public.tasks
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on public.tasks
    for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on public.tasks
    for delete using (auth.uid() = user_id);

-- Create Security Policies for AI Suggestions
create policy "Users can select their own suggestions" on public.ai_suggestions
    for select using (auth.uid() = user_id);

create policy "Users can insert their own suggestions" on public.ai_suggestions
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own suggestions" on public.ai_suggestions
    for update using (auth.uid() = user_id);

create policy "Users can delete their own suggestions" on public.ai_suggestions
    for delete using (auth.uid() = user_id);

-- Create or Replace update_updated_at_column function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Set up triggers for updated_at
create trigger update_settings_updated_at before update on public.settings
    for each row execute function public.update_updated_at_column();

create trigger update_leads_updated_at before update on public.leads
    for each row execute function public.update_updated_at_column();

-- ========================================================
-- 7. TEAM MEMBERS TABLE
-- Stores workspace members and pending invitations
create table if not exists public.team_members (
    id uuid default gen_random_uuid() primary key,
    workspace_owner_id uuid references auth.users(id) on delete cascade not null,
    member_user_id uuid references auth.users(id) on delete set null,
    email text not null,
    role text not null default 'editor' check (role in ('admin', 'editor', 'viewer')),
    status text not null default 'pending' check (status in ('pending', 'active')),
    invited_by uuid references auth.users(id) on delete set null,
    invited_at timestamp with time zone default now() not null,
    joined_at timestamp with time zone,
    plan text not null default 'Business',
    usage_count integer not null default 0
);

-- Unique constraint: one record per email per workspace
create unique index if not exists team_members_workspace_email_idx
    on public.team_members (workspace_owner_id, email);

-- Enable RLS
alter table public.team_members enable row level security;

-- Workspace owner can see all members of their workspace
create policy "Owner can select team members" on public.team_members
    for select using (auth.uid() = workspace_owner_id);

-- Members can see the workspace they belong to
create policy "Members can see their own membership" on public.team_members
    for select using (auth.uid() = member_user_id);

-- Owner can insert team members
create policy "Owner can insert team members" on public.team_members
    for insert with check (auth.uid() = workspace_owner_id);

-- Owner can update team members (role changes)
create policy "Owner can update team members" on public.team_members
    for update using (auth.uid() = workspace_owner_id);

-- Owner can delete team members
create policy "Owner can delete team members" on public.team_members
    for delete using (auth.uid() = workspace_owner_id);

-- ========================================================
-- MIGRATION FOR EXISTING DATABASES
-- Run this if your settings table already exists:
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_access_token text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_refresh_token text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_token_expires_at timestamp with time zone;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_email text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS apify_token text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'anthropic';
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS openrouter_key text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'meta-llama/llama-3-8b-instruct:free';
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS language text DEFAULT 'fr';
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS default_model text DEFAULT 'None';
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS default_image_model text DEFAULT 'None';
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS chat_capabilities text[] DEFAULT ARRAY['web_search', 'image_generation', 'data_analyst', 'canvas'];
--
-- Run this if your team_members table already exists:
-- ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'Business';
-- ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;
--
-- Run this to update your existing leads table:
-- ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS image_url text;
-- ========================================================

-- ========================================================
-- 8. WORKSPACES SYSTEM (LANGDOCK STYLE)
-- Stores multiple workspaces for users
create table if not exists public.workspaces (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    owner_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.workspaces enable row level security;

-- Policies for workspaces
create policy "Users can select workspaces they own or belong to" on public.workspaces
    for select using (
        auth.uid() = owner_id 
        or exists (
            select 1 from public.team_members tm 
            where tm.workspace_id = public.workspaces.id 
              and tm.member_user_id = auth.uid() 
              and tm.status = 'active'
        )
    );

create policy "Users can insert workspaces they own" on public.workspaces
    for insert with check (auth.uid() = owner_id);

create policy "Users can update workspaces they own" on public.workspaces
    for update using (auth.uid() = owner_id);

create policy "Users can delete workspaces they own" on public.workspaces
    for delete using (auth.uid() = owner_id);

-- Add workspace_id fields to existing tables
alter table public.team_members add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.leads add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.tasks add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.notes add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.drafts add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.ai_suggestions add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Trigger logic to automatically create a default workspace when settings is created
create or replace function public.handle_default_workspace()
returns trigger as $$
declare
    default_ws_id uuid;
begin
    -- Create default workspace matching company name or owner email
    insert into public.workspaces (name, owner_id)
    values (coalesce(new.company_name, 'Mon Espace'), new.user_id)
    returning id into default_ws_id;

    -- Update existing records if they have null workspace_id
    update public.team_members set workspace_id = default_ws_id where workspace_owner_id = new.user_id and workspace_id is null;
    update public.leads set workspace_id = default_ws_id where user_id = new.user_id and workspace_id is null;
    update public.tasks set workspace_id = default_ws_id where user_id = new.user_id and workspace_id is null;
    
    return new;
end;
$$ language plpgsql;

drop trigger if exists settings_default_workspace on public.settings;
create trigger settings_default_workspace
    after insert on public.settings
    for each row execute function public.handle_default_workspace();

-- Migrate existing users to have a default workspace
do $$
declare
    r record;
    default_ws_id uuid;
begin
    for r in select user_id, company_name from public.settings loop
        if not exists (select 1 from public.workspaces where owner_id = r.user_id) then
            insert into public.workspaces (name, owner_id)
            values (coalesce(r.company_name, 'Mon Espace'), r.user_id)
            returning id into default_ws_id;

            update public.team_members set workspace_id = default_ws_id where workspace_owner_id = r.user_id and workspace_id is null;
            update public.leads set workspace_id = default_ws_id where user_id = r.user_id and workspace_id is null;
            update public.tasks set workspace_id = default_ws_id where user_id = r.user_id and workspace_id is null;
        end if;
    end loop;
end;
$$;

-- Update row level security policies for all tables to verify member_user_id and workspace ownership
-- Leads policies
drop policy if exists "Users can select their own leads" on public.leads;
create policy "Users and team members can select leads" on public.leads
    for select using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.leads.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

drop policy if exists "Users can insert their own leads" on public.leads;
create policy "Users and team members can insert leads" on public.leads
    for insert with check (
        exists (
            select 1 from public.workspaces w
            where w.id = workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

drop policy if exists "Users can update their own leads" on public.leads;
create policy "Users and team members can update leads" on public.leads
    for update using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.leads.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

drop policy if exists "Users can delete their own leads" on public.leads;
create policy "Users and team members can delete leads" on public.leads
    for delete using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.leads.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

-- Tasks policies
drop policy if exists "Users can select their own tasks" on public.tasks;
create policy "Users and team members can select tasks" on public.tasks
    for select using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.tasks.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

drop policy if exists "Users can insert their own tasks" on public.tasks;
create policy "Users and team members can insert tasks" on public.tasks
    for insert with check (
        exists (
            select 1 from public.workspaces w
            where w.id = workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users and team members can update tasks" on public.tasks
    for update using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.tasks.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users and team members can delete tasks" on public.tasks
    for delete using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.tasks.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

-- Settings read access for members
drop policy if exists "Users can select their own settings" on public.settings;
create policy "Users and team members can select settings" on public.settings
    for select using (
        auth.uid() = user_id 
        or exists (
            select 1 from public.workspaces w
            where w.owner_id = public.settings.user_id
              and exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              )
        )
    );

