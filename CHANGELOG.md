# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet suit le [versionnement sémantique](https://semver.org/lang/fr/).

## [2.72.0] - 2026-06-19

### Ajouté — Mode Esthétique (LARP), Nouveau Favicon & Bypass Google OAuth
- **Contournement Google OAuth & Gmail** — Suppression du flux `signInWithOAuth` Supabase au profit de notre route d'API personnalisée `/api/auth/google/login`. Utilise directement le secret client Google Cloud de l'utilisateur (configuré en local et en production sur Vercel) et insère les jetons de connexion directement dans la table de base de données `settings`.
- **Support de Redirection Dynamique** — Amélioration de la route `/api/auth/google/callback` pour décoder et extraire l'état dynamique (`userId:redirectPath`) afin de rediriger l'utilisateur vers son point d'origine (comme `/inbox` ou `/settings`).
- **Nouveau Favicon de Marque** — Remplacement du favicon et de toutes ses déclinaisons par le nouveau visuel vert et blanc fourni par l'utilisateur, avec mise à jour associée de `app/layout.tsx` et `public/manifest.json`.
- **Mode Esthétique (LARP) de la page Aujourd'hui** — Ajout d'une option d'affichage premium plein écran avec des thèmes de couleurs stylisés (Crème Élégant, Émeraude Minimaliste, Charbon Sombre) et des formats (1:1, 16:9, 9:16) pour créer et capturer de magnifiques aperçus de performance avec des données réelles ou de fausses statistiques modifiables.

## [2.71.0] - 2026-06-19

### Ajouté — Gamification, Partage de Bibliothèque & Expérience Premium
- **Classement de Performance Gamifié** — Implémentation d'un classement de performance d'équipe et global avec divisions automatiques (Bronze, Argent, Or, Platine), calcul du chiffre d'affaires, taux de conversion, et une fiche profil interactive (compétences, trophées, projets actifs).
- **Invitations d'Équipe Robustes** — Création d'une page client-side d'acceptation d'invitation avec OTP validation (`/invite/[token]`) pour contrer les faux clics générés par les robots des messageries e-mail.
- **Partage Public de Dossiers & Documents** — Ajout d'options de partage public pour les répertoires et fichiers de la bibliothèque, et génération de pages de prévisualisation publiques en lecture seule (`/share/folder/[name]` et `/share/document/[id]`).
- **Outils de Sélection & Déplacement en Masse** — Ajout de checkboxes sur les cartes de fichiers de la bibliothèque et d'une barre flottante bulk-action pour déplacer ou modifier la visibilité de plusieurs fichiers en une fois.
- **Centrage Géolocalisé Map** — Câblage de l'instance de la carte pour centrer et zoomer de manière fluide (`.flyTo`) sur la localisation GPS de l'utilisateur.
- **Graphique d'Activité Hebdomadaire Recharts** — Remplacement de la liste textuelle des activités récentes sur l'écran d'accueil par un graphique Recharts double-barres (leads créés vs leads gagnés sur les 7 derniers jours).
- **Harmonisation de la Marque** — Remplacement de tous les accents et contours orange restants par du vert émeraude (`#10b981` / `#059669`) dans l'ensemble de l'application (Today, Personas, Customizations).
- **ICP en Pleine Page** — Migration de la création et modification des profils cibles (ICP) de boîtes de dialogue vers des routes Next.js dédiées (`/personas/new` et `/personas/[id]/edit`).

## [2.70.0] - 2026-06-18

