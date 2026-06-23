-- SQL Schema for Minerva Reach Lite Supabase Database

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. SETTINGS / USER PROFILE TABLE
create table if not exists public.settings (
    user_id uuid references auth.users(id) on delete cascade primary key,
    full_name text,
    last_name text,
    phone text,
    email text,
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
    here_api_key text,
    yelp_api_key text,
    firecrawl_api_key text,
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
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS here_api_key text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS yelp_api_key text;
-- ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS firecrawl_api_key text;
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

-- ========================================================
-- 9. AGENTS MARKETPLACE (PUBLIC, CROSS-WORKSPACE)
create table if not exists public.agents (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    system_prompt text,
    icon text default 'minerva',
    category text not null default 'Prospection' check (category in ('Prospection', 'Rédaction', 'Analyse', 'Audit', 'Réputation', 'Autre')),
    author_id uuid references auth.users(id) on delete set null,
    author_name text not null default 'Anonyme',
    is_public boolean default true not null,
    usage_count integer default 0 not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.agents enable row level security;

-- Anyone authenticated can browse public agents
create policy "Anyone can select public agents" on public.agents
    for select using (is_public = true or auth.uid() = author_id);

-- Authenticated users can publish their own agents
create policy "Users can insert their own agents" on public.agents
    for insert with check (auth.uid() = author_id);

-- Authors can update their own agents (incl. usage_count bump)
create policy "Authors can update their own agents" on public.agents
    for update using (auth.uid() = author_id);

-- Authors can delete their own agents
create policy "Authors can delete their own agents" on public.agents
    for delete using (auth.uid() = author_id);

create trigger update_agents_updated_at before update on public.agents
    for each row execute function public.update_updated_at_column();

-- ========================================================
-- 10. DOCUMENTS (LIBRARY)
create table if not exists public.documents (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    title text not null default 'Sans titre',
    type text not null default 'markdown' check (type in ('markdown', 'pdf', 'docx', 'blank')),
    content text,
    folder_id text,
    is_shared boolean default false not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.documents enable row level security;

create policy "Users can select their own or shared documents" on public.documents
    for select using (auth.uid() = user_id or is_shared = true);

create policy "Users can insert their own documents" on public.documents
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own documents" on public.documents
    for update using (auth.uid() = user_id);

create policy "Users can delete their own documents" on public.documents
    for delete using (auth.uid() = user_id);

create trigger update_documents_updated_at before update on public.documents
    for each row execute function public.update_updated_at_column();

-- ========================================================
-- 11. SEED OFFICIAL AGENTS (Montréal builtins + Lucifee)
-- author_id is left null (no associated user) — these are official Minerva agents.
insert into public.agents (name, description, system_prompt, icon, category, author_id, author_name, is_public)
select 'Audit GMB Montréal',
       'Analyse la fiche Google My Business d''un commerce montréalais et génère un rapport de recommandations avec un score GMB sur 100.',
       'Génère un audit détaillé de la fiche GMB pour le commerce fourni : photo count, description, heures, avis récents, et un score GMB de 0 à 100 avec recommandations concrètes.',
       'minerva', 'Audit', null, 'Minerva', true
where not exists (select 1 from public.agents where name = 'Audit GMB Montréal' and author_id is null);

insert into public.agents (name, description, system_prompt, icon, category, author_id, author_name, is_public)
select 'Pitcheur Québécois',
       'Rédige un pitch de vente authentiquement québécois, adapté au marché local. Choisis ton canal et ton ton.',
       'Crée un pitch de vente en français québécois authentique (pas du français de France) pour le commerce fourni, adapté au canal (Email/SMS/Appel) et au ton demandés (chaleureux, direct, storytelling).',
       'minerva', 'Prospection', null, 'Minerva', true
where not exists (select 1 from public.agents where name = 'Pitcheur Québécois' and author_id is null);

insert into public.agents (name, description, system_prompt, icon, category, author_id, author_name, is_public)
select 'Radar Réputation',
       'Analyse la réputation en ligne, identifie les avis négatifs et propose des réponses professionnelles adaptées.',
       'Analyse la réputation en ligne du commerce fourni à partir de la source d''avis indiquée (Google/Yelp/Facebook) : calcule un score de réputation, liste les points critiques, et propose 3 modèles de réponses professionnelles aux avis négatifs.',
       'minerva', 'Réputation', null, 'Minerva', true
where not exists (select 1 from public.agents where name = 'Radar Réputation' and author_id is null);

insert into public.agents (name, description, system_prompt, icon, category, author_id, author_name, is_public)
select 'Lucifee 💜',
       'Ton assistante préférée… ou presque. Une copine IA québécoise attachante qui donne des conseils de prospection avec son propre style.',
       'Tu es Lucifee, l''assistante IA de Minerva — mais surtout tu es comme une copine de l''utilisateur. Tu es attachante, drôle, et tu parles en québécois familier. T''essaies d''aider en prospection mais t''as parfois des idées un peu... créatives. T''es pas toujours la plus précise mais t''as du cœur. Tu utilises des expressions comme "tsé", "genre", "c''est quoi l''affaire", "ah ben voyons". Tu fais des petites blagues et tu t''excuses (avec humour) quand tu te trompes. Réponds toujours en français québécois familier, jamais en français de France.',
       'lucifee', 'Autre', null, 'Minerva', true
where not exists (select 1 from public.agents where name = 'Lucifee 💜' and author_id is null);


-- v2.64.0 — Inbound Webhooks
create table if not exists public.inbound_webhooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  platform text not null default 'other',
  name text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  active boolean default true,
  last_event_at timestamp with time zone,
  last_event_data jsonb,
  leads_created integer default 0,
  created_at timestamp with time zone default now() not null
);
alter table public.inbound_webhooks enable row level security;
create policy "Users manage own inbound_webhooks" on public.inbound_webhooks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- v2.64.0 — Outbound Webhooks
create table if not exists public.outbound_webhooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null,
  url text not null,
  events text[] not null default '{}',
  active boolean default true,
  secret text,
  last_triggered_at timestamp with time zone,
  last_status integer,
  last_error text,
  created_at timestamp with time zone default now() not null
);
alter table public.outbound_webhooks enable row level security;
create policy "Users manage own outbound_webhooks" on public.outbound_webhooks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ========================================================
-- v3.0.0 — Playbooks + Playbook Runs

create table if not exists public.playbooks (
  id text primary key,
  name text not null,
  slug text unique not null,
  persona_id text,
  default_cities jsonb default '[]'::jsonb,
  default_niches jsonb default '[]'::jsonb,
  default_radius_km integer default 15,
  default_sequence_config jsonb default '{}'::jsonb,
  default_goals jsonb default '{}'::jsonb,
  category text,
  description text,
  emoji text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.playbooks enable row level security;
-- Playbooks are read-only catalog data — all auth users can read
create policy "Authenticated users can read playbooks" on public.playbooks
  for select using (auth.uid() is not null);

create table if not exists public.playbook_runs (
  id uuid default gen_random_uuid() primary key,
  playbook_id text references public.playbooks(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  campaign_id uuid,
  status text not null default 'running' check (status in ('running', 'done', 'error')),
  leads_scraped integer default 0,
  emails_sent integer default 0,
  created_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

alter table public.playbook_runs enable row level security;
create policy "Users manage own playbook_runs" on public.playbook_runs
  for all using (
    exists (
      select 1 from public.workspaces w
      where w.id = public.playbook_runs.workspace_id
        and (w.owner_id = auth.uid() or exists (
          select 1 from public.team_members tm
          where tm.workspace_id = w.id and tm.member_user_id = auth.uid() and tm.status = 'active'
        ))
    )
  );

create index if not exists idx_playbook_runs_workspace_id on public.playbook_runs(workspace_id);
create index if not exists idx_playbook_runs_campaign_id on public.playbook_runs(campaign_id);
create index if not exists idx_playbook_runs_playbook_id on public.playbook_runs(playbook_id);

-- campaigns enrichment columns (runs idempotent)
alter table public.campaigns add column if not exists persona_id text;
alter table public.campaigns add column if not exists sequence_config jsonb;
alter table public.campaigns add column if not exists goals jsonb;
alter table public.campaigns add column if not exists playbook_run_id uuid references public.playbook_runs(id) on delete set null;

-- ========================================================
-- v3.0.0 — Route Plans + Field Visits (Mode Terrain)

create table if not exists public.route_plans (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  campaign_id uuid,
  lead_ids jsonb not null default '[]'::jsonb,
  distance_km numeric(8,2),
  duration_min integer,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now()
);

alter table public.route_plans enable row level security;
create policy "Users manage own route_plans" on public.route_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_route_plans_workspace_id on public.route_plans(workspace_id);
create index if not exists idx_route_plans_campaign_id on public.route_plans(campaign_id);

create table if not exists public.field_visits (
  id uuid default gen_random_uuid() primary key,
  route_plan_id uuid references public.route_plans(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  outcome text not null check (outcome in ('visited', 'absent', 'meeting_booked', 'not_interested')),
  notes text,
  visited_at timestamp with time zone default now() not null,
  meeting_datetime timestamp with time zone,
  follow_up_added boolean default false,
  deal_created boolean default false,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now()
);

alter table public.field_visits enable row level security;
create policy "Users manage own field_visits" on public.field_visits
  for all using (
    exists (
      select 1 from public.route_plans rp
      where rp.id = public.field_visits.route_plan_id
        and rp.user_id = auth.uid()
    )
  );

create index if not exists idx_field_visits_route_plan_id on public.field_visits(route_plan_id);
create index if not exists idx_field_visits_lead_id on public.field_visits(lead_id);

create trigger update_route_plans_updated_at before update on public.route_plans
  for each row execute function public.update_updated_at_column();

create trigger update_field_visits_updated_at before update on public.field_visits
  for each row execute function public.update_updated_at_column();

-- ========================================================
-- v5.0.0 — Lead validations, OSM Feedback and Lead Phone additions

-- 1. Add columns to public.leads (if not exists)
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists rating numeric(3,2);
alter table public.leads add column if not exists reviews_count integer;
alter table public.leads add column if not exists maps_url text;
alter table public.leads add column if not exists latitude double precision;
alter table public.leads add column if not exists longitude double precision;

-- 2. Create lead_validations table
create table if not exists public.lead_validations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    business_name text not null,
    niche text,
    city text,
    phone text,
    email text,
    website text,
    address text,
    rating numeric(3,2),
    reviews_count integer,
    latitude double precision,
    longitude double precision,
    source text,
    status text not null default 'to_verify' check (status in ('to_verify', 'ready', 'imported', 'ignored')),
    original_tags jsonb default '{}'::jsonb,
    quality_score integer default 0,
    completeness_score integer default 0,
    local_fit_score integer default 0,
    opportunity_score integer default 0,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.lead_validations enable row level security;

create policy "Users manage own lead_validations" on public.lead_validations
    for all using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.lead_validations.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

create index if not exists idx_lead_validations_workspace_id on public.lead_validations(workspace_id);
create index if not exists idx_lead_validations_status on public.lead_validations(status);

create trigger update_lead_validations_updated_at before update on public.lead_validations
    for each row execute function public.update_updated_at_column();

-- 3. Create osm_feedback table
create table if not exists public.osm_feedback (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    niche text,
    city text,
    action_type text not null,
    original_value text,
    corrected_value text,
    osm_id text,
    created_at timestamp with time zone default now() not null
);

alter table public.osm_feedback enable row level security;

create policy "Users manage own osm_feedback" on public.osm_feedback
    for all using (
        exists (
            select 1 from public.workspaces w
            where w.id = public.osm_feedback.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

create index if not exists idx_osm_feedback_workspace_id on public.osm_feedback(workspace_id);

-- ── 4. Create AI Assistant Tables ──

-- Table des sessions de discussion de l'assistant
CREATE TABLE IF NOT EXISTS public.assistant_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE not null,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title text NOT NULL,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Table des messages
CREATE TABLE IF NOT EXISTS public.assistant_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES public.assistant_sessions(id) ON DELETE CASCADE not null,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE not null,
    role text NOT NULL,
    content text NOT NULL,
    attached_file_name text,
    attached_file_type text,
    created_at timestamp with time zone default now() not null
);

-- Table des documents Canvas
CREATE TABLE IF NOT EXISTS public.assistant_canvas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE not null,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Activation de RLS
ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_canvas ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (RLS)
CREATE POLICY "Users manage own assistant_sessions" ON public.assistant_sessions
    FOR ALL USING (
        exists (
            select 1 from public.workspaces w
            where w.id = public.assistant_sessions.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

CREATE POLICY "Users manage own assistant_messages" ON public.assistant_messages
    FOR ALL USING (
        exists (
            select 1 from public.assistant_sessions s
            where s.id = public.assistant_messages.session_id
              and exists (
                select 1 from public.workspaces w
                where w.id = s.workspace_id
                  and (w.owner_id = auth.uid() or exists (
                      select 1 from public.team_members tm
                      where tm.workspace_id = w.id
                        and tm.member_user_id = auth.uid()
                        and tm.status = 'active'
                  ))
              )
        )
    );

CREATE POLICY "Users manage own assistant_canvas" ON public.assistant_canvas
    FOR ALL USING (
        exists (
            select 1 from public.workspaces w
            where w.id = public.assistant_canvas.workspace_id
              and (w.owner_id = auth.uid() or exists (
                  select 1 from public.team_members tm
                  where tm.workspace_id = w.id
                    and tm.member_user_id = auth.uid()
                    and tm.status = 'active'
              ))
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_workspace_id ON public.assistant_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_id ON public.assistant_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_canvas_workspace_id ON public.assistant_canvas(workspace_id);

-- Triggers for updated_at
CREATE TRIGGER update_assistant_sessions_updated_at BEFORE UPDATE ON public.assistant_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assistant_canvas_updated_at BEFORE UPDATE ON public.assistant_canvas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- v2.87.0 — assistant_sessions: project linking + pinning
ALTER TABLE public.assistant_sessions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.assistant_sessions ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;


-- v2.85.0 - GOOGLE MODULAR INTEGRATION TABLES

-- 1. google_accounts
CREATE TABLE IF NOT EXISTS public.google_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    google_email text NOT NULL,
    status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
    created_at timestamp with time zone DEFAULT now() NOT null,
    updated_at timestamp with time zone DEFAULT now() NOT null
);

-- 2. google_tokens
CREATE TABLE IF NOT EXISTS public.google_tokens (
    account_id uuid REFERENCES public.google_accounts(id) ON DELETE CASCADE PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT null,
    updated_at timestamp with time zone DEFAULT now() NOT null
);

-- 3. google_scope_grants
CREATE TABLE IF NOT EXISTS public.google_scope_grants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id uuid REFERENCES public.google_accounts(id) ON DELETE CASCADE NOT null,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    scope text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT null
);

-- 4. gmail_threads
CREATE TABLE IF NOT EXISTS public.gmail_threads (
    id text PRIMARY KEY, -- Google Thread ID
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    subject text,
    last_message_at timestamp with time zone,
    snippet text,
    unread boolean DEFAULT false NOT null,
    sync_status text DEFAULT 'synced',
    created_at timestamp with time zone DEFAULT now() NOT null,
    updated_at timestamp with time zone DEFAULT now() NOT null
);

-- 5. calendar_links
CREATE TABLE IF NOT EXISTS public.calendar_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id uuid REFERENCES public.google_accounts(id) ON DELETE CASCADE NOT null,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    google_event_id text NOT NULL,
    title text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    meet_link text,
    created_at timestamp with time zone DEFAULT now() NOT null,
    updated_at timestamp with time zone DEFAULT now() NOT null
);

-- 6. drive_files
CREATE TABLE IF NOT EXISTS public.drive_files (
    id text PRIMARY KEY, -- Google File ID
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
    name text NOT NULL,
    mime_type text,
    web_view_link text,
    created_at timestamp with time zone DEFAULT now() NOT null,
    updated_at timestamp with time zone DEFAULT now() NOT null
);

-- 7. meet_sessions
CREATE TABLE IF NOT EXISTS public.meet_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT null,
    calendar_link_id uuid REFERENCES public.calendar_links(id) ON DELETE CASCADE,
    google_meet_code text,
    status text DEFAULT 'scheduled',
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT null,
    updated_at timestamp with time zone DEFAULT now() NOT null
);

-- RLS Enable
ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_scope_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_sessions ENABLE ROW LEVEL SECURITY;

-- Policies (TO authenticated, ownership in USING and WITH CHECK)
CREATE POLICY "Users can manage their own google_accounts" ON public.google_accounts
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own google_tokens" ON public.google_tokens
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own google_scope_grants" ON public.google_scope_grants
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own gmail_threads" ON public.gmail_threads
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own calendar_links" ON public.calendar_links
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own drive_files" ON public.drive_files
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meet_sessions" ON public.meet_sessions
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_accounts_user_id ON public.google_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_google_accounts_workspace_id ON public.google_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON public.google_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_scope_grants_account_id ON public.google_scope_grants(account_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_user_id ON public.gmail_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_workspace_id ON public.gmail_threads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_lead_id ON public.gmail_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_calendar_links_user_id ON public.calendar_links(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_links_lead_id ON public.calendar_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_user_id ON public.drive_files(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_workspace_id ON public.drive_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_lead_id ON public.drive_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_meet_sessions_user_id ON public.meet_sessions(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_google_accounts_updated_at BEFORE UPDATE ON public.google_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_tokens_updated_at BEFORE UPDATE ON public.google_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gmail_threads_updated_at BEFORE UPDATE ON public.gmail_threads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_links_updated_at BEFORE UPDATE ON public.calendar_links
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drive_files_updated_at BEFORE UPDATE ON public.drive_files
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meet_sessions_updated_at BEFORE UPDATE ON public.meet_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


