# Minerva OS — Reach Lite

> **Dernière version : v5.0.0**

CRM de prospection B2B autonome pour entrepreneurs québécois. Prospecte, enrichit les leads, envoie les emails et catégorise les réponses — le tout de manière automatique.

---

## Produit

### Ce que fait Minerva OS

Minerva OS est une plateforme CRM all-in-one conçue pour les entrepreneurs qui veulent maximiser leur temps de vente :

- **Prospection automatisée** — Scrape les données OSM (OpenStreetMap) par niche et ville, enrichit chaque lead avec description du site web, email de contact, réseaux sociaux, score BANT
- **Automatisation complète** — Enrichissement à l'import ou nocturne, emails de prospection générés par IA et envoyés automatiquement, auto-tagging des réponses (Intéressé, RDV demandé…)
- **Pipeline revenue** — Kanban avec étapes Proposal Sent et Negotiation, prévisions de closes par mois, builder de propositions commerciales multi-sections avec export PDF
- **Inbox intelligente** — Threads Gmail liés aux leads, détection des réponses, classification IA de l'intent
- **Intelligence IA** — Rapport hebdomadaire comportemental, assistant IA avec canvas, agents personnalisés, skills IA
- **Agenda & terrain** — Intégration Google Calendar, mode terrain (route → préparation → compte-rendu), réservation de RDV
- **Multi-workspace & équipe** — Espaces de travail séparés, rôles (Admin/Manager/Member), chat d'équipe, notifications
- **Navigation v5 — 6 entrées épurées** — Accueil, Leads, Outreach, Carte, Agenda, Équipe ; pages secondaires accessibles par URL directe
- **AI Gateway Vercel** — Routage unifié des fournisseurs IA avec failover et suivi des coûts
- **Agent Feed** — Flux d'activité des agents IA et de l'automatisation
- **Outreach unifié** — Espace de prospection multi-canal centralisé
- **Timeline unifiée** — Historique chronologique de toutes les interactions leads (emails, tâches, visites terrain, enrichissements)

### Stack technologique

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 App Router + React 19 |
| Mobile | Capacitor (iOS/Android) |
| Desktop | Electron (macOS/Windows) |
| Base de données | Supabase (PostgreSQL) + SQLite (Electron offline) |
| IA | Anthropic Claude / OpenRouter / Groq / Together AI |
| Email | Gmail API (OAuth2) |
| Agenda | Google Calendar API |
| Prospection | OpenStreetMap Overpass API + Firecrawl |
| UI | Tailwind CSS v4 + shadcn/ui + Radix UI |
| Animations | Framer Motion |

---

## Setup développeur

### Prérequis