### Ajouté — Mode Terrain sans Modales & Automations
- **Expérience Outcome Dédiée** — Remplacement complet du modal de résultat de passage par des pages de saisie dédiées (`/field/[planId]/outcome/[leadId]`), offrant une interface plein écran premium et mobile-first.
- **Conversion Automatique des RDV en Deals** — Marquer un lead comme "RDV pris" (`meeting_booked`) met à jour son statut à `'Won'` (Deal) et planifie automatiquement une tâche `'Appel de closing'` pour le lendemain.
- **Séquence de Relance Automatique pour Absence** — Marquer un lead comme "Absent" (`absent`) génère automatiquement une séquence e-mail de relance `'Passé vous voir'` (e-mail immédiat à J+0 et rappel d'appel à J+3) si une adresse e-mail est disponible, ainsi qu'une tâche de rappel locale à J+2.
- **Synchronisation Bidirectionnelle des Tournées** — Câblage de `sync.cjs` pour synchroniser les itinéraires (`route_plans`) et les fiches de visite (`field_visits`) entre SQLite (Electron) et Supabase (Web).
- **Nouvel Endpoint API** — Endpoint `/api/route-plans/visits` gérant les résultats de passage et leurs automatisations associées pour les sessions connectées.

## [2.64.0] - 2026-06-18

### Ajouté — Pages produit
- **`/playbooks`** — 10 playbooks de prospection prêts à l'emploi (Dentistes, Restos <4★, Plombiers, Salons, Ostéopathes, Immobilier, CPA, Gyms, Urgences, Avocats). Chaque playbook contient : persona ICP, preset scraping, séquence type, script d'appel, modèle de proposition. CTA « Déployer » crée une campagne réelle dans le CRM.
- **`/integrations/forms`** — Gestion des webhooks inbound (Typeform, Tally, Webflow, Framer, Générique). Chaque soumission de formulaire crée automatiquement un lead taggé `source=inbound_form`. URL de webhook unique par connecteur.
- **`/client-reports/[id]`** — Vue portail client par workspace : KPIs réels (leads générés, contactés, RDV, deals gagnés, MRR/ARR estimé, taux de conversion, meilleure niche). Basé sur les données réelles de la base.
- **`/webhooks`** — Gestion des webhooks sortants avec sélection d'événements (`lead.created`, `deal.won`, `lead.contacted`, `lead.reply_positive`, `campaign.started`). Bouton « Tester » qui envoie un vrai event HTTP.

### Infra
- Tables Supabase + SQLite : `inbound_webhooks`, `outbound_webhooks`
- Routes API : `/api/webhooks/inbound`, `/api/webhooks/inbound/[token]`, `/api/webhooks/outbound`, `/api/webhooks/outbound/[id]/test`
- Sidebar : Playbooks (après Campagnes), Rapports clients (après Pipeline), Webhooks (dans Plateforme)

## [2.63.0] - 2026-06-18

### Ajouté — Nouvelles sources de prospection
- **Firecrawl + PagesJaunes/YellowPages.ca** — extraction structurée par IA des fiches PagesJaunes Canada (`/api/scrape-maps`). Nécessite une clé Firecrawl gratuite (500 req/mois sur firecrawl.dev). Configurable dans Paramètres → Intégrations → Firecrawl.
- **411.ca direct** — scraping HTML sans clé de 411.ca. Best-effort ; retourne les fiches disponibles dans `__NEXT_DATA__`.
- **Boîte de réception déplacée** — "Boîte de réception" maintenant au-dessus de "Campagnes" dans la sidebar (section CRM & Prospection).
- `@mendable/firecrawl-js` 4.28.0 installé et intégré.

### Modifié
- Sidebar : Boîte de réception avant Campagnes dans la section CRM & Prospection.
- Settings Intégrations : nouvelle carte Firecrawl avec champ de clé API masqué.
- Prospection : PagesJaunes et 411.ca ré-activés avec indication de statut (clé configurée / manquante).

## [2.61.0] - 2026-06-18

### Corrigé — Prospection (critique)
- **DuckDuckGo cassé** — DDG renvoyait une page challenge/bot pour toutes les requêtes server-side (0 résultat depuis des semaines pour Yelp, PagesJaunes, 411). Code DDG supprimé entièrement ; ces trois sources marquées comme "bientôt" dans l'UI.
- **Métiers de service sans données OSM** — `craft=plumber`, `craft=electrician` etc. quasi-absents d'OpenStreetMap Québec. Ajout de `extractNicheKeyword()` : requête Overpass combinée tags + nom de business (ex. "plomb", "electr", "peint") pour capturer les entreprises qui mentionnent le métier dans leur nom.
- **Miroirs Overpass en parallèle** (`Promise.any`) — Les 3 miroirs partent simultanément ; premier à répondre gagne. Élimine les 90s d'attente séquentielle qui causaient des timeouts.
- **`maxDuration` Vercel** — `scrape-maps: 60s`, `scrape-apify: 90s` ajoutés dans `vercel.json`. Sans ça, le plan Hobby coupait les fonctions à 10s avant qu'Overpass puisse répondre.
- **Banner OSM 0 résultats** — Quand OSM ne trouve rien, un banner ambre s'affiche avec l'explication et un lien direct vers la config Apify.

### Modifié
- Description de la page Prospection mise à jour pour refléter les sources réellement fonctionnelles.

## [2.60.0] - 2026-06-18

### Corrigé
- **Carte interactive** (`/map`) — carte invisible sur tous les navigateurs résolue :
  - Coordonnées `center` inversées (`[lat,lng]` → `[lng,lat]` conforme à l'API MapLibre) ; la carte s'affichait en Antarctique au lieu de Montréal.
  - `ResizeObserver` ajouté au composant `Map` (`components/ui/map.tsx`) : `map.resize()` est appelé automatiquement quand le conteneur obtient ses dimensions CSS, évitant un canvas de hauteur 0.
  - Conteneur de carte en `absolute inset-0` + `relative` ajouté à l'élément `<main>` du layout.
  - `map.resize()` appelé dans le handler `load` pour garantir les bonnes dimensions dès le premier rendu.
- **Déploiement Vercel** — `ERR_PNPM_OUTDATED_LOCKFILE` résolu : `pnpm-lock.yaml` commité (résolution des peer deps avec `@playwright/test` n'avait pas été commité).
- **Apify** — `SyntaxError: Unexpected token '<'...` éliminé : la réponse est lue en texte avant `.json()`, la détection HTML retourne un message d'erreur lisible, les erreurs techniques dans le banner sont traduites en indication "Vérifiez votre clé API".

## [2.23.2] - 2026-06-17

### Ajouté
- Optimisation du portefeuille : scores de leads calculés en direct, vues Kanban et cartographiques, synthèse IA et nouvelle étape de profil dans l'onboarding.

### Corrigé
- Erreurs TypeScript `TS7006` corrigées.

### Modifié
- Performance : index SQLite, refonte du chemin critique de synchronisation et ajustement des plafonds mémoire.
- UX : page d'accueil `/welcome` et design minimaliste.

## [2.22.0] - 2026-06-15

### Ajouté
- Page d'accueil `/welcome`.
- Intégrations tierces (Gmail, Drive, Outlook) avec configuration.
- Authentification d'équipe et intégration LDAP via SSO.

### Corrigé
- Gestion des logs d'audit et authentification du back-office.

## [2.11.0] - 2026-06-16

### Sécurité
- Les clés API IA (OpenRouter, Groq, Together.ai) ne sont plus jamais renvoyées en clair au navigateur. Une nouvelle route `app/api/settings/ai-keys` gère la lecture (masquée, format `sk-••••1234`), l'écriture et la suppression côté serveur ; elles ne sont plus mises en cache dans `localStorage`.
- `app/api/team/members` vérifie désormais explicitement que le `workspace_id` demandé appartient à l'utilisateur authentifié (propriétaire ou membre actif) avant de renvoyer la liste des membres.
- `app/api/team/invite` simplifie sa logique d'autorisation en une vérification unique et claire (propriétaire ou rôle admin sur le workspace ciblé).

### Ajouté
- Page dédiée `/integrations/import` : import d'une intégration personnalisée depuis un catalogue illustratif ou une configuration JSON brute.
- Pages dédiées `/help/guides/[slug]` : six guides pas-à-pas avec contenu réel (première campagne, pipeline Kanban, workspace d'équipe, email IA, agents IA, export Drive).
- `lib/lead-badges.ts` : helpers partagés `getTemperatureStyle`/`getTemperatureLabel` pour l'affichage des badges de température des leads.

### Corrigé
- Suppression de tous les liens et boutons sans destination réelle (`href="#"`, menus inertes, alertes placeholder) sur `/team`, `/welcome`, `/integrations` et `/billing` — chacun déclenche désormais une action ou une navigation réelle.
- Téléchargement de facture sur `/billing` génère désormais un véritable document imprimable/PDF.

### Supprimé
- Export `initialAiSuggestions` inutilisé de `lib/mock-data.ts`.
- Trois implémentations dupliquées de `getTemperatureStyle`/`getTemperatureLabel` (consolidées dans `lib/lead-badges.ts`).

## [2.10.0] - 2026-06-16

### Ajouté
- Carte interactive du Québec pour la prospection géolocalisée.
- Marketplace d'agents IA personnalisés.
- Éditeur de bibliothèque basé sur TipTap pour la rédaction de contenu enrichi.

## [2.9.1] - 2026-06-15

### Ajouté
- Étape de profil dans le parcours d'onboarding.
- Avatar dynamique généré pour l'utilisateur.
- Signature email générée par IA.

## [2.9.0] - 2026-06-15

### Ajouté
- Score de leads persisté en base de données.
- Configuration SMTP générique (au-delà de Gmail).
- Tableau de bord de prospection.
- Intégration des fournisseurs IA Groq et Together.ai.
- Pages `/billing` et `/help`.

## [2.8.0] - 2026-06-15

### Modifié
- Mise à niveau vers Electron 43 avec support de macOS 26 Tahoe.

## [2.7.0] / [2.7.1] - 2026-06-15

### Ajouté
- Présence en temps réel et mécanisme anti-collision sur les données partagées.

### Corrigé
- Mécanisme de redémarrage du processus principal Electron sans JIT pour la stabilité sur macOS Sequoia.
- Crash lié au JIT lors de la navigation.

## [2.5.x] - 2026-06-14 — Stabilité desktop macOS

Série de correctifs consolidée (v2.5.1 à v2.5.8) visant la stabilité de l'application Electron sur macOS 26 :

### Modifié
- Remplacement de la couleur orange par le vert dans toute l'interface ; `/welcome` devient l'écran d'accueil, `/today` reste accessible depuis la sidebar.

### Corrigé
- Désactivation du JIT concurrent V8 et compilation `--jitless` pour éliminer un crash `EXC_BREAKPOINT` récurrent sur macOS 26.
- Désactivation du réseau Chromium en arrière-plan pour limiter un crash `DCHECK`.
- Correction du nom de l'application et reprise automatique après un crash du renderer pendant la navigation.
- Suppression du plafond `--max-old-space-size` qui provoquait un crash par manque de mémoire (OOM) lors de la navigation.

## [2.5.0] - 2026-06-14

### Modifié
- Réduction de la consommation de ressources : ajout d'index SQLite, correction d'un problème N+1 dans la synchronisation, chargement différé des fenêtres secondaires, plafonnement du tas mémoire (heap).

## [2.4.0] - 2026-06-14

### Ajouté
- Extraction de la landing page vers la route racine (`/`).

### Corrigé
- Flux d'onboarding et thème au démarrage de l'application.

## [2.3.0] - 2026-06-14

### Ajouté
- Widget popover de la barre système (`/tray`) au design glassmorphisme, avec vérification des tâches SQLite et déclenchement de scraping à la demande.

## [2.1.0] - 2026-06-13

### Ajouté
- Pont natif Capacitor (`lib/native-bridge.ts`), configuration de la plateforme Android et workflows CI/CD Fastlane.

## [2.0.0] - 2026-06-13

### Ajouté
- Icône de barre système (tray) Electron, minimisation à la fermeture de fenêtre, raccourcis de menu applicatif et mise à jour automatique (auto-updater).

## [1.0.0] - [1.9.0]

Itérations initiales de l'application : authentification, gestion des leads, pipeline, paramètres multilingues (FR/EN/DE), tableau de bord d'équipe et journal des modifications in-app. Voir les tags Git correspondants pour le détail commit par commit.
