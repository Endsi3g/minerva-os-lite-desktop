# Minerva OS Lite — Deployment Guide (100% Free)

This guide covers deploying Minerva OS Lite at zero cost using Vercel (frontend + API routes), Supabase (database + auth + realtime), and optional Cloudflare (domain/CDN). No paid tier required for a small team (≤ 5 users).

---

## Prerequisites

- Node.js ≥ 18, pnpm ≥ 8
- Git repo pushed to GitHub
- Accounts needed (all free tiers): Vercel, Supabase, Anthropic (API key)
- Optional: Google Cloud Console (OAuth for Gmail/Drive), Cloudflare (custom domain)

---

## Step 1 — Supabase Project

### 1.1 Create a project
1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users (e.g. `ca-central-1` for Canada)
3. Save your database password — you won't see it again

### 1.2 Run the schema SQL
In the Supabase SQL editor, run the following script to create all required tables:

```sql
-- Settings (user profile, API keys, preferences)
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  workspace_id uuid,
  full_name text,
  company_name text,
  email text,
  avatar_base64 text,
  bio text,
  user_role text,
  openrouter_key text,
  groq_key text,
  together_key text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_pass text,
  smtp_from text,
  apify_api_key text,
  last_scrape_at timestamptz,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspace members
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Leads (CRM core)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  owner_name text,
  category text,
  address text,
  phone text,
  email text,
  status text DEFAULT 'new',
  score integer DEFAULT 0,
  notes text,
  website text,
  rating numeric,
  reviews_count integer,
  maps_url text,
  photos jsonb,
  social_links jsonb,
  assigned_to uuid REFERENCES auth.users(id),
  next_action_date timestamptz,
  last_contact_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  priority text DEFAULT 'normal',
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);

-- Documents (library)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team messages (realtime chat)
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_team_messages_workspace ON team_messages(workspace_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Services / offer catalog
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric,
  type text DEFAULT 'digital',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_workspace ON services(workspace_id);

-- Team invites
CREATE TABLE IF NOT EXISTS team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  role text DEFAULT 'member',
  token text UNIQUE,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### 1.3 Enable Row Level Security (RLS)
For each table, run:
```sql
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

Basic RLS policies (adapt as needed):
```sql
-- Settings: users see only their own
CREATE POLICY "settings_self" ON settings FOR ALL USING (auth.uid() = user_id);

-- Leads/Tasks/Docs/Notes: workspace members only
CREATE POLICY "leads_workspace" ON leads FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "tasks_workspace" ON tasks FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "documents_workspace" ON documents FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Notifications: own only
CREATE POLICY "notifications_self" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Team messages: workspace members
CREATE POLICY "team_messages_workspace" ON team_messages FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
```

### 1.4 Enable Realtime
In Supabase dashboard → Database → Replication, enable Realtime on:
- `team_messages`
- `notifications`

### 1.5 Collect your keys
From the Supabase project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` — the project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — the service_role key (keep secret, server-only)

---

## Step 2 — Vercel Deployment

### 2.1 Connect the repo
1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select the `minerva-os-lite-desktop` repo
3. Framework preset: **Next.js** (auto-detected)

### 2.2 Set environment variables
In Vercel project Settings → Environment Variables, add:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key | Production, Preview |
| `ANTHROPIC_API_KEY` | your Anthropic key | All |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | All |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console | All |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console | Production |

> `NEXT_PUBLIC_APP_URL` must be set to your final domain. This is used by Electron and Capacitor clients to reach the API routes.

### 2.3 Deploy
Click **Deploy**. Vercel runs `next build` automatically. The first build takes ~2 minutes.

After deploy, your app is live at `https://your-project.vercel.app`.

### 2.4 Update Supabase auth settings
In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://your-project.vercel.app`
- **Redirect URLs**: add `https://your-project.vercel.app/**`

---

## Step 3 — Google OAuth (optional, for Gmail/Drive integrations)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → Enable **Gmail API** and **Google Drive API**
3. OAuth 2.0 Credentials → Web application
4. Authorized redirect URIs: `https://your-project.vercel.app/api/auth/google/callback`
5. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars

---

## Step 4 — Custom Domain (optional, free via Cloudflare)

1. Buy/transfer domain to [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (at-cost pricing, ~$9-12/yr)
2. In Vercel → Domains, add your domain
3. Copy the Vercel CNAME records to Cloudflare DNS
4. Update `NEXT_PUBLIC_APP_URL` env var to `https://yourdomain.com`
5. Update Supabase Site URL and redirect URLs to match

---

## Step 5 — Vercel Cron Jobs (notifications)

The app uses Vercel Cron for scheduled notification tasks. These are defined in `vercel.json` at the repo root:

```json
{
  "crons": [
    {
      "path": "/api/cron/overdue-check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Cron jobs run **free on the Vercel Hobby plan** (up to 2 per day). No additional configuration needed — Vercel picks up `vercel.json` automatically.

To test locally: call the route directly with `curl http://localhost:3000/api/cron/overdue-check`.

---

## Step 6 — Electron Desktop App (optional)

The Electron build produces a `.dmg` (macOS) or `.exe` (Windows) that connects to the deployed Vercel API for all server-side operations.

```bash
# Make sure NEXT_PUBLIC_APP_URL is set in .env.local to your production URL
pnpm electron:build
```

Output is in `dist/`. Distribute via GitHub Releases (free) — upload the `.dmg`/`.exe` as release assets.

Set `NEXT_PUBLIC_APP_URL` in the build environment to point at the production Vercel URL so the Electron app uses live APIs.

---

## Step 7 — Mobile (Capacitor) — Coming Soon

```bash
pnpm cap:sync
pnpm cap:open:ios   # opens Xcode
pnpm cap:open:android  # opens Android Studio
```

iOS requires an Apple Developer account ($99/yr) to publish to the App Store. Android requires a Google Play account ($25 one-time). Both platforms show "Bientôt disponible" in the Download page until published.

---

## Cost Summary

| Service | Free Tier Limits | Paid needed? |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth, 6,000 build min/mo | No (up to ~5 active users) |
| Supabase Free | 500 MB DB, 5 GB bandwidth, 50K MAU | No (small team) |
| Anthropic | Pay-as-you-go | ~$1-5/mo for typical usage |
| Cloudflare DNS | Unlimited | No |
| Google OAuth | Free | No |
| GitHub Releases | Unlimited public releases | No |

**Total: $0/month** for a small team, assuming low Anthropic AI usage (the cascade Groq → Together → OpenRouter → Anthropic means cheaper models run first).

---

## Troubleshooting

**"Could not find column X in schema cache"** — A column exists in the app code but not in Supabase. Run the relevant `ALTER TABLE` statement in the Supabase SQL editor.

**Auth redirects to wrong URL** — Check `NEXT_PUBLIC_APP_URL` env var and Supabase Site URL match.

**Realtime not working** — Verify Realtime is enabled for the table in Supabase → Database → Replication.

**Electron API calls fail** — `NEXT_PUBLIC_APP_URL` must be set to the live Vercel URL (not localhost) when running the production Electron app.

**`pnpm electron:build` fails on static export** — The build script auto-moves `app/api/` to `app-api-temp/` before export. If the build crashed mid-run, `app/api/` may be missing — check for `app-api-temp/` and rename it back manually.
