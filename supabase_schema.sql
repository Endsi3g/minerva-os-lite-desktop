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
    joined_at timestamp with time zone
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
-- ========================================================
