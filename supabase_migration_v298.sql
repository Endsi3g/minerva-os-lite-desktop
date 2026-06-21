-- ============================================================
-- Minerva OS Lite — Migration v2.98.0
-- Run this in Supabase SQL Editor (Settings → SQL Editor → New query)
-- All statements are idempotent (safe to run multiple times)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EMAIL TEMPLATES — versioned template library with A/B tests
-- ────────────────────────────────────────────────────────────
create table if not exists public.email_templates (
    id uuid default gen_random_uuid() primary key,
    workspace_id uuid not null,
    user_id uuid references auth.users(id) on delete cascade,
    name text not null,
    subject text not null,
    body text not null default '',
    tags text[] default '{}',
    is_ab boolean not null default false,
    variant_b_subject text,
    variant_b_body text,
    sends integer not null default 0,
    opens integer not null default 0,
    clicks integer not null default 0,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

alter table public.email_templates enable row level security;

create policy "Users can manage own email templates"
    on public.email_templates for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 2. LEADS — google_contact_resource column for People API sync
-- ────────────────────────────────────────────────────────────
alter table public.leads add column if not exists google_contact_resource text;
alter table public.leads add column if not exists source text;

-- ────────────────────────────────────────────────────────────
-- 3. NOTIFICATIONS — type column for typed notifications
-- ────────────────────────────────────────────────────────────
alter table public.notifications add column if not exists type text default 'general';
alter table public.notifications add column if not exists body text;

-- ────────────────────────────────────────────────────────────
-- Done. Run this script once in Supabase SQL Editor.
-- ────────────────────────────────────────────────────────────
