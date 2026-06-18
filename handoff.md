# Minerva OS Reach Lite — Handoff Document

This document reflects the **real, current state** of the application as of **v2.60.0** (2026-06-18). Updated after the full v2.51–v2.59 feature cycle, the deployment lockfile fix, the Apify HTML-response fix, the map page fix, and the Sprint 1 roadmap planning. Read this before starting new work.

---

## 1. Project Overview

- **Name**: Minerva OS Reach Lite
- **Stack**: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth + RLS), Electron (desktop), Capacitor (iOS/Android), shadcn/ui + Radix.
- **Package manager**: `pnpm` only.
- **Current version**: `2.60.0`.
- **Detailed architecture, runtime contexts, dual-store pattern, and conventions**: see `CLAUDE.md` at the repo root — it is accurate and should be treated as the source of truth for how the codebase is organized.

---

## 2. Feature Inventory (all real, all wired)

| Route | Purpose |
|---|---|
| `/today` | Daily dashboard: hot leads, tasks, AI suggestions, quick note, objectifs semaine, emails planifiés du jour. |
| `/leads`, `/leads/[id]` | Lead table (TanStack Table) and lead detail view with activity log. |
| `/prospecting` | Multi-source scraping (OSM/Overpass, Yelp, PagesJaunes, 411.ca, Apify) — multi-niche + multi-city in parallel, 65+ QC cities, radius slider, sort, CSV export, MapLibre map. |
| `/map` | Full-screen MapLibre map of leads — colour by temperature, geolocation, Haversine distances, OSRM route planning. **Fixed v2.60: coordinates were inverted + ResizeObserver added.** |
| `/sequences` | Email sequence builder: multi-step, multi-channel (Email/Call/LinkedIn/SMS), daily send via Vercel Cron. |
| `/pipeline` | Kanban + table views, revenue KPIs (MRR, ARR, win rate). |
| `/intelligence` | AI-generated insights/summaries over the active lead portfolio. |
| `/agents` | Marketplace of custom AI agents (creation, model/instruction sets, **real AI wiring** since v2.58). |
| `/chat` | Direct AI chat interface (Anthropic SDK streaming via `/api/chat`). |
| `/personas` | ICP persona cards from DESIGN.md with configurable scoring. |
| `/inbox` | Gmail threads linked to leads, suggest-reply IA, quick actions (positive/negative/follow-up). |
| `/campaigns`, `/campaigns/new` | Campaign management + 4-step wizard. |
| `/setup` | Interactive setup checklist for first-time configuration. |
| `/library` | Asset/content library with a TipTap rich-text editor. |
| `/analytics` | Analytics dashboard (real 30-day trends). |
| `/integrations` | Third-party connector management. |
| `/team` | Team member management: roles, invites, removal. |
| `/workspaces` | Workspace CRUD, partitioned data per workspace. |
| `/billing` | Plans and invoices. |
| `/help`, `/help/guides/[slug]` | Help center with 6 real step-by-step guides. |
| `/settings/*` | Sectioned settings: profile, AI providers (key-masked), notifications, integrations, prospecting config. |
| `/changelog` | In-app release timeline. |
| `/download` | Desktop app download page. |
| `/login`, `/onboarding`, `/welcome`, `/update-password` | Auth and first-run flows. |
| `/spotlight`, `/tray` | Electron-only overlay windows (global search, system tray popover). |

---

## 3. Security Posture

- **AI provider keys masked end-to-end** via `app/api/settings/ai-keys/route.ts`.
- **`/api/team/*`** validates workspace membership (owner or admin) before any mutation.
- **RLS on every table** (leads, tasks, notes, settings, workspaces, team members).
- **`SUPABASE_SERVICE_ROLE_KEY`** is server-only, never bundled to the client.
- **SMTP credentials** are environment variables, never exposed to the client.

---

## 4. Recent Changes (v2.51–v2.60)

### v2.60.0 (2026-06-18)
- **fix**: page `/map` — carte invisible résolue : coordonnées `center` inversées corrigées (`[lat,lng]` → `[lng,lat]`), `ResizeObserver` ajouté au composant `Map` pour garantir le redimensionnement du canvas, `absolute inset-0` sur le conteneur.
- **fix**: `pnpm-lock.yaml` commité — résolvait `ERR_PNPM_OUTDATED_LOCKFILE` sur Vercel (2 déploiements échoués en 4-5s).
- **fix**: Apify API — lecture `text()` avant `.json()`, détection HTML explicite, message d'erreur actionnable.

### v2.59.0
- Interface responsive mobile & tablette — leads, inbox, agents, settings.

### v2.58.0
- Agents intégrés câblés à de vraies API IA (Anthropic/Groq/OpenRouter).

### v2.57.0
- Scraper fiabilisé + fallback OSM garanti. Page Personas ICP. Fix imports croisés app/api.

