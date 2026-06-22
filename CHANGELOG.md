# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet suit le [versionnement sémantique](https://semver.org/lang/fr/).

## [3.27.0] - 2026-06-22

### Ajouté — Modèle IA unifié OpenRouter & correctifs de compilation
- **Moteur IA unifié (`lib/ai.ts`)** — Intégration d'un service d'appel IA unifié prenant en charge OpenRouter, Anthropic, Groq et Together.ai. Il gère la cascade intelligente des clés API (clé utilisateur dans l'application > variables d'environnement) et standardise le format des flux streaming SSE (Server-Sent Events) pour le client frontend.
- **Réplication locale SQLite & Sync** — Ajout des colonnes de configuration `openrouter_key`, `ai_provider` et `ai_model` dans SQLite local (`database.cjs`) et configuration de la synchronisation bidirectionnelle Supabase (`sync.cjs`) pour le fonctionnement offline-first natif d'Electron.
- **Refactoring des endpoints** — Mise à jour de 10 routes d'API (chat, brouillon de relance, exécution d'agent, script, séquence, qualification, enrichissement de lead, etc.) pour utiliser la nouvelle interface IA.
- **Correctifs de typecheck et compilation** — Résolution des erreurs TypeScript dans `outreach-root.tsx` (déstructuration de contextUser) et `language-context.tsx` (typage de l'indexation de traduction). Le projet compile maintenant avec succès pour le build de production.

## [3.0.0] - 2026-06-21 à 23:19

### Ajouté — Localisation de l'Assistant, Chat d'Équipe, Avatars de Présence, Sélecteur d'Espace & Stabilité
- **Localisation Dynamique de l'Assistant IA** — L'ensemble de la page de l'Assistant AI est désormais entièrement traduit et s'adapte automatiquement à la langue configurée par l'utilisateur (français, anglais, allemand), remplaçant les textes qui étaient figés en anglais.
- **Messagerie d'Équipe (Chat) Opérationnelle** — Résolution d'un problème de structure de base de données (table `team_messages` pour Supabase) et activation de Realtime pour propager et recevoir instantanément les messages.
- **Affichage des Avatars en Temps Réel** — Correction du bug d'affichage des photos de profil dans les indicateurs de présence en haut à droite. Les utilisateurs s'affichent maintenant avec leur photo de profil configurée plutôt que de simples initiales de texte (`KT`, `UM`) en tirant parti du stockage d'avatar local.
- **Sélecteur d'Espace de Travail** — Modification du comportement pour s'activer uniquement lors d'un clic physique (et non plus au simple survol de la souris), évitant tout comportement erratique ou conflit de focus.
- **Correction de Pureté React Compiler** — Déplacement de la logique temporelle `relativeTime` hors du composant de layout pour corriger une erreur de compilation stricte sur l'utilisation impure de `Date.now()`.

## [2.89.2] - 2026-06-21

### Modifié — Refonte de la page prospection (Retrait de la carte) & Amélioration de l'affichage des leads
- **Retrait de la carte géographique** — Suppression complète de la carte interactive MapLibre sur la page prospection pour permettre à la table de validation de s'afficher sur toute la largeur (layout pleine page).
- **Aperçu enrichi des leads** — Fusion des colonnes d'information pour intégrer directement le nom de l'établissement, sa catégorie (niche), sa ville et une description textuelle autogénérée (présence web, note Google, avis, téléphone) au sein de la colonne principale, offrant un aperçu global en un coup d'œil.
- **Correction de la compilation statique Next.js** — Déportation de la constante `PLAYBOOKS` et des styles de couleurs associés vers un fichier de données partagé non client (`playbooks/data.tsx`), résolvant le plantage de pré-rendu Turbopack de la route `/playbooks/[slug]/view`.

## [2.89.1] - 2026-06-20

### Corrigé — Alignement du schéma de base de données Supabase
- **Script de récupération du schéma SQL** — Création d'un complément de schéma SQL complet pour configurer l'ensemble des tables, politiques de sécurité (RLS), index et triggers manquants (`lead_validations`, `projects`, `campaigns`, `goals`, etc.) sur l'instance Supabase distante afin de résoudre l'erreur de cache PostgREST.

## [2.89.0] - 2026-06-20

### Ajouté — Adaptivité de l'interface, Paramètres épurés & Améliorations de l'Assistant
- **Adaptivité de l'interface globale** — Expansion automatique et fluide des widgets de la page d'accueil (Today) et de toutes les pages utilisant `.max-w-5xl` lorsque la barre latérale gauche est repliée (`max-width: 88rem`).
- **Simplification des paramètres** — Nettoyage complet des paramètres pour ne conserver que 7 sections clés : Profil, Apparence, Espace Général, Membres, IA (incluant directives et clés API OpenRouter), Intégrations et Objectifs.
- **Gmail & Connexion Google Modulaire** — Câblage complet des pages de configuration, d'inbox et de messagerie vers les nouveaux endpoints de redirection OAuth progressifs (`/api/google/auth/start`, `/api/google/auth/status`, `/api/google/auth/disconnect`) de la table `google_accounts`.
- **Liaison CRM & Projets Discussions** — Ajout de sélecteurs de projets Workspace et filtres de recherche dans la liste latérale gauche des discussions de l'Assistant, avec création à la volée.
- **Titre automatique & Markdown Assistant** — Autogénération de titre à partir des premiers mots du message utilisateur, et rendu de syntaxe Markdown performant client-side.

## [2.80.0] - 2026-06-19

### Ajouté — Persistance SQLite/Supabase de l'Assistant IA, Multi-sessions & IA Canvas
- **Persistance DB Offline-First** — Remplacement complet du stockage localStorage temporaire pour l'Assistant IA. Les sessions, les messages et les documents Canvas sont désormais stockés en base SQLite locale (avec des tables `assistant_sessions`, `assistant_messages`, et `assistant_canvas`) et synchronisables.
- **Historique Multi-sessions** — Intégration d'un panneau d'historique latéral rétractable dans la page de l'Assistant, permettant de gérer et de basculer de manière transparente entre plusieurs discussions et documents de l'espace de travail.
- **Extraction Réelle de Fichiers** — Remplacement de l'upload simulé de fichiers par une extraction client-side réelle du contenu des fichiers texte (.txt, .md, .json, .csv) et une injection automatique dans le contexte de l'assistant via des balises XML.
- **Commandes IA dans le Canvas** — Intégration de commandes intelligentes (Sparkles) directement dans la barre d'outils du Canvas pour réécrire, résumer, reformuler, allonger, raccourcir ou adapter le ton (Professionnel, Persuasif, Amical) du document ou du texte sélectionné en temps réel.

## [2.79.0] - 2026-06-19


### Ajouté — Pipeline de Prospection OSM Enrichi, Normalisation & Validation Inbox
- **Normalisation & Dédoublonnement** — Standardisation automatique des numéros de téléphone (`+1 (514) 555-0199`) et nettoyage des tracking parameters des sites web. Dédoublonnement intelligent client-side et CRM-side.
- **Indicateurs de Score** — Système complet de scoring calculant la complétude des données, l'alignement niche-prospect, la proximité géographique et les opportunités commerciales (ex: sans site web).
- **Boîte de Validation (Inbox UI)** — Interface en 4 onglets (*À vérifier*, *Prêts*, *Importés*, *Ignorés*) avec persistance SQLite/Supabase.
- **Raccourcis OSM & Géocodage gratuit** — Mode de recherche par adresse textuelle (via géocodeur gratuit Nominatim) et raccourcis d'édition directe vers l'éditeur iD d'OpenStreetMap ou la signalisation de notes.
- **Merge & Actions en masse** — Possibilité de fusionner des doublons directement depuis le panneau de détails et de valider, exclure ou importer en bloc.

## [2.78.0] - 2026-06-19

### Ajouté — Prospection Géolocalisée OSM (3 modes de recherche)
- **3 modes de recherche dans le prospecteur** — Autour de moi (géolocalisation GPS réelle via le navigateur), Par ville (liste prédéfinie du Québec) et Libre (saisie de texte brut).
- **Overpass around et coordonnées GPS réelles** — Passage automatique de la position exacte à l'API Overpass pour de la prospection hyper-locale par rayon (en mètres).
- **Affichage dynamique du centre et distance Haversine** — Ajout d'une bannière affichant le centre de recherche avec option de tri par distance Haversine depuis le point GPS d'origine.
- **Contrôles de validation** — Désactivation du bouton de recherche en mode GPS tant que les permissions de géolocalisation ne sont pas accordées.

## [2.77.0] - 2026-06-19

### Ajouté — Configuration & Déploiement Hermes Gateway
- **Compétence Minerva (`SKILL.md`)** — Raccourcis et configuration intégrés pour interroger le CRM Minerva directement à partir d'Hermes.
- **Client Python d'aide** — Utilitaire sécurisé avec jeton d'authentification pour piloter les actions CRM en ligne de commande.
- **Panneau Hermes** — Interface visuelle et guides d'installation dans l'onglet API des paramètres.
- **Déploiement Cloud/VPS** — Docker Compose et guides pas-à-pas pour l'exécution H24 d'Hermes.

## [2.76.0] - 2026-06-19

### Ajouté — Agent Hermes ⚡ & Correctif OSM
- **Intégration d'Hermes Agent ⚡** — Couche agent autonome au-dessus des flux CRM et simulations d'actions agentiques.
- **Correctif OSM** — Résolution d'erreur de parsing JSON en sécurisant le décodage contre les retours HTML des miroirs Overpass.
- **Refonte de l'Assistant IA** — Transition vers l'accent vert émeraude du CRM, puces adaptatives et animations fluides.

## [2.75.0] - 2026-06-19

### Ajouté — Filtre d'E-mails Professionnels et Exclusion des Messages Automatiques/Bounces
- **Filtrage Intelligent des Réponses (Inbox & Cron)** — Ajout d'une fonction d'analyse et de filtrage `isBusinessReply` pour la boîte de réception et le script de détection automatique des réponses. Cette fonction inspecte le sujet, l'expéditeur, le snippet et les en-têtes (notamment `Auto-Submitted`) des e-mails entrants pour exclure tous les messages non professionnels :
  * *Bounces & Erreurs de livraison* (ex: Mailer-Daemon, postmaster, noreply, delivery failure, undelivered mail).
  * *Réponses automatiques et messages d'absence* (ex: Out of Office, absent, réponse automatique, automatic reply, auto-repl, auto:).
- **Stabilité du Statut des Leads** — Les e-mails automatiques exclus ne modifient plus le statut du lead en "Meeting Booked" et ne génèrent plus de notifications "Réponse détectée". Seules les réelles réponses de prospects humains s'affichent dans la boîte de réception.

## [2.74.0] - 2026-06-19

### Ajouté — Redesign Assistant IA (Langdock & Canvas) et Icônes de Marque Transparentes
- **Refonte de l'Assistant IA (Pixel Perfect)** — Implémentation complète d'un design inspiré de Langdock avec une interface de discussion épurée et moderne. Ajout d'une zone d'entrée de messages élégante, gestion de l'attachement de fichiers simulée, sélection de modèles IA dynamique, et boutons d'action rapide sous forme de puces interactives.
- **Éditeur Canvas et Affichage Divisé (Split-screen)** — Ajout d'un panneau d'édition latéral Canvas se déployant côte à côte sur PC et sous forme de tiroir glissant (slide-over drawer) plein écran sur Mobile et Tablette. Intégration de la détection et du chargement automatique des blocs de documents (` ```canvas... ``` `) générés par l'IA dans l'éditeur, avec fonctionnalités d'édition de titre, de formatage de texte (headings, gras, italique), de copie et d'export en formats Markdown, HTML et Texte brut.
- **Conditions d'utilisation (Terms of Use)** — Ajout d'une page publique de Conditions d'utilisation (`/terms`) et liaison de celle-ci dans les pieds de page, le menu des paramètres, et le formulaire d'inscription pour assurer la conformité d'accès public.
- **Icônes Transparentes de la Marque** — Extraction et conversion de l'icône de marque `icon-192.png` pour supprimer son arrière-plan beige et l'appliquer de manière homogène sur toutes les variantes d'icônes de l'application (`favicon.ico`, `icon-192.png`, `icon-512.png` et `icon.png`).

## [2.73.0] - 2026-06-19

### Ajouté — Export Image & Partage Réseaux (LARP), Connexion Google App & Bannière de Mise à Jour
- **Bouton d'Authentification Google de l'Application** — Ajout d'une option "Continuer avec Google" sur l'écran de connexion (`/login`) et d'inscription (`/login?mode=signup`), intégrée à Supabase Auth pour simplifier l'accès à l'application.
- **Téléchargement d'Image & Partage Réseaux Sociaux** — Intégration de la librairie légère `html-to-image` pour permettre le téléchargement direct de vos cartes de statistiques du Mode Esthétique sous format PNG ou JPEG. Ajout d'options de partage natif via l'API Web Share (`navigator.share`) et de raccourcis de partage pour LinkedIn, Facebook, et conseils pour Instagram.
- **Bannière Globale de Mise à Jour** — Création d'une bannière de notification esthétique vert émeraude en haut de page pour notifier l'utilisateur lorsqu'une mise à jour est disponible et l'inciter à recharger l'application et explorer le Changelog.
- **Gestion des Droits d'Application Google Non Vérifiée** — Ajout de conseils de configuration et de tutoriels pour contourner l'écran Google unverified app warning ("Google n'a pas vérifié cette application") lors de la synchronisation Gmail.

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
