<div align="center">

<img src="public/icon.png" alt="Minerva OS" width="96" height="96" style="border-radius: 22px;" />

# Minerva OS — Reach Lite

**CRM de prospection B2B autonome pour entrepreneurs québécois**

[![Version](https://img.shields.io/badge/version-v3.72.2-059669?style=flat-square)](CHANGELOG.md)
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
- [Agent Minerva](#agent-minerva)
- [AI Gateway](#ai-gateway)
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

À partir de la v5.2, Minerva embarque un **agent IA autonome** qui perçoit l'état du pipeline, planifie les meilleures actions et les exécute — selon les niveaux d'autonomie configurés par l'utilisateur.

---

## Fonctionnalités

### Prospection & Enrichissement

| Fonctionnalité | Détail |
|---|---|
| **Scraping OSM** | Recherche par niche + ville via l'API Overpass (OpenStreetMap), résultats en temps réel |
| **Google Places** | Enrichissement via Google Places API — note, avis, horaires, photos, catégories |
| **Enrichissement IA** | Description du site web, email de contact, réseaux sociaux, score BANT automatique |
| **Email IA personnalisé** | Génération d'un email de prospection personnalisé par lead (niche, ville, prénom, description site) |
| **Auto-dedup** | Détection et fusion des leads en doublon avant import |
| **Scraping nocturne** | Tâche cron quotidienne qui enrichit les leads sans email en arrière-plan |
| **Score lead** | Score 0–100 basé sur les signaux BANT, actualisé à chaque enrichissement |

### Outreach & Pipeline

| Fonctionnalité | Détail |
|---|---|
| **Séquences multi-étapes** | Délais configurables, personnalisation IA par lead (niche, ville, prénom) |
| **SMS Twilio** | Envoi SMS via Messaging Service, réception des réponses inbound, logs `sms_messages` |
| **Inbox Gmail unifiée** | Threads liés aux leads, détection des réponses, classification d'intent IA |
| **Auto-tagging** | Détection automatique : Intéressé / RDV demandé / Pas intéressé / Hors-scope |
| **Pipeline Kanban** | Colonnes : New → Contacted → Meeting Booked → Proposal Sent → Negotiation → Won / Lost |
| **Propositions PDF** | Builder multi-sections (intro, problème, solution, prix QC, termes), export PDF natif |
| **Prévisions revenue** | Forecast pondéré par probabilité et date de close, graphique 6 mois |

### Intelligence & Agents

| Fonctionnalité | Détail |
|---|---|
| **Rapport hebdomadaire** | Analyse comportementale IA : opportunités, recommandations, score de santé du pipeline |
| **Agent Minerva** | Boucle autonome perceive → plan → act → log avec 7 outils, niveaux d'autonomie par domaine |
| **Mémoire d'agent** | Apprentissages persistants par workspace (`agent_memory`) — niches, campagnes, décisions |
| **Assistant IA** | Chat multi-modèle (Cloudflare Workers AI / OpenRouter / Anthropic) + Canvas editor |
| **AI Skills** | Packs de compétences IA activables, éditeur de skills personnalisés |
| **Agents IA** | Agents personnalisés configurables, feed d'activité en temps réel |
| **AI Gateway** | Provider unifié (Cloudflare + OpenRouter + Anthropic), cascade de repli complète, logs latence par appel |

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

---

## Agent Minerva

L'Agent Minerva est un système IA autonome embarqué dans le CRM. Il tourne en boucle (`POST /api/agent/loop`) et peut être déclenché manuellement ou via cron.

### Architecture de la boucle

```
┌──────────────────────────────────────────────────────────────────┐
│  1. PERCEIVE                                                     │
│     • Leads inactifs ≥ 7 jours avec score ≥ 30                  │
│     • État du pipeline (par étape, score moyen)                  │
│     • Mémoire d'agent (agent_memory) — apprentissages récents    │
├──────────────────────────────────────────────────────────────────┤
│  2. PLAN (Claude / OpenRouter)                                   │
│     • Contexte → Claude → JSON actions[]                         │
│     • Max 5 actions par cycle                                    │
│     • Chaque action contient : tool, params, reasoning,          │
│       data_signals (signaux justificatifs)                       │
├──────────────────────────────────────────────────────────────────┤
│  3. ACT (selon niveaux d'autonomie)                              │
│     • canExecute(tool, autonomy) → exécution directe             │
│     • shouldSuggest(tool, autonomy) → carte dans Today Feed      │
│     • Chaque action loguée dans agent_actions                    │
├──────────────────────────────────────────────────────────────────┤
│  4. LOG + EXPLAIN                                                │
│     • reasoning : "Pourquoi cette action"                        │
│     • data_signals : "Score 82, dernier contact il y a 9 jours" │
│     • result : retour de l'outil                                 │
│     • approved : NULL → peut être validé/rejeté par l'user       │
└──────────────────────────────────────────────────────────────────┘
```

### Outils disponibles (`lib/agent-tools.ts`)

| Outil | Domaine | Description |
|-------|---------|-------------|
| `list_leads_to_follow_up` | — | Leads inactifs avec score minimum |
| `create_task` | `tasks` | Crée une tâche de relance |
| `update_pipeline_stage` | `pipeline` | Déplace un lead dans le pipeline |
| `generate_email_draft` | `emails` | Génère un brouillon email IA |
| `enroll_in_sequence` | `sequences` | Inscrit un lead dans une séquence |
| `plan_field_route` | `field` | Planifie une tournée terrain |
| `update_agent_memory` | — | Mémorise un apprentissage |
| `summarize_pipeline` | — | Résume l'état du pipeline |

### Niveaux d'autonomie

Configurables par domaine dans **Paramètres → IA → Niveaux d'autonomie** :

| Niveau | Comportement |
|--------|-------------|
| `off` | L'agent ne touche pas à ce domaine |
| `suggest` | Carte dans le Today Feed — vous décidez |
| `prepare` | Brouillon/tâche créés mais non envoyés |
| `act_with_approval` | Exécuté après confirmation rapide |
| `auto` | Exécution sans intervention |

### Mémoire d'agent (`agent_memory`)

Chaque workspace possède une mémoire structurée, alimentée par l'agent :

```typescript
{
  type: 'niche_summary' | 'campaign_stat' | 'learning' | 'decision_log',
  key: 'niche:boulangerie' | 'sequence:cold_outreach' | ...,
  content: string,   // résumé en langage naturel
  metadata: {}       // données structurées optionnelles
}
```

La mémoire est injectée dans chaque cycle de planification pour permettre l'apprentissage continu.

### API endpoints de l'agent

```
POST /api/agent/loop              # Lance un cycle complet (auth requise)
GET  /api/agent/loop?workspace_id # Version cron (auth par CRON_SECRET header)
GET  /api/agent/actions           # Journal des actions (+ joins leads)
GET  /api/agent/memory            # Lecture de la mémoire workspace
POST /api/agent/memory            # Écriture / upsert mémoire
DELETE /api/agent/memory?id=      # Suppression d'une entrée mémoire
```

---

## AI Gateway

`lib/ai.ts` est la **source unique** de toute interaction IA dans l'application.

### Providers supportés

| Provider | Modèle par défaut | Clé |
|----------|------------------|-----|
| **Cloudflare Workers AI** (primaire par défaut) | `@cf/moonshotai/kimi-k2.7-code` | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (serveur) |
| **OpenRouter** (secondaire) | `meta-llama/llama-3.3-70b-instruct:free` | `OPENROUTER_API_KEY` (serveur) ou clé utilisateur |
| **Anthropic** (tertiaire) | `claude-sonnet-5` | `ANTHROPIC_API_KEY` (serveur) |

### Cascade de résolution

```typescript
resolveAIProvider(settings?) → { provider, model, apiKey }
buildProviderChain(primary, settings?) → [{ provider, model, apiKey }, ...]

// Ordre de priorité par défaut (aucune sélection explicite utilisateur) :
// Cloudflare Workers AI → OpenRouter → Anthropic — chaque palier n'est
// retenu que si sa clé est réellement configurée.
//
// Un provider explicitement choisi dans settings.ai_provider (ou un
// settings.ai_model dont le format identifie le provider, ex. "@cf/..."
// ou "claude-*") passe devant ce défaut.
//
// generateCompletion()/generateStreamCompletion() essaient TOUS les
// providers configurés dans l'ordre de la chaîne avant d'abandonner —
// pas un simple repli à un seul palier. Si un provider échoue (erreur
// HTTP, réponse vide, modèle de raisonnement qui épuise son budget de
// tokens sans produire de contenu…), l'appel suivant de la chaîne est
// tenté automatiquement, et le message d'erreur final liste l'échec de
// chaque provider tenté.
```

### Fonctions publiques

```typescript
generateCompletion(options: AICallOptions): Promise<string>
// Non-streaming. Logging automatique, fallback intégré.

generateStreamCompletion(options: AICallOptions): Promise<ReadableStream>
// Streaming SSE, compatible Anthropic et OpenRouter.
```

### Logging

Chaque appel IA est loggé en fire-and-forget dans `ai_gateway_logs` (via admin client) :
- `provider`, `model`, `latency_ms`, `success`, `user_id`
- Visible dans **Paramètres → Diagnostics IA**

---

## Stack technologique

| Couche | Technologie |
|--------|-------------|
| **Framework** | Next.js 15 App Router + React 19 |
| **Langage** | TypeScript 5 strict |
| **UI** | Tailwind CSS v4 · shadcn/ui · Radix UI · Framer Motion |
| **Base de données** | Supabase (PostgreSQL + RLS) · SQLite (Electron, offline-first) |
| **Auth** | Supabase Auth (OTP + password) + Google OAuth2 |
| **IA** | Cloudflare Workers AI (primaire) · OpenRouter (secondaire) · Anthropic Claude (tertiaire) |
| **Email** | Gmail API (OAuth2) · Nodemailer (SMTP Resend) · Resend webhooks (svix) |
| **SMS** | Twilio Messaging Service · webhooks entrants avec vérification HMAC-SHA1 |
| **Agenda** | Google Calendar API |
| **Prospection** | OpenStreetMap Overpass API · Firecrawl (optionnel) |
| **Desktop** | Electron (macOS/Windows) — export statique + protocole `app://` |
| **Mobile** | Capacitor (iOS/Android) — même export statique |
| **Déploiement** | Vercel (Serverless Functions + Cron) |

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
│   ├── settings/                 # Profil · IA · autonomie agent · intégrations · diagnostics
│   ├── analytics/                # Dashboard analytique
│   ├── workspaces/               # CRUD workspaces
│   ├── library/                  # Bibliothèque d'assets
│   ├── roadmap/                  # Feuille de route + checklist de vérification
│   └── changelog/                # Notes de version
│
├── api/                          # API Routes Next.js
│   ├── agent/
│   │   ├── loop/                 # Boucle autonome perceive→plan→act→log
│   │   ├── actions/              # Journal des actions agent
│   │   └── memory/               # Mémoire persistante par workspace
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
│   ├── ai.ts                     # AI Gateway — resolveAIProvider + generateCompletion
│   ├── agent-tools.ts            # Outils de l'agent : définitions, dispatcher, gate d'autonomie
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
- **`workspacesList`** / **`activeWorkspace`** — workspace actif persisté dans `settings.active_workspace_id` (Supabase) via `adminClient`
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
- Au moins une clé IA configurée : **Cloudflare Workers AI** (recommandé, primaire par défaut), **OpenRouter**, ou **Anthropic**

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
| `ANTHROPIC_API_KEY` | ⬜ | Clé API Anthropic Claude — provider de repli tertiaire (voir [AI Gateway](#ai-gateway)) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publique de l'app (ex : `https://minerva-os-lite-desktop.vercel.app`) |
| `CRON_SECRET` | ✅ | Secret pour authentifier les endpoints cron Vercel |
| `FIRECRAWL_API_KEY` | ⬜ | Optionnel — scraping avancé PagesJaunes via Firecrawl |
| `OPENROUTER_API_KEY` | ⬜ | Provider IA secondaire — modèles alternatifs gratuits ou payants |
| `SUPPORT_SMTP_HOST` | ⬜ | SMTP pour le formulaire de support (ex : `smtp.gmail.com`) |
| `SUPPORT_SMTP_PORT` | ⬜ | Port SMTP (`587` STARTTLS · `465` SSL) |
| `SUPPORT_SMTP_USER` | ⬜ | Login SMTP |
| `SUPPORT_SMTP_PASS` | ⬜ | Mot de passe SMTP |
| `SUPPORT_EMAIL` | ⬜ | Adresse de destination des tickets support |
| `SUPPORT_SMTP_FROM` | ⬜ | Adresse d'expédition (ex : `onboarding@resend.dev` ou domaine vérifié Resend) |
| `RESEND_WEBHOOK_SECRET` | ⬜ | Secret de signature des webhooks Resend (préfixe `whsec_`) |
| `TWILIO_ACCOUNT_SID` | ⬜ | Account SID Twilio (commence par `AC`) |
| `TWILIO_AUTH_TOKEN` | ⬜ | Auth Token Twilio — vérifie les signatures des webhooks entrants |
| `TWILIO_API_KEY_SID` | ⬜ | API Key SID Twilio (commence par `SK`) — pour envoyer des SMS |
| `TWILIO_API_KEY_SECRET` | ⬜ | Secret de la clé API Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | ⬜ | SID du Messaging Service (commence par `MG`) |
| `HERMES_SERVICE_TOKEN` | ✅ | Secret d'authentification service-à-service pour les routes `app/api/agent/*` (outils Hermes) — aucun fallback en dur, générer avec `openssl rand -hex 32` |
| `CLOUDFLARE_API_TOKEN` | ⬜ | Token Cloudflare Workers AI — **provider IA primaire par défaut** (Kimi K2) dans `lib/ai.ts`, recommandé |
| `CLOUDFLARE_ACCOUNT_ID` | ⬜ | Account ID Cloudflare associé au token ci-dessus |

> Au moins un provider IA (Cloudflare, OpenRouter ou Anthropic) doit être configuré — sans aucune clé, tout appel IA échoue avec un message explicite plutôt qu'une erreur silencieuse.

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
| `supabase_migration_v5_agent.sql` | Tables agent (`agent_memory`, `agent_actions`), colonnes autonomie settings, `ai_gateway_logs`, `sequence_enrollments` |
| `supabase_migration_v6_platform.sql` | Architecture 2 plateformes — layout `(ai)/` |
| `supabase_migration_v8_email_events.sql` | Table `email_events`, colonne `resend_id` sur `email_queue` |
| `supabase_migration_v8_sms.sql` | Table `sms_messages` — logs SMS Twilio (entrants + sortants) |

> **Règles absolues :** Ne jamais utiliser `DROP TABLE`, `TRUNCATE`, `DELETE FROM` sans `WHERE` précis, ni `DROP COLUMN` sans backup confirmé. Voir `CLAUDE.md` pour les détails.

### Tables agent

```sql
-- Mémoire persistante de l'agent
agent_memory (workspace_id, type, key, content, metadata, updated_at)
-- UNIQUE(workspace_id, type, key) — upsert sur (workspace_id, type, key)

-- Journal des actions (exécutées + suggérées)
agent_actions (workspace_id, action_type, lead_id, reasoning, data_signals, result,
               autonomy_level, executed, suggested, approved, created_at)
```

### Schéma SQLite (Electron)

Tout changement de schéma Supabase doit être **mirroré** dans `electron/database.cjs` via `ALTER TABLE … ADD COLUMN` (idempotent grâce au `try/catch` interne de SQLite sur colonnes existantes).

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

## Twilio SMS — Configuration

### 1. Variables d'environnement (Vercel)

```
TWILIO_ACCOUNT_SID=ACbe4def289441404ae8ea0b97f787079e
TWILIO_AUTH_TOKEN=<auth_token>
TWILIO_API_KEY_SID=SK16a81692ae567abb55044bbbc6b9da86
TWILIO_API_KEY_SECRET=<api_key_secret>
TWILIO_MESSAGING_SERVICE_SID=MG44fe1b54612403c37688b7628c28cff4
```

### 2. Webhook Twilio (SMS entrants + delivery status)

URL à enregistrer dans [console.twilio.com](https://console.twilio.com) →
**Develop → Messaging → Services → Minerva OS → Integration** :

```
https://minerva-os-lite-desktop.vercel.app/api/webhooks/twilio
```

- **A message comes in** → `POST` → URL ci-dessus
- **Status Callback** → même URL (le handler détecte automatiquement `MessageStatus`)

> La signature est vérifiée via HMAC-SHA1 avec `TWILIO_AUTH_TOKEN`. En trial, le numéro source est `+12293042345`.

### 3. Envoi d'un SMS

```typescript
// Client
const res = await fetch('/api/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: '+15141234567', body: 'Bonjour !', leadId: lead.id }),
});
```

Ou via curl :

```bash
curl 'https://api.twilio.com/2010-04-01/Accounts/ACbe4def289441404ae8ea0b97f787079e/Messages.json' \
  -X POST \
  --data-urlencode 'To=+15141234567' \
  --data-urlencode 'MessagingServiceSid=MG44fe1b54612403c37688b7628c28cff4' \
  --data-urlencode 'Body=Bonjour !' \
  --data-urlencode 'StatusCallback=https://minerva-os-lite-desktop.vercel.app/api/webhooks/twilio' \
  -u ACbe4def289441404ae8ea0b97f787079e:[AuthToken]
```

### 4. Migration Supabase

Exécuter `supabase_migration_v8_sms.sql` dans l'éditeur SQL Supabase.

---

## SMTP Email — Configuration (Resend)

Le formulaire de support et les notifications par email utilisent Nodemailer via **Resend SMTP** :

```
SUPPORT_SMTP_HOST=smtp.resend.com
SUPPORT_SMTP_PORT=465
SUPPORT_SMTP_USER=resend
SUPPORT_SMTP_PASS=<RESEND_API_KEY>   # clé re_xxxxxxxxx
SUPPORT_EMAIL=quebecsaas@gmail.com
```

> Port 465 = TLS implicite (`secure: true`). Resend n'a pas de limite de volume et les emails sont délivrés immédiatement.

### Webhooks Resend

Enregistrer dans [resend.com/webhooks](https://resend.com/webhooks) :

```
https://minerva-os-lite-desktop.vercel.app/api/webhooks/resend
```

Variable requise dans Vercel :

```
RESEND_WEBHOOK_SECRET=whsec_<votre_secret>
```

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
| `GET /api/agent/loop?workspace_id=` | À configurer | Cycle agent autonome (auth par `CRON_SECRET` header) |

---

## Changelog

Voir [`CHANGELOG.md`](CHANGELOG.md) ou la page [/changelog](app/(app)/changelog/page.tsx) dans l'application.

Dernières versions :

| Version | Date | Points clés |
|---------|------|-------------|
| **v3.72.2** | 2026-07-08 | Diagnostic complet des échecs de la cascade IA (chaque provider tenté est listé, pas juste le dernier) |
| **v3.72.1** | 2026-07-08 | Fix cascade IA : une réponse vide d'un provider (modèle de raisonnement à court de budget de tokens) était traitée comme un succès au lieu de déclencher le repli sur le provider suivant |
| **v3.72.0** | 2026-07-08 | Cloudflare Workers AI (Kimi K2) configuré et rendu provider IA primaire ; correctif du catalogue de modèles dans Paramètres |
| **v3.71.0 – v3.71.2** | 2026-07-07/08 | Cascade IA complète (tous les providers configurés essayés, plus un simple repli à un palier) ; fix des erreurs silencieuses d'import CRM (`addLead`) ; refonte Messages (édition/suppression, composants shadcn Bubble/Message/MessageScroller/Attachment) ; fix mémoire Apify insuffisante (run-failed) |
| **v3.70.0** | 2026-07-07 | Fix budget de temps Apify (prospection ne trouvait aucun résultat malgré une clé valide) ; système de notifications d'erreurs applicatives cliquables (bell + détail complet) |
| **v11.0.0** | 2026-07-05 | Audit sécurité complet (secrets en dur retirés), fix build production, monitoring Sentry, Reply Classifier v2, Lead Rescue Center, Deal Risk Score, suite E2E Playwright |
| **v10.0.0** | 2026-07-02 | Client Reports, Ads & Acquisition redesign, notifications OS |
| **v9.0.0** | 2026-07-02 | Navigation complète, parité visuelle, /notifications, /contacts |
| **v8.0.0** | 2026-06-30 | SMS Twilio (envoi + réception), webhooks Resend (livraison email), revue visuelle complète (64 fichiers), design tokens hex app-wide |
| **v6.0.0** | 2026-06-29 | Architecture 2 plateformes : app/(ai)/ layout, 4 pages IA déplacées, switch topbar, lib/platform-utils.ts |
| **v5.4.0** | 2026-06-29 | Google Places enrichment, email IA personnalisé par lead, sidebar slide + spring animations, tabs mobiles, fix workspace ownership |
| **v5.3.0** | 2026-06-29 | Outreach Control Center : campagnes + approbations réels, 6 outils agent, autonomie outreach granulaire, badge count |
| **v5.2.0** | 2026-06-29 | Agent Minerva (boucle autonome perceive→plan→act→log), mémoire d'agent, niveaux d'autonomie par domaine, AI Gateway unifié |
| **v5.0.0** | 2026-06-28 | Navigation Revenue OS, AI Gateway, Agent Feed, Outreach unifié |

---

## Licence

Propriétaire — tous droits réservés.

Contact : [quebecsaas@gmail.com](mailto:quebecsaas@gmail.com)