### v2.56.0 / v2.56.1
- Page Setup Checklist. Banner Today si setup incomplet. Suppression de toute simulation dans le scraper.

### v2.55.0
- Inbox++ : quick actions, création de deal/tâche depuis l'inbox, filtre campagne.

### v2.54.0
- Personas ICP configurables avec scoring pondéré.

### v2.53.0
- Today cockpit enrichi : objectifs semaine, emails planifiés, activité récente.

### v2.51.0
- KPIs revenus pipeline (MRR, ARR, valeur moyenne, win rate).

---

## 5. Database Schema

Source of truth: `supabase_schema.sql` (Supabase/Postgres) mirrored in `electron/database.cjs` (`initDb`, SQLite). Any schema change must be applied to **both** files.

Core tables: `settings`, `leads`, `notes`, `tasks`, `drafts`, `workspaces`, team membership. Every Electron-side table carries `sync_status` (`pending_insert`/`pending_update`/`pending_delete`/`synced`) and `updated_at`.

Notable columns added in recent cycles:
- `leads.reply_status` — Gmail inbox status (positive/negative/follow_up)
- `settings.apify_token` — Apify API key
- `settings.smtp_config` — SMTP JSON config (Electron SMTP)
- `settings.daily_email_limit` — Daily email quota

---

## 6. Known Limitations

**Readiness: ~98%** for real-world production use.

What's still missing to call this 100%:

1. **No automated test suite** — no test runner configured. Priority: add Vitest (dual-store sync) + Playwright (critical flows).
2. **No dependency audit** — run `pnpm audit` and address high/critical findings.
3. **No error monitoring** — no Sentry or equivalent wired up.
4. **Electron SQLite IPC** — accepts parameterized SQL from renderer (low local risk, would need hardening if Electron ever loads remote content).
5. **`ANTHROPIC_API_KEY` not set on Vercel** — currently missing from env vars (agents/chat route would fall back to user-configured keys only).

---

## 7. Local Development

```bash
pnpm install
pnpm dev                  # Next.js dev server, http://localhost:3000
pnpm electron:dev         # Electron dev mode (requires pnpm dev running first)
pnpm typecheck
pnpm lint
```

---

## 8. Sprint Roadmap — Next Steps (Priority Order)

### Sprint 1 — Implémentation immédiate

| # | Feature | Effort | Valeur |
|---|---------|--------|--------|
| 1 | **Call logging** — bouton `tel:` + modal log d'appel (Répondu / Messagerie / RDV) sur la fiche lead | Faible | ★★★★ |
| 2 | **Page Playbooks** — `/playbooks` avec 5 templates intégrés + bouton "Utiliser" qui pré-remplit une campagne | Moyen | ★★★★★ |
| 3 | **Slack/Discord webhooks** — notif sur réponse positive + deal gagné (URL configurable dans Settings) | Faible | ★★★★ |
| 4 | **Lien calendrier** — `meeting_link` dans settings + variable `{{lien_rdv}}` dans les brouillons IA | Très faible | ★★★ |

### Sprint 2 — Intégrations "stack agence"

| # | Feature | Effort |
|---|---------|--------|
| 5 | **Webhooks sortants + API publique** — events `lead.created`, `deal.won`, etc. + `POST /api/public/leads` | Moyen |
| 6 | **Enrichissement email** — bouton "Enrichir" par lot via Hunter.io / Dropcontact | Moyen |
| 7 | **Intégration CRM** — push lead/deal vers HubSpot ou Pipedrive via webhook/API | Élevé |
| 8 | **Form capture** — webhook inbound depuis Typeform/Tally → nouveau lead avec `source=inbound_form` | Moyen |

### Sprint 3 — Pages avancées

| # | Feature | Effort |
|---|---------|--------|
| 9 | **Client Reports** — `/client-reports/[clientId]` vue KPI partageable (token URL) | Élevé |
| 10 | **Video Outreach** — `/video-outreach` scripts vidéo + checklists + hub Loom/Sendspark | Faible |
| 11 | Tests automatisés (Vitest + Playwright) | Élevé |
| 12 | Monitoring erreurs (Sentry) | Faible |

---

## 9. Infrastructure Notes

- **Vercel** : projet lié `prj_dazUz7NrZUZA9Pmm7awOvpb4vhG4`, team `endsi3gs-projects`.
- **ANTHROPIC_API_KEY** : non configurée sur Vercel → ajouter via `vercel env add ANTHROPIC_API_KEY production`.
- **pnpm-lock.yaml** : toujours commiter après `pnpm install` — Vercel CI utilise `--frozen-lockfile`.
- **Middleware deprecation** : warning `middleware → proxy` sur Next.js 16. À migrer si problèmes.
- **Apify actor** : `compass~crawler-google-places` — nécessite un plan payant Apify. Si HTML retourné avec clé valide, vérifier le plan / acteur actif.
