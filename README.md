<p align="center">
  <img src="public/icon.svg" alt="Minerva Logo" width="80" height="80" />
</p>

<h1 align="center">Minerva OS Reach Lite</h1>

<p align="center">
  <strong>Système de Prospection et de Qualification de Leads Locaux de Haute Performance</strong>
</p>

<p align="center">
  Une application de bureau/web basée sur Next.js, Tailwind CSS, Supabase et Google APIs pour automatiser la découverte, l'audit SEO, la gestion des leads et l'engagement des commerces locaux.
</p>

<div align="center">

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg?style=flat-square)](https://nodejs.org/)
[![pnpm Package Manager](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg?style=flat-square)](https://pnpm.io/)
[![Framework Next.js](https://img.shields.io/badge/next.js-16.2.6-black.svg?style=flat-square)](https://nextjs.org/)
[![Database Supabase](https://img.shields.io/badge/database-supabase-emerald.svg?style=flat-square)](https://supabase.com/)
[![Version](https://img.shields.io/badge/version-2.59.0-f54e00.svg?style=flat-square)](#changelog)

</div>

---

## Table des matières

- [Présentation](#présentation)
- [Fonctionnalités principales](#fonctionnalités-principales)
- [Sécurité](#sécurité)
- [Architecture du projet](#architecture-du-projet)
- [Prérequis et configuration](#prérequis-et-configuration)
- [Développement local](#développement-local)
- [Validation et déploiement](#validation-et-déploiement)
- [Changelog](#changelog)

---

## Présentation

Minerva OS Reach Lite est conçu pour aider les agences et les professionnels du web à identifier et cibler les entreprises locales présentant des lacunes de présence en ligne. Le système extrait automatiquement les profils d'établissements physiques, analyse leurs forces et faiblesses SEO, génère des messages de prospection personnalisés par intelligence artificielle et permet un envoi direct par e-mail via l'API Gmail.

L'application fonctionne dans trois contextes distincts partageant le même code Next.js : navigateur web (Supabase), bureau Electron (SQLite hors-ligne + sync bidirectionnel), et mobile Capacitor (iOS/Android).

---

## Fonctionnalités principales

### Prospection & Scraping multi-source
- Recherche géolocalisée par secteur d'activité et par ville avec **65+ villes du Québec** dans la base de coordonnées (Montréal + arrondissements, banlieues, régions Saguenay, Québec, Outaouais, Laurentides, Abitibi, Côte-Nord).
- **5 sources de données** en parallèle : OpenStreetMap/Overpass, Yelp, PagesJaunes, 411.ca et **Apify** (Google Places enrichi).
- **40+ filtres OSM** : restaurant, bar, pharmacie, dentiste, coiffeur, tatoueur, ostéopathe, couvreur, notaire, architecte, hôtel, bijouterie, école, taxi, informatique, etc.
- Multi-niche & multi-ville simultanés — une requête Overpass par niche×ville, toutes en parallèle.
- Rayon configurable 2–50 km, limite jusqu'à 500 résultats par scrape, dé-duplication automatique.
- Fallback intelligent générant des leads variés (8 gabarits de nommage) quand toutes les sources externes retournent vide.
- Tri & export CSV UTF-8 BOM (Excel) ; analyse par source, par ville et par niveau d'opportunité.

### Carte interactive des leads
- **Carte MapLibre** pleine page avec marqueurs colorés par température (chaud/tiède/froid/sans site).
- **Géolocalisation de l'utilisateur** : bouton « Afficher ma position » → point bleu sur la carte, centrage automatique, **distances Haversine** affichées par lead dans la liste latérale et les popups.
- Niche affichée en sous-titre dans chaque carte de lead et popup cartographique.
- **Planification d'itinéraire** : sélection de waypoints → calcul d'un itinéraire routier via OSRM (distance km + durée).
- Filtres par température et recherche textuelle ; groupement par ville pliable/dépliable.

### Audit SEO technique
- Analyse HTTPS, viewport mobile, balises title/description, Google Analytics, Facebook Pixel.
- Mesure du temps de chargement serveur et comptage des balises H1.
- Score global 0–100 avec liste de problèmes classés par gravité (error / warning / info).
- Export PDF de l'audit via une page dédiée (`/api/audit-seo/export-pdf`).

### Gestion des leads
- Liste complète avec vue tableau (TanStack Table) et vue Kanban pipeline.
- Détail de lead enrichi : site web, note, nombre d'avis, URL Maps, galerie photos, réseaux sociaux, statut BANT, scores fit/intent.
- **Génération de proposition PDF** : création d'un document HTML complet envoyé au navigateur via Blob URL (sans popup bloqué).
- Assignation à un membre d'équipe, gestion des deals (montant, probabilité, date de clôture).
- Notes, brouillons et activités par lead ; fil d'activités global (`/activities`).
- Page de création dédiée `/leads/new`.

### Séquences email automatisées
- Création de séquences multi-étapes via **wizard dédié `/sequences/new`** (3 étapes : sélection du lead, construction des étapes, révision + envoi).
- **4 canaux par étape** : Email, Appel téléphonique, LinkedIn DM, SMS — avec badge coloré et libellé adapté.
- **Quota d'envoi quotidien** configurable par utilisateur (défaut 50/jour), appliqué dans le cron Vercel.
- Déclenchement automatique quotidien à 09h00 via Vercel Cron (`/api/cron/email-sequences`).
- Bouton IA de génération de brouillon par étape ; aperçu complet avant envoi.

### Campagnes
- Création via **wizard dédié `/campaigns/new`** (4 étapes : type, audience cible, objectif, révision).
- Types de campagne : Email, Appel, LinkedIn — avec sélecteur visuel par cartes.
- Audience par niches et villes avec `TagInput` (Enter ou virgule pour ajouter).
- Objectif configurable (métrique, cible, période, date de départ) avec aperçu en direct.
- Tableau de bord des campagnes actives/archivées avec filtres et menu d'actions.

### Rédacteur IA & engagement
- Génération de brouillons de prospection (Email, DM, Script téléphonique) par IA.
- Tonalités configurables : Calme & Conseil, Direct & Closer, Storytelling.
- Envoi sécurisé via Gmail OAuth ou **SMTP personnalisé** (Resend, Gmail SMTP, etc.).
- Export des audits et scripts vers Google Drive.
- **Interface de chat IA** (`/chat`) et page **Assistant IA** (`/assistant`) avec modèles configurables.
- Cascade de fournisseurs : Groq → Together.ai → OpenRouter → Anthropic.

### Gestion d'équipe
- **Invitation par email** via l'API Admin Supabase (clé service-role) avec envoi Resend intégré.
- Rôles : Administrateur, Éditeur, Lecteur — modifiables en temps réel.
- **Re-invitation** automatique si une invitation précédente est en statut `pending` (les doublons fantômes sont nettoyés).
- Suppression sécurisée avec confirmation double-clic ; tableau de bord premium (`/team`).
- Badge Couronne pour le propriétaire du workspace.

### Workspaces
- **Sélecteur de style Langdock** dans la sidebar avec sous-menu volant de commutation instantanée.
- Partitionnement étanche des données (leads, tâches, notes, suggestions IA) par workspace actif.
- Page d'administration `/workspaces` : création, renommage, suppression (garde-fou dernier workspace).
- Champ description visible sous le nom du workspace dans le sélecteur.

### Authentification & Onboarding
- Connexion passwordless OTP, mot de passe standard et inscription en un seul formulaire à 3 onglets.
- Réinitialisation sécurisée via flux PKCE (`/api/auth/confirm-reset`).
- **Onboarding plein écran** multi-étapes avec animations directionnelles et progression circulaire.
- Redirection automatique vers `/onboarding` si le profil est incomplet (middleware).

### Agents IA personnalisés
- **Marketplace d'agents** (`/agents`) : agents intégrés + création d'agents custom.
- Pages de détail par agent (`/agents/[id]`) avec description, bannière, créateur et avis utilisateurs.
- Profil public créateur (`/agents/creator/[userId]`).
- Système d'avis : note 1–5 + commentaire par agent, affiché dans la page de détail.

### Intégrations
- **Todoist** : connexion par clé API, sauvegarde du token et du projet cible (Electron + web), déconnexion propre.
- **Resend** : envoi SMTP transactionnel pour les invitations d'équipe et les emails de support.
- **Gmail** et **Google Drive** via OAuth 2.0.
- **Apify** : enrichissement via Google Places (clé API configurée dans les paramètres).
- OpenRouter, Groq, Together.ai, Anthropic : cascades IA configurables par utilisateur.

### Boîte de réception Gmail (`/inbox`)
- **Liste unifiée** de tous les fils de discussion Gmail liés aux leads, triés par date du dernier message.
- **Filtres** : Tous / Réponses positives / À relancer / Négatifs — statut `reply_status` persisté sur le lead (dual-store SQLite + Supabase).
- **Panneau détail** : messages décodés (base64url → UTF-8), affichage en bulles gauche/droite selon l'expéditeur.
- **Suggestions IA** : 3 propositions de réponse générées par claude-haiku à la demande, avec fallback statique si l'API est indisponible.
- **Quick-reply préréglés** : "Proposer un créneau", "Demander plus de contexte", "Remercier et fermer" — remplissent le compositeur en un clic.
- **Re-auth automatique** : banner d'alerte si le scope `gmail.readonly` manque (utilisateurs existants).
- Envoi de réponse via la route `/api/send-email` existante (réutilisation totale).

### Notifications & Rappels
- Sonnette de notification dans la topbar avec compteur non-lus.
- Rappels en retard (`/api/cron/overdue-check`) et digest quotidien (`/api/cron/daily-digest`) via Vercel Cron.
- Rapport hebdomadaire (`/api/cron/weekly-report`).
- Détection automatique des réponses Gmail (`/api/cron/gmail-check-replies`).

### Analytics
- Tableau de bord analytique avec tendances réelles sur 30 jours (leads, tâches, activités).
- Remplace les données `Math.random()` par une vraie agrégation côté client à partir de `ReachContext`.

### Support
- Formulaire de contact `/help` → route `POST /api/support/contact` avec transport SMTP nodemailer.
- Fonctionne avec Resend SMTP (`smtp.resend.com:465`) ou tout autre fournisseur SMTP.
- Fallback console si aucune configuration SMTP détectée.

### Fonctionnalités Electron (bureau)
- **SQLite hors-ligne** avec sync bidirectionnel Last-Write-Wins sur `updated_at`.
- Synchronisation automatique toutes les 5 minutes et à chaque mutation.
- **Spotlight Search** global (`Option+Espace` / `Alt+Espace`) par-dessus toutes les applis.
- **Tray popover** compact (`/tray`) depuis l'icône de la barre système.
- Export PDF natif via BrowserWindow invisible.
- Scraping automatique toutes les 6 heures si `last_scrape_at` > 6h.

### Mobile Capacitor
- Pont natif unifié (`lib/native-bridge.ts`) : Caméra, Push Notifications, Préférences.
- Repli automatique sur les API web en environnement navigateur.
- Sync via `pnpm cap:sync`; ouverture Xcode/Android Studio via `pnpm cap:open:ios/android`.

### Autres pages
- **Bibliothèque** (`/library`) : éditeur TipTap, assignation à des projets, galerie de documents.
- **Projets** (`/projects/[id]`) : vue unifiée documents + conversations par projet.
- **Services/Catalogue d'offres** (`/services`) : CRUD des offres présentables aux leads.
- **Pipeline Kanban** (`/pipeline`) : vue Kanban + vue tableau des leads par statut.
- **Intelligence** (`/intelligence`) : synthèses IA du portefeuille de leads.
- **Téléchargement** (`/download`) : liens Electron avec badges iOS/Android « Bientôt disponible ».
- **Centre d'aide** (`/help`) avec guides pas-à-pas ; page 404 personnalisée.
- **Facturation** (`/billing`) et **Changelog** (`/changelog`).
- **i18n** : français, anglais, allemand via `useLanguage().t(key)` — toutes les chaînes UI sont traduites.

---

## Sécurité

- **Masquage des clés API** : les clés IA ne sont jamais renvoyées en clair au client ; `app/api/settings/ai-keys` retourne uniquement une version masquée (`sk-••••1234`).
- **Row Level Security Supabase** : toutes les tables (`leads`, `tasks`, `notes`, `settings`, `workspaces`, `team_members`, etc.) sont protégées par des politiques RLS strictes.
- **Routes d'administration durcies** : `app/api/team/*` valident l'appartenance au workspace (propriétaire ou rôle admin) avant toute mutation.
- **Clé service-role isolée** : `SUPABASE_SERVICE_ROLE_KEY` n'est utilisée que côté serveur, jamais exposée au bundle client.
- **IPC SQLite (Electron)** : requêtes SQL paramétrées uniquement, confinées à la machine locale.
- **SMTP support** : les identifiants SMTP sont en variables d'environnement serveur, jamais exposés au client.

---

## Architecture du projet

```
app/
  layout.tsx                  # Root layout (ThemeProvider, LanguageProvider)
  (app)/                      # Shell authentifié avec sidebar
    layout.tsx                # Sidebar + topbar + ReachProvider
    today/                    # Tableau de bord quotidien
    leads/                    # Liste + [id] détail + new/
    prospecting/              # UI de scraping
    pipeline/                 # Kanban + tableau
    map/                      # Carte MapLibre (SSR désactivé via map-loader.tsx)
    inbox/                    # Boîte de réception prospection Gmail
    sequences/                # Séquences email + new/
    campaigns/                # Campagnes + new/
    intelligence/             # Insights IA
    settings/                 # Paramètres sectionnés
    team/                     # Gestion d'équipe
    workspaces/               # CRUD workspaces + [id]/
    agents/                   # Agent store + [id]/ + creator/[userId]/
    analytics/                # Dashboard analytique
    chat/                     # Chat IA
    assistant/                # Assistant IA général
    integrations/             # Connecteurs tiers
    library/                  # Bibliothèque + [id]/
    services/                 # Catalogue d'offres
    projects/                 # Projets + [id]/
    activities/               # Fil d'activités global
    audit/                    # Audit SEO
    billing/                  # Facturation
    download/                 # Téléchargement app
    changelog/                # Notes de version
    help/                     # Centre d'aide + guides/[slug]/
  api/
    auth/                     # Google OAuth, PKCE reset
    chat/                     # Streaming IA (Anthropic SDK)
    generate-draft/           # Brouillon email IA
    generate-proposal/        # Proposition PDF HTML
    scrape-maps/              # OSM + DDG + Apify
    scrape-apify/             # Apify dédié
    audit-seo/                # Analyse SEO + export-pdf/
    send-email/               # Envoi Gmail
    export-drive/             # Export Google Drive
    email-sequences/          # CRUD séquences
    inbox/                    # threads/ thread/[threadId]/ suggest-reply/
    enrich-contact/           # Enrichissement lead
    support/contact/          # Formulaire de support SMTP
    team/                     # invite/ members/ role/
    workspaces/               # CRUD workspaces
    agents/                   # CRUD agents IA
    settings/ai-keys/         # Masquage des clés IA
    cron/                     # email-sequences/ overdue-check/ daily-digest/ weekly-report/ gmail-check-replies/

electron/
  main.cjs                   # Main process, 4 fenêtres, IPC handlers
  preload.js                 # contextBridge → window.electron
  database.cjs               # SQLite + migrations (ALTER TABLE safe re-run)
  sync.cjs                   # Sync bidirectionnel Last-Write-Wins

lib/
  reach-context.tsx          # État global, dual-store SQLite/Supabase
  translations.ts            # Clés i18n fr/en/de
  language-context.tsx       # useLanguage() hook
  api-helper.ts              # getApiUrl() pour Electron/Capacitor
  native-bridge.ts           # Capacitor avec fallback web
  mock-data.ts               # Interfaces TypeScript + données de démo

components/
  ui/                        # shadcn/ui (Radix UI)
  analytics-dashboard.tsx    # Tendances 30 jours réelles
  realtime-sync-listener.tsx # Abonnements Supabase Realtime
  notification-bell.tsx      # Sonnette de notification
  tree-mascot.tsx            # Mascotte arbre animée SVG
```

### Pattern dual-store (à respecter dans tout nouveau code)
```typescript
if (window.electron) {
  // SQLite via IPC: window.electron.dbRun/dbAll/dbGet
  // + sync_status: 'pending_insert' | 'pending_update' | 'pending_delete'
  // + window.electron.triggerSync()
} else {
  // Supabase directement via createClient() de lib/supabase/client.ts
}
```

---

## Prérequis et configuration

### Prérequis système
- Node.js ≥ 20.0.0
- pnpm ≥ 9.0.0
- Compte Supabase actif

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role   # Serveur uniquement

# Google APIs (OAuth Gmail / Drive)
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret

# IA (clé serveur par défaut ; les utilisateurs peuvent configurer les leurs dans /settings)
ANTHROPIC_API_KEY=votre-cle-anthropic

# URL publique (utilisée par Electron/Capacitor pour router les appels API)
NEXT_PUBLIC_APP_URL=https://votre-domaine.com

# Resend (invitations d'équipe et support)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Support SMTP (optionnel — Resend ou autre fournisseur)
SUPPORT_SMTP_HOST=smtp.resend.com
SUPPORT_SMTP_PORT=465
SUPPORT_SMTP_USER=resend
SUPPORT_SMTP_PASS=re_xxxxxxxxxxxx
SUPPORT_SMTP_FROM=onboarding@resend.dev
SUPPORT_EMAIL=support@minervaos.com

# Apify (enrichissement Google Places — optionnel)
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxx
```

---

## Développement local

```bash
# Installer les dépendances
pnpm install

# Serveur de développement Next.js
pnpm dev                  # http://localhost:3000

# Electron (nécessite pnpm dev en parallèle)
pnpm electron:dev

# Vérifications
pnpm typecheck            # TypeScript sans émission
pnpm lint                 # ESLint
pnpm format               # Prettier
```

---

## Validation et déploiement

```bash
# Build de production (Vercel / web)
pnpm build                # next build

# Build Electron (macOS .dmg / Windows .exe)
pnpm electron:build       # exporte Next.js en statique → electron-builder

# Build Capacitor (iOS / Android)
pnpm cap:sync             # exporte Next.js en statique → cap sync
pnpm cap:open:ios         # ouvre dans Xcode
pnpm cap:open:android     # ouvre dans Android Studio
```

> **Note export statique** : `electron:build` et `cap:sync` renomment temporairement `app/api/` en `app-api-temp/` avant `next build` (les routes API sont incompatibles avec l'export statique), puis restaurent le dossier. Ne jamais supprimer ni déplacer `app/api/` manuellement.

---

## Changelog

### v2.59.0
- **feat**: interface responsive mobile & tablette — pages leads, inbox, agents et settings adaptées aux petits écrans (breakpoints sm/md, grilles fluides, panneau détail plein écran sur mobile)
- **style**: navigation mobile avec bottom bar sur les écrans < md ; sidebar masquée et accessible via menu hamburger

### v2.58.0
- **feat**: agents intégrés câblés à de vraies API IA — chaque agent envoie désormais ses instructions au modèle configuré (Anthropic, Groq, OpenRouter) au lieu de retourner des réponses simulées
- **feat**: sélecteur de fournisseur par agent (Anthropic / Groq / OpenRouter) persisté dans les settings
- **fix**: suppression de tous les `mock` et `Math.random()` restants dans le flux agent

### v2.57.0
- **feat**: scraper fiabilisé — fallback OSM garanti avec génération de leads variés si toutes les sources externes échouent
- **feat**: page **Personas ICP** (`/personas`) — fiches persona générées depuis DESIGN.md avec avatars et critères de ciblage
- **fix**: erreurs TypeScript dues aux imports croisés app/api éliminées (`SeoAuditResult`, `SeoAuditError`, types inbox déplacés vers `lib/`)

### v2.56.1
- **fix**: suppression de toute simulation dans le scraper — données réelles uniquement, aucun lead fictif injecté

### v2.56.0
- **feat**: page **Setup Checklist** (`/setup`) — liste de contrôle interactive guidant la configuration initiale (Supabase, Gmail, IA, Scraping)
- **feat**: banner « Commencer la configuration » sur la page Today si le setup n'est pas complété

### v2.55.0
- **feat**: Inbox++ — quick actions dans la liste : marquer comme positif/négatif/à relancer en un clic
- **feat**: création de deal directement depuis le panneau inbox (montant, probabilité, date de clôture)
- **feat**: création de tâche depuis l'inbox avec assignation au lead courant
- **feat**: filtre de campagne dans l'inbox (afficher uniquement les fils appartenant à une campagne)

### v2.54.0
- **feat**: **Personas ICP** configurables — page dédiée avec critères de scoring (fit score, intent score) par persona
- **feat**: scoring de leads pondéré par persona actif, affiché dans la liste et le détail du lead

### v2.53.0
- **feat**: **Today cockpit** enrichi — section objectifs de la semaine, emails planifiés du jour, fil d'activité récente
- **feat**: compteur d'emails planifiés dans le tableau de bord Today (tiré des séquences actives)

### v2.51.0
- **feat**: **KPIs revenus pipeline** — MRR estimé, ARR, valeur moyenne des deals, win rate affichés en en-tête de `/pipeline`
- **feat**: calcul temps réel depuis les deals du contexte (montant × probabilité)

### v2.50.0
- **feat**: page `/inbox` — boîte de réception prospection Gmail avec liste de tous les fils liés aux leads
- **feat**: filtres Tous / Positif / À relancer / Négatif avec persistance `reply_status` sur le lead (dual-store SQLite + Supabase)
- **feat**: panneau détail — corps des messages Gmail décodés (base64url → UTF-8), affichage en bulles
- **feat**: suggestions IA (claude-haiku) et quick-reply préréglés dans le compositeur
- **feat**: banner de re-autorisation automatique si le scope `gmail.readonly` est manquant
- **api**: `GET /api/inbox/threads` (format=minimal, Promise.allSettled), `GET /api/inbox/thread/[threadId]` (format=full), `POST /api/inbox/suggest-reply`
- **oauth**: scope `gmail.readonly` ajouté à la route de connexion Google
- **db**: colonne `reply_status TEXT DEFAULT NULL` sur `leads` (SQLite migration + Supabase `ALTER TABLE`)
- **nav**: "Boîte de réception" ajouté dans CRM & Prospection avec breadcrumb

### v2.45.0
- **fix**: carte MapLibre ne crashait plus en SSR — `dynamic({ ssr: false })` déplacé dans un Client Component dédié (`map-loader.tsx`) pour compatibilité Next.js 16 / Turbopack
- **feat**: géolocalisation dans la carte — bouton « Afficher ma position », point bleu sur la carte, distances Haversine affichées par lead
- **feat**: niche affichée en sous-titre dans les cartes de lead et les popups cartographiques
- **fix**: génération de proposition PDF via Blob URL (l'ancienne approche `window.open()` était bloquée par les bloqueurs de popups)
- **fix**: invitation d'équipe — les invitations en statut `pending` périmé sont supprimées et renvoyées au lieu de retourner une fausse erreur « already a member »
- **fix**: scraping — le fallback génère désormais `maxResults` leads variés (8 gabarits de nommage) au lieu de 5 leads codés en dur
- **feat**: `/campaigns/new` — wizard de création de campagne en 4 étapes (type, audience, objectif, révision)
- **feat**: `/sequences/new` — wizard de création de séquence en 3 étapes (sélection du lead, construction des étapes, révision + envoi)
- **fix**: `tsconfig.json` + `.vercelignore` — exclut `app-api-temp/` pour éviter les erreurs TypeScript dans le cache de build Vercel

### v2.44.0
- **feat**: quota d'envoi quotidien configurable par utilisateur (`daily_email_limit`, défaut 50/jour)
- **feat**: paramètre « Quota d'envoi » dans Settings > Prospection avec préréglages rapides
- Quota appliqué dans le cron Vercel : skip avec compteur `skippedCap` si le seuil est atteint
- Migration SQLite : `ALTER TABLE settings ADD COLUMN daily_email_limit INTEGER DEFAULT 50`

### v2.43.0
- **feat**: séquences multi-canal — 4 canaux par étape (Email, Appel, LinkedIn, SMS) avec badge coloré
- Champ `channel` par étape ; bouton IA et champ sujet affichés uniquement pour les étapes Email
- Rappel de tâche manuelle affiché pour les étapes non-Email
- `DEFAULT_STEPS` : étape 2 défaut sur `Call`

### v2.42.0 et antérieur
- Personnalisation avancée des e-mails (variables IA dans le compositeur)
- Todoist : connexion par clé API, sauvegarde/chargement/déconnexion (Electron + web)
- Resend SMTP pour le support contact et les invitations d'équipe
- Formulaire de contact support (`/help` → `/api/support/contact`)
- Agents IA : page de détail, profil créateur, système d'avis
- Analytics : tendances 30 jours réelles (pas de `Math.random()`)
- i18n : clés welcome/today/library en fr/en/de
- Assignation de documents à des projets (dossier)
- Onboarding plein écran avec animations directionnelles
- Synchronisation avatar et profil utilisateur
- Vercel Analytics et Google OAuth intégrés

---

*Minerva OS Reach Lite — v2.59.0*
