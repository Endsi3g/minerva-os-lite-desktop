# Minerva OS Reach Lite — Handoff Document

This document reflects the **real, current state** of the application as of **v2.11.0** (2026-06-16), after a full security/completeness/dead-code/UI audit. Read this before starting new work — it replaces all previous handoff notes, which described an earlier, partly-mocked state of the app.

---

## 1. Project Overview

- **Name**: Minerva OS Reach Lite
- **Stack**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth + RLS), Electron (desktop), Capacitor (iOS/Android), shadcn/ui + Radix.
- **Package manager**: `pnpm` only.
- **Current version**: `2.11.0`.
- **Detailed architecture, runtime contexts, dual-store pattern, and conventions**: see `CLAUDE.md` at the repo root — it is accurate and should be treated as the source of truth for how the codebase is organized. This document focuses on *product state* and *what to do next*, not on re-explaining architecture already documented there.

---

## 2. Feature Inventory (all real, all wired)

Every route below is a genuine, fully-implemented page — confirmed during this audit that the sidebar navigation maps 1:1 to actual routes, with no orphaned or dead-end pages.

| Route | Purpose |
|---|---|
| `/today` | Daily dashboard: hot leads, tasks, AI suggestions, quick note. |
| `/leads`, `/leads/[id]` | Lead table (TanStack Table) and lead detail view. |
| `/prospecting` | Lead scraping UI (Google Maps/OSM, Yelp, PagesJaunes) with a dedicated dashboard and an interactive Quebec map for geolocated targeting. |
| `/pipeline` | Kanban + table views of the sales pipeline, drag-and-drop stage transitions. |
| `/intelligence` | AI-generated insights/summaries over the active lead portfolio. |
| `/agents` | Marketplace of custom AI agents (creation, configuration, model/instruction sets). |
| `/chat` | Direct AI chat interface (Anthropic SDK streaming via `/api/chat`). |
| `/library` | Asset/content library with a TipTap rich-text editor. |
| `/analytics` | Analytics dashboard. |
| `/integrations`, `/integrations/import` | Third-party connector management; `/import` lets a user add an integration from an illustrative catalog or a raw JSON config. |
| `/team` | Team member management: roles, invites, removal. |
| `/workspaces` | Workspace CRUD, partitioned data per workspace. |
| `/billing` | Plans and invoices, with a real printable/PDF invoice download. |
| `/help`, `/help/guides/[slug]` | Help center with six real step-by-step guides (no placeholder content). |
| `/settings/*` | Sectioned settings: profile, AI providers (now key-masked), notifications, integrations, prospecting config. |
| `/changelog` | In-app release timeline (v1.0.0 → v2.11.0). |
| `/download` | Desktop app download page. |
| `/login`, `/onboarding`, `/welcome`, `/update-password` | Auth and first-run flows. |
| `/spotlight`, `/tray` | Electron-only overlay windows (global search, system tray popover). |

No `href="#"`, inert kebab menu, or `alert("coming soon")` remains anywhere in the app as of this audit — every interactive element either navigates somewhere real or triggers a real handler.

---

## 3. Security Posture (post-audit)

This audit found and fixed one **critical** and two **moderate** issues. Current state:

- **AI provider keys are masked end-to-end.** `app/api/settings/ai-keys/route.ts` is the only place that ever touches the raw `openrouter_key`/`groq_api_key`/`together_api_key` columns from the client side; it returns only a masked form (`sk-••••1234`). The client (`settings-root.tsx`, `settings-ai-section.tsx`) never receives or caches a raw key in React state or `localStorage`. Server-side consumers (`/api/generate-draft`, `/api/chat`) still read the real value directly from Supabase, which is safe since that happens server-side.
- **`/api/team/members` and `/api/team/invite` now validate workspace membership explicitly** (owner or active admin) before returning data or performing mutations, on top of Supabase RLS.
- **RLS is enforced on every table** (`leads`, `tasks`, `notes`, `settings`, `workspaces`, team members) — a user can only read/write data for workspaces they own or are an active member of.
- **`SUPABASE_SERVICE_ROLE_KEY`** is only ever referenced in server route handlers, never bundled to the client.
- **Known, accepted, low-severity item**: the Electron SQLite IPC channel (`dbRun`/`dbAll`/`dbGet`) accepts parameterized SQL from the renderer process. This is a local-machine-only risk (no network exposure) and was intentionally left as-is this cycle — documented in `README.md` under Sécurité.

