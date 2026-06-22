# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design System — MANDATORY

**Always read and follow `DESIGN.md` before touching any UI or styling.** Every color, spacing, typography, and component pattern decision must conform to the tokens and conventions defined there. Never use Tailwind named colors for brand elements — use hex literals only (`#26251e`, `#059669`, `#f54e00`, etc.). Per-page accent color assignments:

| Page | Accent |
|---|---|
| Tasks (`/tasks`) | `#059669` (Brand Green) — completion/success |
| Roadmap (`/roadmap`) | `#059669` (Brand Green) — completion/success |
| All others (default) | `#f54e00` (Primary Orange) unless DESIGN.md specifies otherwise |

## Commands

```bash
# Development
pnpm dev                  # Next.js dev server at http://localhost:3000
pnpm electron:dev         # Run Electron in dev mode (requires pnpm dev running first)
pnpm lint                 # ESLint
pnpm format               # Prettier (ts, tsx)
pnpm typecheck            # TypeScript type-check (no emit)

# Production builds
pnpm electron:build       # Static Next.js export → Electron .dmg / .exe via electron-builder
pnpm cap:sync             # Static Next.js export → Capacitor iOS/Android sync
pnpm cap:open:ios         # Open iOS project in Xcode
pnpm cap:open:android     # Open Android project in Android Studio

# Deploy scripts
pnpm launch               # node scripts/launcher.js (opens built Electron app)
pnpm deploy               # node scripts/deploy.js
```

> **EXPORT_MODE**: The electron:build and cap:sync scripts temporarily rename `app/api/` to `app-api-temp/` before calling `next build` so that Next.js static export (which cannot include API routes) succeeds, then restores the folder. Never manually delete or move `app/api/`.

## Architecture

### Runtime Contexts
The app runs in three distinct contexts that all share the same Next.js codebase:

1. **Web browser** — served by `next dev` or `next start`; API routes run server-side.
2. **Electron desktop** — Next.js statically exported to `out/`, served by a custom `app://` protocol handler in `electron/main.cjs`. API route calls go to the remote URL set via `NEXT_PUBLIC_APP_URL`.
3. **Capacitor mobile (iOS/Android)** — same static export synced via `cap sync`.

Use `getApiUrl(path)` (`lib/api-helper.ts`) for every API call. It detects the runtime and routes to `NEXT_PUBLIC_APP_URL` when running in Electron or native Capacitor instead of relative paths.

Detect Electron: `typeof window !== 'undefined' && (window as any).electron` (truthy).

### Data Layer: Dual-Store Pattern

All data operations in `ReachContext` (and page-level components) follow this pattern:

```
if (window.electron) {
  // write to SQLite via window.electron.dbRun/dbAll/dbGet IPC
  // mark sync_status as 'pending_insert' | 'pending_update' | 'pending_delete'
  // call window.electron.triggerSync()
} else {
  // write directly to Supabase via createClient() from lib/supabase/client.ts
}
```

**SQLite schema** is in `electron/database.cjs` (`initDb`). Tables: `settings`, `leads`, `drafts`, `notes`, `tasks`, `workspaces` — each has a `sync_status` column and `updated_at` timestamp.

**Any Supabase schema change** (new column, new table) must be mirrored in `electron/database.cjs`. Use `ALTER TABLE … ADD COLUMN` with an empty callback to safely handle re-runs.

**Sync engine** (`electron/sync.cjs`) uses Last-Write-Wins on `updated_at`. Runs automatically every 5 minutes and on-demand when `window.electron.triggerSync()` is called.

### Electron Windows

`electron/main.cjs` manages four windows:
- **mainWindow** — the full app shell, loaded from `app://minerva/` in production.
- **spotlightWindow** — frameless overlay at `/spotlight`, toggled by `Option+Space` / `Alt+Space`.
- **trayWindow** — 360×450 frameless popover at `/tray`, shown when the system tray icon is clicked.
- **PDF export window** — temporary invisible BrowserWindow used to render HTML → PDF.

IPC channel names are defined in `electron/main.cjs` (`setupIpcHandlers`) and exposed to the renderer via `electron/preload.js` (`contextBridge.exposeInMainWorld('electron', {...})`).

### Next.js App Router Structure

```
app/
  layout.tsx                  # Root layout (ThemeProvider, LanguageProvider)
  page.tsx                    # Root redirect (→ /today)
  login/                      # Auth pages (OTP, password, signup)
  onboarding/                 # Multi-step onboarding (redirected here if settings missing)
  welcome/                    # Post-onboarding splash
  spotlight/                  # Global search overlay (Electron only)
  tray/                       # System tray popover (Electron only)
  update-password/            # Password reset flow
  (app)/                      # Authenticated shell with sidebar layout
    layout.tsx                # Sidebar + topbar + ReachProvider + TooltipProvider
    today/                    # Daily dashboard (incl. team activity feed + behavioral-intelligence card)
    agenda/                   # Full calendar + appointment booking (pinned sidebar item)
    leads/                    # Lead list (TanStack Table) + [id] detail (incl. website scraper)
    prospecting/              # Lead scraping UI
    pipeline/                 # Kanban + table views
    inbox/                    # Gmail threads tied to leads (reads google_accounts/settings tokens)
    field/                    # Field (terrain) mode: route → prepare → outcome
    intelligence/             # AI insights & summaries
    assistant/                # AI chat + Canvas editor (canvas auto-opens via ```canvas: blocks)
    skills/                   # AI Skills surface (packs + creator), wired into chat @ menu
    settings/                 # Sectioned settings pages (incl. automations, AI provider)
    team/                     # Team member management + team chat (mentions, images, lightbox)
    workspaces/               # Workspace CRUD
    agents/                   # Custom AI agents
    analytics/                # Analytics dashboard
    integrations/             # Third-party connectors
    library/                  # Asset library
    roadmap/                  # Product roadmap + manual Verification checklist tab
    changelog/                # Release notes
  api/
    auth/google/(login|callback)/   # Google OAuth (settings.google_* token store)
    google/auth/(start|callback)/   # Google OAuth (google_accounts/google_tokens store) — canonical for inbox/agenda
    chat/                           # AI chat — provider cascade (anthropic | openrouter | groq | together); accepts `provider`, `system`
    generate-draft/ generate-script/  # AI email/script generation (uses lead website_description)
    scrape-maps/ scrape-website/    # Lead scraping (OSM) + website → AI description
    send-email/ export-drive/       # Gmail send / Drive export
    agenda/book/                    # Appointment side-effects (Google Calendar + Todoist)
    notifications/team/             # Fan-out notifications to workspace (or specific recipientUserIds for @mentions)
    insights/weekly/                # Weekly AI opportunity report (behavioral intelligence)
    team/(invite|members|role)/     # Team management (uses SUPABASE_SERVICE_ROLE_KEY)
    workspaces/                     # Workspace CRUD
