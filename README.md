<div align="center">

<img src="public/icon.png" alt="Minerva OS" width="96" height="96" style="border-radius: 22px;" />

# Minerva OS — Reach Lite

**CRM de prospection B2B autonome pour entrepreneurs québécois**

[![Version](https://img.shields.io/badge/version-v5.1.0-059669?style=flat-square)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848f?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-iOS%2FAndroid-119eff?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Licence](https://img.shields.io/badge/licence-Propriétaire-26251e?style=flat-square)](mailto:quebecsaas@gmail.com)

*Prospecte, enrichit les leads, envoie les emails et catégorise les réponses — le tout de manière automatique.*

</div>

---

## Table des matières

- [Produit](#produit)
- [Fonctionnalités](#fonctionnalités)
- [Stack technologique](#stack-technologique)
- [Architecture](#architecture)
- [Setup développeur](#setup-développeur)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données & migrations](#base-de-données--migrations)
- [Google OAuth](#google-oauth--configuration)
- [Déploiement](#déploiement)
- [Crons Vercel](#crons-vercel)
- [Changelog](#changelog)
- [Licence](#licence)

---

## Produit

Minerva OS Reach Lite est une plateforme CRM all-in-one conçue pour les entrepreneurs qui veulent maximiser leur temps de vente. Elle combine la prospection automatisée, la gestion des leads, les séquences d'emails IA, l'intelligence comportementale et le mode terrain — dans une seule application disponible sur **Web**, **macOS/Windows** (Electron) et **iOS/Android** (Capacitor).

---

## Fonctionnalités

### Prospection & Enrichissement

| Fonctionnalité | Détail |
|---|---|
| **Scraping OSM** | Recherche par niche + ville via l'API Overpass (OpenStreetMap), résultats en temps réel |
| **Enrichissement IA** | Description du site web, email de contact, réseaux sociaux, score BANT automatique |
| **Auto-dedup** | Détection et fusion des leads en doublon avant import |
| **Scraping nocturne** | Tâche cron quotidienne qui enrichit les leads sans email en arrière-plan |
| **Score lead** | Score 0–100 basé sur les signaux BANT, actualisé à chaque enrichissement |

### Outreach & Pipeline

| Fonctionnalité | Détail |
|---|---|
| **Séquences multi-étapes** | Délais configurables, personnalisation IA par lead (niche, ville, prénom) |
| **Inbox Gmail unifiée** | Threads liés aux leads, détection des réponses, classification d'intent IA |
| **Auto-tagging** | Détection automatique : Intéressé / RDV demandé / Pas intéressé / Hors-scope |
| **Pipeline Kanban** | Colonnes : New → Contacted → Meeting Booked → Proposal Sent → Negotiation → Won / Lost |
| **Propositions PDF** | Builder multi-sections (intro, problème, solution, prix QC, termes), export PDF natif |
| **Prévisions revenue** | Forecast pondéré par probabilité et date de close, graphique 6 mois |

### Intelligence & Agents

| Fonctionnalité | Détail |
|---|---|
| **Rapport hebdomadaire** | Analyse comportementale IA : opportunités, recommandations, score de santé du pipeline |
| **Assistant IA** | Chat multi-modèle (Anthropic / OpenRouter / Groq / Together AI) + Canvas editor |
| **AI Skills** | Packs de compétences IA activables, éditeur de skills personnalisés |
| **Agents IA** | Agents personnalisés configurables, feed d'activité en temps réel |
| **AI Gateway** | Routage unifié des fournisseurs IA, fallover automatique, suivi des coûts et latences |

### Terrain & Agenda

| Fonctionnalité | Détail |
|---|---|
| **Mode Carte** | Vue carte par défaut, tournée terrain, préparation de visite, compte-rendu structuré |
| **Agenda** | Intégration Google Calendar, réservation de RDV avec confirmation automatique |
| **Timeline unifiée** | Historique chronologique par lead : emails, visites, tâches, enrichissements, statuts |

### Workspace & Équipe

| Fonctionnalité | Détail |
|---|---|
| **Multi-workspace** | Espaces séparés, partitionnement complet des données par `workspace_id` |
| **Rôles sur mesure** | Création / édition de rôles avec permissions granulaires par module |
| **Chat d'équipe** | Messages, mentions `@`, images, lightbox, notifications push |
| **Automations** | Centre de contrôle : enrichissement, séquences, tagging, rapports — activation/désactivation |

### Navigation v5

Six entrées épurées dans la sidebar : **Accueil · Leads · Outreach · Carte · Agenda · Équipe**. Les pages secondaires (Paramètres, Intelligence, Assistant, Skills, Agents, Analytics, Bibliothèque) restent accessibles par URL directe et depuis le footer de la sidebar.

---

## Stack technologique

| Couche | Technologie |
|--------|-------------|
| **Framework** | Next.js 15 App Router + React 19 |
| **Langage** | TypeScript 5 strict |
| **UI** | Tailwind CSS v4 · shadcn/ui · Radix UI · Framer Motion |
| **Base de données** | Supabase (PostgreSQL + RLS) · SQLite (Electron, offline-first) |
| **Auth** | Supabase Auth (OTP + password) + Google OAuth2 |
| **IA** | Anthropic Claude · OpenRouter · Groq · Together AI |
| **Email** | Gmail API (OAuth2) · Nodemailer (SMTP support) |
| **Agenda** | Google Calendar API |
| **Prospection** | OpenStreetMap Overpass API · Firecrawl (optionnel) |
| **Desktop** | Electron (macOS/Windows) — export statique + protocole `app://` |
| **Mobile** | Capacitor (iOS/Android) — même export statique |
| **Déploiement** | Vercel (Edge + Serverless Functions) |

---

## Architecture

### Contextes d'exécution

L'application partage un seul codebase Next.js et tourne dans trois contextes distincts :

```
┌─────────────────────────────────────────────────────────┐
│  Web (Vercel)                                           │
│  pnpm dev / next start — API routes côté serveur        │
│  Supabase direct depuis les route handlers              │
├─────────────────────────────────────────────────────────┤
│  Electron (macOS / Windows)                             │
│  next export → out/ — protocole app://minerva/          │
│  SQLite local (electron/database.cjs)                   │
│  Sync bidirectionnel toutes les 5 min (LWW updated_at)  │
│  Appels API → NEXT_PUBLIC_APP_URL (Vercel prod)         │
├─────────────────────────────────────────────────────────┤
│  Capacitor (iOS / Android)                              │
│  Même export statique, sync via cap sync                │
│  APIs natives via lib/native-bridge.ts                  │
└─────────────────────────────────────────────────────────┘
```

Utiliser **`getApiUrl(path)`** (`lib/api-helper.ts`) pour tous les fetch client — il détecte automatiquement le contexte et route vers `NEXT_PUBLIC_APP_URL` en Electron/Capacitor.

### Dual-store pattern

```typescript
if (window.electron) {
  // Écriture SQLite via IPC
  window.electron.dbRun(sql, params);
  // Marquer pour sync
  // sync_status: 'pending_insert' | 'pending_update' | 'pending_delete'
  window.electron.triggerSync(); // sync immédiate
} else {
  // Écriture Supabase directe
  const supabase = createClient();
  await supabase.from('leads').upsert(data);
}
```

### Fenêtres Electron

| Fenêtre | Route | Description |
|---------|-------|-------------|
| `mainWindow` | `/` | Shell principal de l'application |
| `spotlightWindow` | `/spotlight` | Overlay de recherche globale — `Option+Space` |
| `trayWindow` | `/tray` | Popover 360×450 depuis l'icône de la barre de menu |
| PDF window | — | BrowserWindow invisible pour le rendu HTML→PDF |

### Structure des dossiers

```
app/
├── (app)/                        # Pages authentifiées — layout sidebar
│   ├── today/                    # Tableau de bord + Agent Feed + intelligence comportementale
│   ├── leads/                    # Liste (TanStack Table) · détail · timeline · [id]
│   ├── pipeline/                 # Kanban · tableau · prévisions revenue
│   ├── prospecting/              # Scraping UI + enrichissement batch
│   ├── outreach/                 # Inbox Gmail · séquences · campagnes · templates
│   ├── automations/              # Centre de contrôle des automations IA
│   ├── field/                    # Mode Carte — vue carte par défaut · tournée · compte-rendu
│   ├── agenda/                   # Calendrier · réservation RDV · Google Calendar
│   ├── intelligence/             # Rapport comportemental IA hebdomadaire
│   ├── assistant/                # Chat IA multi-modèle + Canvas editor
│   ├── skills/                   # Packs de skills IA + éditeur
│   ├── agents/                   # Agents IA personnalisés
│   ├── team/                     # Membres · rôles · chat · notifications
│   ├── settings/                 # Profil · IA · intégrations · automations · rôles
│   ├── analytics/                # Dashboard analytique
│   ├── workspaces/               # CRUD workspaces
│   ├── library/                  # Bibliothèque d'assets
│   ├── roadmap/                  # Feuille de route + checklist de vérification
│   └── changelog/                # Notes de version
│
├── api/                          # API Routes Next.js
│   ├── cron/                     # Jobs planifiés (enrich-leads, gmail-check-replies…)
│   ├── leads/                    # Enrichissement · score · dédup
│   ├── inbox/                    # Threads Gmail · reply · archive
│   ├── proposals/                # Génération IA multi-sections
│   ├── automations/              # Trigger et statut des automations
│   ├── ai/gateway/               # AI Gateway — completions · status · providers
│   ├── team/                     # Invite · membres · rôles (service role)
│   ├── google/auth/              # OAuth Google (canonical — google_accounts)
│   ├── auth/google/              # OAuth Google (legacy — settings.google_*)
│   ├── chat/                     # Chat IA provider cascade
│   ├── generate-draft/           # Génération email par IA
│   ├── generate-script/          # Script terrain par IA
│   ├── scrape-maps/              # Scraping OSM
│   ├── scrape-website/           # Description site web par IA
│   ├── send-email/               # Envoi Gmail
│   ├── export-drive/             # Export Google Drive
│   ├── agenda/book/              # Side-effects RDV (Calendar + Todoist)
│   ├── notifications/team/       # Fan-out notifications workspace
│   ├── insights/weekly/          # Rapport IA hebdomadaire
│   └── workspaces/               # CRUD workspaces
│
├── lib/
│   ├── reach-context.tsx         # État global (leads, tasks, workspaces, aiSuggestions)
│   ├── ai.ts                     # Provider AI — resolveAIProvider + generateCompletion
│   ├── mock-data.ts              # Interfaces TypeScript (Lead, Task, Deal…)
│   ├── google/                   # OAuth · refresh token · getAuthStatus · getFreshAccessToken
│   ├── api-helper.ts             # getApiUrl() — routing Web / Electron / Capacitor
│   ├── permissions.ts            # Modules de permissions pour les rôles custom
│   ├── language-context.tsx      # i18n — useLanguage() + t()
│   └── native-bridge.ts          # Wrappers Capacitor (Camera, Push, Preferences)
│
├── electron/
│   ├── main.cjs                  # Fenêtres · IPC handlers · protocole app://
│   ├── database.cjs              # Schéma SQLite + migrations idempotentes
│   ├── sync.cjs                  # Moteur sync SQLite ↔ Supabase (LWW)
│   └── preload.js                # contextBridge — window.electron API
│
└── components/
    └── ui/                       # shadcn/ui — Button, Dialog, Table, Badge…
```

### État global — ReachContext

`lib/reach-context.tsx` est le provider central wrappant tout le layout `(app)` :

- **`leads`** — liste complète, filtrée par `activeWorkspace.id`
- **`tasks`** — tâches avec mapping DB → UI (camelCase)
- **`aiSuggestions`** — suggestions IA pré-calculées
- **`workspacesList`** / **`activeWorkspace`** — workspace actif persisté en `localStorage`
- **`addNotification()`** — push vers la table `notifications` + fan-out équipe

Toutes les mutations sont **optimistes** : mise à jour locale immédiate, puis persistance SQLite ou Supabase.

### Sécurité — RLS Supabase

Toutes les tables métier sont protégées par Row Level Security. Pattern canonique :

```sql
DROP POLICY IF EXISTS "nom de la policy" ON nom_table;
CREATE POLICY "nom de la policy" ON nom_table FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      UNION ALL
      SELECT workspace_id FROM team_members WHERE member_user_id = auth.uid()
    )
  );
```

---

## Setup développeur

### Prérequis

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- Un projet **Supabase** (tier gratuit suffisant)
- Un projet **Google Cloud** avec Gmail API + Calendar API activées
- Une clé **Anthropic** (pour l'IA)

### Installation

```bash
git clone https://github.com/Endsi3g/minerva-os-lite-desktop.git
cd minerva-os-lite-desktop
pnpm install
```

### Développement

```bash
# Serveur web (port 3000)
pnpm dev

# Electron — lancer pnpm dev en premier
pnpm electron:dev

# Qualité du code
pnpm lint          # ESLint
pnpm format        # Prettier
pnpm typecheck     # TypeScript (sans émission)
```

---

## Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

```bash
cp .env.example .env.local
```

| Variable | Requis | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service role — **serveur uniquement, ne jamais exposer** |
| `GOOGLE_CLIENT_ID` | ✅ | Client ID Google OAuth2 |
| `GOOGLE_CLIENT_SECRET` | ✅ | Secret Google OAuth2 |
| `ANTHROPIC_API_KEY` | ✅ | Clé API Anthropic Claude |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publique de l'app (ex : `https://minerva-os-lite-desktop.vercel.app`) |
| `CRON_SECRET` | ✅ | Secret pour authentifier les endpoints cron Vercel |
| `FIRECRAWL_API_KEY` | ⬜ | Optionnel — scraping avancé PagesJaunes via Firecrawl |
| `OPENROUTER_API_KEY` | ⬜ | Optionnel — fallback AI provider via OpenRouter |
| `SUPPORT_SMTP_HOST` | ⬜ | SMTP pour le formulaire de support (ex : `smtp.gmail.com`) |
| `SUPPORT_SMTP_PORT` | ⬜ | Port SMTP (`587` STARTTLS · `465` SSL) |
| `SUPPORT_SMTP_USER` | ⬜ | Login SMTP |
| `SUPPORT_SMTP_PASS` | ⬜ | Mot de passe SMTP |
| `SUPPORT_EMAIL` | ⬜ | Adresse de destination des tickets support |

---

## Base de données & migrations

### Migrations Supabase

Exécuter dans l'éditeur SQL de Supabase **dans l'ordre**, en vérifiant le compte de rows avant chaque migration :

```sql
-- Vérification préalable (compter les rows avant de lancer)
SELECT COUNT(*) FROM leads;        -- doit être > 0 en prod
SELECT COUNT(*) FROM workspaces;   -- doit être > 0 en prod
```

| Fichier | Contenu |
|---------|---------|
| `supabase_migration_v3*.sql` | Schéma de base — leads, tasks, settings, workspaces, team |
| `supabase_migration_v4_1_*.sql` | Pipeline revenue, deals, forecasting |
| `supabase_migration_v4_2_outreach.sql` | Séquences, campagnes, templates outreach |
| `supabase_migration_v4_11_lead_tags.sql` | Tags leads |
| `supabase_migration_v4_12_proposals.sql` | Table proposals multi-sections |
| `supabase_migration_v5_1_ai_gateway_logs.sql` | Logs AI Gateway |

> **Règles absolues :** Ne jamais utiliser `DROP TABLE`, `TRUNCATE`, `DELETE FROM` sans `WHERE` précis, ni `DROP COLUMN` sans backup confirmé. Voir `CLAUDE.md` pour les détails.

### Schéma SQLite (Electron)

Tout changement de schéma Supabase doit être **mirroré** dans `electron/database.cjs` via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` pour garantir l'idempotence.

---

## Google OAuth — Configuration

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com)
2. Activer les APIs : **Gmail API**, **Google Calendar API**, **Google Drive API**, **People API**
3. Écran de consentement OAuth → External → Scopes :
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/drive.file`
4. Identifiants → OAuth 2.0 Client ID (Application web)
5. URI de redirection autorisés :
   - Dev : `http://localhost:3000/api/google/auth/callback`
   - Prod : `https://[votre-domaine]/api/google/auth/callback`
6. Renseigner `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env.local`

> **Deux flux OAuth coexistent :**
> - `app/api/google/auth/` → stockage dans `google_accounts` + `google_tokens` (flux canonique — Inbox, Agenda)
> - `app/api/auth/google/` → stockage dans `settings.google_*` (flux legacy)
>
> L'inbox lit les deux, avec fallback automatique.

---

## Déploiement

### Web — Vercel

```bash
vercel deploy          # Preview
vercel deploy --prod   # Production
```

> Variables d'env à configurer dans le dashboard Vercel (ou via `vercel env add`).

### Desktop — Electron

```bash
pnpm electron:build    # Génère .dmg (macOS) / .exe (Windows) dans dist/
```

> Le script exporte Next.js en statique, exclut les API routes de l'export (`app/api/` → `app-api-temp/` pendant le build), puis restaure. Ne jamais déplacer `app/api/` manuellement.

### Mobile — Capacitor

```bash
pnpm cap:sync          # Exporte Next.js + sync vers iOS/Android
pnpm cap:open:ios      # Ouvre le projet dans Xcode
pnpm cap:open:android  # Ouvre le projet dans Android Studio
```

---

## Crons Vercel

Définis dans `vercel.json` — déclenchés par Vercel Cron, authentifiés par `CRON_SECRET` :

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `POST /api/cron/enrich-leads` | `0 2 * * *` | Enrichissement nocturne des leads sans email |
| `POST /api/cron/gmail-check-replies` | `0 * * * *` | Détection et classification des réponses Gmail |
| `POST /api/cron/email-sequences` | `0 * * * *` | Envoi des étapes de séquences planifiées |
| `POST /api/cron/weekly-report` | `0 8 * * 1` | Rapport IA comportemental hebdomadaire |
| `POST /api/cron/process-queue` | `*/5 * * * *` | File d'attente IA — traitement par lots |

---

## Changelog

Voir [`CHANGELOG.md`](CHANGELOG.md) ou la page [/changelog](app/(app)/changelog/page.tsx) dans l'application.

Dernières versions :

| Version | Date | Points clés |
|---------|------|-------------|
| **v5.1.0** | 2026-06-29 | Sidebar 6 entrées, fix Google OAuth Inbox, Breadcrumb Leads, Timeline unifiée, pages Rôles dédiées |
| **v5.0.0** | 2026-06-28 | Navigation Revenue OS, AI Gateway, Agent Feed, Outreach unifié |
| **v4.5.0** | 2026-06-27 | Automations control center, AI gateway foundations |
| **v4.3.0** | 2026-06-28 | Perf: inline SVGs, cache server+client, container queries |
| **v4.2.0** | 2026-06-28 | Type scale, title template, preconnect DNS |

---

## Licence

Propriétaire — tous droits réservés.

Contact : [quebecsaas@gmail.com](mailto:quebecsaas@gmail.com)