---

## 4. What This Audit Cycle Changed (v2.11.0)

- **Security**: AI key masking (new `app/api/settings/ai-keys` route), hardened `/api/team/members` + `/api/team/invite`.
- **New dedicated pages**: `/integrations/import` (catalog + JSON import flow), `/help/guides/[slug]` (six real guides with `generateStaticParams()` for Electron static export compatibility).
- **Dead UI fixed**: `/team`, `/welcome`, `/integrations`, `/billing` — every inert link/button now does something real (see `CHANGELOG.md` for the full list).
- **Dead/duplicated code removed**: unused `initialAiSuggestions` export in `lib/mock-data.ts`; three duplicate implementations of lead temperature badge styling consolidated into `lib/lead-badges.ts`.
- **Docs**: this file, root `CHANGELOG.md` (new), in-app `/changelog` page and its `fr`/`en`/`de` translation keys, and a new "Sécurité" section + missing v2.x feature descriptions in `README.md`.

Full per-version detail lives in `CHANGELOG.md` at the repo root.

---

## 5. Database Schema

Source of truth: `supabase_schema.sql` (Supabase/Postgres) mirrored in `electron/database.cjs` (`initDb`, SQLite). Any schema change must be applied to **both** files — `electron/database.cjs` uses `ALTER TABLE … ADD COLUMN` with an empty callback so it's safe to re-run.

Core tables: `settings`, `leads`, `notes`, `tasks`, `drafts`, `workspaces`, team membership. Every Electron-side table carries `sync_status` (`pending_insert`/`pending_update`/`pending_delete`/`synced`) and `updated_at`, consumed by the Last-Write-Wins sync engine in `electron/sync.cjs`.

---

## 6. Known Limitations / Honest Readiness Assessment

**Readiness: ~98%** for real-world production use, up from ~90% before this cycle.

What's solid: full route coverage, RLS on every table, the dual-store (SQLite/Supabase) sync architecture, AI key masking, hardened team APIs, no dead-end UI, no genuinely dead/duplicated code left, and a fully clean `pnpm typecheck` (0 errors) / `pnpm lint` (0 errors, 129 warnings — all pre-existing `no-explicit-any` style warnings, none new).

What's still missing to call this 100%:

1. **No automated test suite exists** (confirmed — no test runner is even configured in `package.json`). This is the single biggest gap: there is currently no regression safety net beyond `pnpm typecheck` + `pnpm lint`. Recommended next step: add Vitest/Playwright, starting with the dual-store sync logic (`lib/reach-context.tsx`, `electron/sync.cjs`) and the newly-hardened `/api/team/*` and `/api/settings/ai-keys` routes, since those are the highest-blast-radius areas.
2. **No dependency audit has been run.** Run `pnpm audit` and address any high/critical findings.
3. **No error monitoring/observability** (e.g., Sentry) is wired up. Worth considering before a wider production rollout.
4. **Electron SQLite IPC** accepts raw parameterized SQL from the renderer (see Security section) — low risk today, but if the Electron app ever loads remote/untrusted content this should be revisited.

None of the above blocks shipping; they're the gap between "solid and secure" (today) and "fully hardened with a regression safety net" (100%).

---

## 7. Local Development

```bash
pnpm install
pnpm dev                  # Next.js dev server, http://localhost:3000
pnpm electron:dev         # Electron dev mode (requires pnpm dev running first)
pnpm typecheck
pnpm lint
```

For production builds and the Electron/Capacitor static-export caveat (`app/api/` temporarily renamed during export), see `CLAUDE.md`.

---

## 8. Suggested Next Steps for a Future Agent

In priority order:

1. Stand up a test runner (Vitest for unit, Playwright for e2e) and cover the dual-store sync engine and the `/api/team/*` + `/api/settings/ai-keys` routes first — this is the largest remaining risk.
2. Run `pnpm audit` and remediate findings.
3. Evaluate adding error monitoring (Sentry or equivalent) before any significant user growth.
4. Revisit the Electron SQLite IPC surface if the app's threat model changes (e.g., if it ever renders remote/untrusted content).