- Node.js ≥ 20
- pnpm ≥ 9
- Un projet Supabase (gratuit)
- Un projet Google Cloud (pour Gmail + Calendar)
- Une clé API Anthropic (pour l'IA)

### Installation

```bash
git clone https://github.com/Endsi3g/minerva-os-lite-desktop.git
cd minerva-os-lite-desktop
pnpm install
```

### Variables d'environnement

Copier et remplir :

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (serveur uniquement) |
| `GOOGLE_CLIENT_ID` | Client ID Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Secret Google OAuth |
| `ANTHROPIC_API_KEY` | Clé API Anthropic Claude |
| `NEXT_PUBLIC_APP_URL` | URL de l'app (ex : `https://minerva-os-lite-desktop.vercel.app`) |
| `CRON_SECRET` | Secret pour protéger les endpoints cron |
| `FIRECRAWL_API_KEY` | Optionnel — scraping avancé via Firecrawl |

### Base de données

Exécuter les migrations dans le SQL editor Supabase dans l'ordre :

```
supabase_migration_v3*.sql    ← Core schema
supabase_migration_v4*.sql    ← Features v4.x
supabase_migration_v4_11_lead_tags.sql
supabase_migration_v4_12_proposals.sql
```

### Développement

```bash
# Web (port 3000)
pnpm dev

# Electron (lancer pnpm dev d'abord)
pnpm electron:dev

# Linting + formatting
pnpm lint
pnpm format

# Vérification des types
pnpm typecheck
```

### Build production

```bash
# Web → Vercel
vercel deploy

# Electron → .dmg / .exe
pnpm electron:build

# Mobile → iOS / Android
pnpm cap:sync
pnpm cap:open:ios      # Ouvre Xcode
pnpm cap:open:android  # Ouvre Android Studio
```

---

## Architecture

### Contextes d'exécution

L'app tourne dans 3 contextes qui partagent le même codebase Next.js :

```
Web (Vercel)          →  API routes côté serveur, Supabase direct
Electron (desktop)    →  Export statique + SQLite local + sync bidirectionnel
Capacitor (mobile)    →  Export statique + Supabase direct + APIs natives
```

Utiliser `getApiUrl(path)` pour tous les appels API — il route automatiquement selon le contexte.

### Dual-store pattern

```typescript
if (window.electron) {
  // SQLite via IPC (window.electron.dbRun/dbAll/dbGet)
  // sync_status: 'pending_insert' | 'pending_update' | 'pending_delete'
  // window.electron.triggerSync()  ← sync immédiat
} else {
  // Supabase direct via createClient()
}
```

La sync Electron ↔ Supabase utilise Last-Write-Wins sur `updated_at`, tourne toutes les 5 minutes.

### Structure des dossiers clés

```
app/(app)/              ← Pages authentifiées (sidebar layout)
  leads/                ← Liste + détail lead (TanStack Table)
  pipeline/             ← Kanban + tableau + prévisions revenue
  prospecting/          ← Scraping UI + enrichissement batch
  automations/          ← Centre de contrôle des automations IA
  inbox/                ← Threads Gmail liés aux leads
  intelligence/         ← Rapport comportemental IA
  assistant/            ← Chat IA + Canvas editor
  settings/             ← Paramètres (profil, IA, automations…)
app/api/                ← API routes Next.js
  cron/                 ← Jobs planifiés (enrich-leads, gmail-check-replies…)
  leads/                ← Enrichissement batch, score, dédup
  proposals/            ← Génération IA par section de proposition
  automations/          ← Trigger manuel des automations
lib/
  reach-context.tsx     ← État global (leads, tasks, workspaces)
  ai.ts                 ← Provider AI (Anthropic/OpenRouter/Groq/Together)
  mock-data.ts          ← Interfaces TypeScript (Lead, Task, etc.)
  google/               ← Google OAuth + refresh token
electron/
  main.cjs              ← Fenêtres Electron + IPC handlers
  database.cjs          ← SQLite schema + migrations
  sync.cjs              ← Moteur de sync SQLite ↔ Supabase
```

### Crons Vercel

| Cron | Schedule | Description |
|------|----------|-------------|
| `enrich-leads` | `0 2 * * *` | Enrichissement nocturne des leads |
| `gmail-check-replies` | Hourly | Détection + classification des réponses |
| `email-sequences` | Hourly | Envoi des étapes de séquences |
| `weekly-report` | Monday | Rapport IA hebdomadaire |
| `process-queue` | Every 5min | File d'attente IA |

---

## Google OAuth — Configuration

1. Créer un projet sur [Google Cloud Console](https://console.cloud.google.com)
2. Activer : Gmail API, Google Calendar API, Google Drive API, People API
3. OAuth consent screen → External, scopes : gmail.modify, calendar.events, drive.file
4. Credentials → OAuth 2.0 Client ID (Web application)
5. Redirect URI : `https://[votre-domaine]/api/google/auth/callback`
6. Ajouter `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env.local`

---

## Licence

Propriétaire — tous droits réservés. Contact : [quebecsaas@gmail.com](mailto:quebecsaas@gmail.com)