```

> **Google token stores (two flows):** `settings.google_*` (older, written by `app/api/auth/google/callback`) and `google_accounts`/`google_tokens` (newer, written by `lib/google/google-auth-service.exchangeCodeForTokens`, used by the connect button). Inbox routes read `settings.*` first then fall back to `getFreshAccessToken`/`getAuthStatus`. OAuth redirect URI on Vercel is `https://minerva-os-lite-desktop.vercel.app/api/google/auth/callback` (must be registered in Google Cloud Console).

> **AI provider:** default is Anthropic. The global `OPENROUTER_API_KEY` env only activates OpenRouter when explicitly requested (`provider: 'openrouter'` or a per-user key), so Claude-model calls (field scripts, drafts) keep working. The assistant passes `selectedModel.provider`. Migrations live in `supabase_migration_v3*.sql` (run them in the Supabase SQL editor).

### Global State: ReachContext

`lib/reach-context.tsx` provides the central `ReachProvider` (wraps the entire `(app)` layout). It holds: `leads`, `tasks`, `aiSuggestions`, `quickNote`, `focusItems`, `workspacesList`, `activeWorkspace`.

All mutations update local state optimistically and persist to SQLite (Electron) or Supabase (web).

Workspace partitioning: all queries include `workspace_id = activeWorkspace.id`. Active workspace ID is persisted in `localStorage` under `minerva_active_workspace_id`.

### Auth & Middleware

`middleware.ts` runs on every non-static route:
1. Unauthenticated → redirect to `/login`.
2. Authenticated + onboarding incomplete (no `full_name`/`company_name` in `settings`) → redirect to `/onboarding`.
3. Root `/` → redirect to `/today`.

Supabase helpers are in `lib/supabase/`: `client.ts` (browser), `server.ts` (RSC/route handlers), `middleware.ts` (session refresh).

### Background Scraper

Electron runs `runBackgroundScrapeIfNeeded()` on launch and every 5 minutes. It triggers a scrape if `settings.last_scrape_at` is more than 6 hours old. The scrape POSTs to `NEXT_PUBLIC_APP_URL/api/scrape-maps` and inserts new leads directly into SQLite with `sync_status = 'pending_insert'`, then calls `triggerSync()`.

### Capacitor / Mobile

`lib/native-bridge.ts` wraps Capacitor APIs (Camera, PushNotifications, Preferences) with web fallbacks. Use `isNativePlatform()` to guard native calls. `lib/native-bridge.ts` also holds the `Window.electron` TypeScript declaration.

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-only — never expose to client
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
FIRECRAWL_API_KEY=               # Optional — server-only, enables PagesJaunes scraping via Firecrawl
NEXT_PUBLIC_APP_URL=              # Used by Electron/Capacitor for API calls (e.g. https://minerva-os-lite.com)

# Support contact form (app/api/support/contact) — if unset, messages are logged to console only
SUPPORT_SMTP_HOST=                # e.g. smtp.gmail.com or smtp.resend.com
SUPPORT_SMTP_PORT=587             # 465 for SSL, 587 for STARTTLS
SUPPORT_SMTP_USER=                # SMTP login (your sending address or API key username)
SUPPORT_SMTP_PASS=                # SMTP password or API key
SUPPORT_EMAIL=support@minervaos.com  # Destination inbox for support tickets
```

## Key Conventions

- **Feature pages** use a `*-root.tsx` client component pattern: the Next.js `page.tsx` is a thin server component that renders `<FeatureRoot />` which holds all client state.
- **Private route components** live under `_components/` inside each route folder.
- **Supabase column naming** is `snake_case`; the UI model (TypeScript interfaces in `lib/mock-data.ts`) uses `camelCase`. All mapping happens in `ReachContext` via `mapDbLeadToUi`, `mapDbTaskToUi`, etc.
- **i18n**: `lib/language-context.tsx` provides the `useLanguage()` hook with `t()`. All visible UI strings should use translation keys.
- **UI components**: shadcn/ui (`components/ui/`) built on Radix UI primitives. Add new components via `pnpm dlx shadcn add <component>`.
- **Styling**: Tailwind CSS v4 with design tokens hardcoded as hex literals (`#26251e`, `#f54e00`, `#e5e5e0`, etc.) — do not use named Tailwind colors for brand elements.
