-- ============================================================
-- Minerva OS Lite — Migration v2.96.0
-- Run this in Supabase SQL Editor (Settings → SQL Editor → New query)
-- All statements are idempotent (safe to run multiple times)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SETTINGS — add missing columns
-- ────────────────────────────────────────────────────────────
alter table public.settings add column if not exists custom_instructions_about text;
alter table public.settings add column if not exists custom_instructions_model text;
alter table public.settings add column if not exists todoist_token text;
alter table public.settings add column if not exists daily_email_limit integer not null default 50;
alter table public.settings add column if not exists firecrawl_api_key text;

-- ────────────────────────────────────────────────────────────
-- 2. LEADS — add missing columns
-- ────────────────────────────────────────────────────────────
alter table public.leads add column if not exists gmail_thread_id text;
alter table public.leads add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.leads add column if not exists score integer;
alter table public.leads add column if not exists rating numeric;
alter table public.leads add column if not exists phone text;
alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists lat double precision;
alter table public.leads add column if not exists lng double precision;
alter table public.leads add column if not exists sync_status text not null default 'synced';
alter table public.leads add column if not exists pipeline_stage text;
alter table public.leads add column if not exists pipeline_probability integer;
alter table public.leads add column if not exists deal_value numeric;

-- ────────────────────────────────────────────────────────────
-- 3. TEAM_MEMBERS — add missing columns (created_at alias & tokens)
-- ────────────────────────────────────────────────────────────
alter table public.team_members add column if not exists invite_token text;
alter table public.team_members add column if not exists custom_role_id uuid;
-- Note: team_members uses invited_at (not created_at). The API routes have been
-- updated to use invited_at for ordering.

-- ────────────────────────────────────────────────────────────
-- 4. EMAIL SEQUENCES — create tables if missing
-- ────────────────────────────────────────────────────────────
create table if not exists public.email_sequences (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    workspace_id uuid references public.workspaces(id) on delete cascade,
    lead_id uuid references public.leads(id) on delete cascade,
    lead_name text,
    lead_email text not null,
    name text not null,
    status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.email_sequence_steps (
    id uuid default gen_random_uuid() primary key,
    sequence_id uuid references public.email_sequences(id) on delete cascade not null,
    step_number integer not null,
    delay_days integer not null default 0,
    subject text not null,
    body text not null,
    status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.email_sequences enable row level security;
alter table public.email_sequence_steps enable row level security;

-- RLS policies for email_sequences
create policy "User can manage own sequences"
    on public.email_sequences for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- RLS policies for email_sequence_steps (via parent sequence)
create policy "User can manage own sequence steps"
    on public.email_sequence_steps for all
    using (
        exists (
            select 1 from public.email_sequences es
            where es.id = email_sequence_steps.sequence_id
            and es.user_id = auth.uid()
        )
    );

-- ────────────────────────────────────────────────────────────
-- 5. WORKSPACE_ROLES — create table for custom roles (v2.96.0)
-- ────────────────────────────────────────────────────────────
create table if not exists public.workspace_roles (
    id uuid default gen_random_uuid() primary key,
    workspace_owner_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    color text not null default '#6366f1',
    permissions text[] not null default '{}',
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.workspace_roles enable row level security;

create policy "Owner can manage workspace roles"
    on public.workspace_roles for all
    using (auth.uid() = workspace_owner_id)
    with check (auth.uid() = workspace_owner_id);

-- ────────────────────────────────────────────────────────────
-- 6. LEAD_SHARES — create table for public lead sharing
-- ────────────────────────────────────────────────────────────
create table if not exists public.lead_shares (
    id uuid default gen_random_uuid() primary key,
    lead_id uuid references public.leads(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    token text not null unique,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone default now() not null
);

alter table public.lead_shares enable row level security;

create policy "User can manage own lead shares"
    on public.lead_shares for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Public can read lead shares"
    on public.lead_shares for select
    using (expires_at > now());

-- ────────────────────────────────────────────────────────────
-- 7. TEAM_MESSAGES — create table for in-app team chat
-- ────────────────────────────────────────────────────────────
create table if not exists public.team_messages (
    id uuid default gen_random_uuid() primary key,
    workspace_owner_id uuid references auth.users(id) on delete cascade not null,
    sender_id uuid references auth.users(id) on delete cascade not null,
    sender_name text not null,
    content text not null,
    created_at timestamp with time zone default now() not null
);

alter table public.team_messages enable row level security;

create policy "Team members can read messages"
    on public.team_messages for select
    using (
        auth.uid() = workspace_owner_id
        or exists (
            select 1 from public.team_members tm
            where tm.workspace_owner_id = team_messages.workspace_owner_id
            and tm.member_user_id = auth.uid()
            and tm.status = 'active'
        )
    );

create policy "Team members can insert messages"
    on public.team_messages for insert
    with check (
        auth.uid() = workspace_owner_id
        or exists (
            select 1 from public.team_members tm
            where tm.workspace_owner_id = team_messages.workspace_owner_id
            and tm.member_user_id = auth.uid()
            and tm.status = 'active'
        )
    );

-- ────────────────────────────────────────────────────────────
-- 8. BOOKING_SLOTS — for scheduling / booking links (v2.97)
-- ────────────────────────────────────────────────────────────
create table if not exists public.booking_settings (
    user_id uuid references auth.users(id) on delete cascade primary key,
    username text unique,
    title text not null default 'Réservez un appel',
    description text,
    duration_minutes integer not null default 30,
    buffer_minutes integer not null default 15,
    availability jsonb,
    timezone text not null default 'Europe/Paris',
    google_calendar_id text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.booking_settings enable row level security;

create policy "User can manage own booking settings"
    on public.booking_settings for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Public can read booking settings"
    on public.booking_settings for select
    using (true);

create table if not exists public.booking_appointments (
    id uuid default gen_random_uuid() primary key,
    host_user_id uuid references auth.users(id) on delete cascade not null,
    guest_name text not null,
    guest_email text not null,
    guest_notes text,
    start_at timestamp with time zone not null,
    end_at timestamp with time zone not null,
    google_event_id text,
    status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'rescheduled')),
    created_at timestamp with time zone default now() not null
);

alter table public.booking_appointments enable row level security;

create policy "Host can manage own appointments"
    on public.booking_appointments for all
    using (auth.uid() = host_user_id)
    with check (auth.uid() = host_user_id);

create policy "Public can insert appointments"
    on public.booking_appointments for insert
    with check (true);

-- ────────────────────────────────────────────────────────────
-- Done. Run this script once in Supabase SQL Editor.
-- ────────────────────────────────────────────────────────────
