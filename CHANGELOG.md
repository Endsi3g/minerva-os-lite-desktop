# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet suit le [versionnement sémantique](https://semver.org/lang/fr/).

## [3.71.1] — Apify : mémoire insuffisante causant un plantage systématique du run — 7 juillet 2026, 23h05

### Corrigé
- **"Apify server responded with HTTP 400: run-failed / Actor run did not succeed"** : l'acteur `compass~crawler-google-places` (scraper Google Maps) tournait avec seulement 1024 Mo de mémoire allouée alors qu'il pilote un navigateur Chromium headless par recherche — largement insuffisant, causant un plantage par manque de mémoire (OOM) avant la fin du run. Ce plantage n'était visible que depuis le correctif précédent (le budget de temps trop court masquait auparavant l'erreur en coupant la requête avant qu'Apify n'ait le temps de la signaler). Mémoire relevée à 4096 Mo (recommandation par défaut d'Apify pour cet acteur). Message d'erreur également enrichi pour distinguer un plantage de run (mémoire/anti-bot) d'un problème de clé API.

## [3.71.0] — Fiabilité IA, import CRM silencieux et messagerie éditable — 7 juillet 2026, 22h15

### Corrigé
- **"Échec IA — modèle temporairement saturé" alors qu'un provider sain est configuré** : la cascade de repli IA (`lib/ai.ts`) n'essayait qu'un seul provider de secours avant d'abandonner — si ce second provider (souvent OpenRouter sur un modèle `:free`, fréquemment saturé) échouait aussi, un troisième provider correctement configuré (ex. Anthropic) n'était jamais tenté. La cascade essaie maintenant tous les providers configurés dans l'ordre avant de notifier un échec réel. Retrait au passage d'une attente bloquante de 60 secondes sur un 429 OpenRouter qui retardait inutilement le repli.
- **Import de prospects dans le CRM silencieusement sans effet** : `addLead()` (utilisé par la prospection, l'import CSV/contacts, la création manuelle et l'assistant IA) avalait systématiquement ses erreurs (garde-fou workspace manquant, échec d'insertion Supabase, exception inattendue) sans jamais les remonter à l'appelant. L'interface affichait donc "X prospect(s) importé(s)" même quand rien n'avait été enregistré en base. Toutes ces erreurs sont maintenant propagées, affichées via une notification d'erreur explicite (message réel de la base de données), et n'affichent plus de faux succès — concerne la Prospection (import unique et en masse), l'import CSV et Contacts Google dans Leads, la création manuelle de prospect, et les widgets de création rapide (Pipeline, Aujourd'hui).

### Ajouté
- **Édition et suppression de ses propres messages** dans Messages (chat d'équipe et messages directs) — menu contextuel au survol d'un message envoyé, édition en ligne ou suppression avec confirmation. Répercuté en temps réel chez les autres membres de la conversation.
- **Nouveaux composants shadcn/ui** `Attachment`, `Bubble`, `Marker`, `Message`, `MessageScroller` (+ `Avatar`) intégrés dans la refonte de l'interface de Messages : bulles de conversation, séparateurs de date, pièces jointes fichiers, et défilement à ancrage intelligent (bouton "aller au dernier message", suivi automatique du direct).

## [3.70.0] — Prospection : vrai budget de temps Apify + notifications d'erreurs cliquables — 7 juillet 2026, 20h30

### Corrigé
- **"Aucun client trouvé" malgré une clé Apify valide et connectée** : la route de recherche de prospection (`/api/prospect/search`) coupait l'appel Apify après 42 secondes (`maxDuration = 55` codé en dur, en contradiction avec les 120s déclarées dans `vercel.json`), alors que le scraper Google Maps a besoin de 60 à 100+ secondes pour produire des résultats. Résultat : Apify renvoyait quasi systématiquement 0 établissement, quel que soit l'état réel de la clé ou du compte. Le budget est maintenant aligné (115s côté fonction, jusqu'à 90s pour Apify).
- **Secours OpenStreetMap inefficace** : les 3 miroirs Overpass étaient interrogés un par un (jusqu'à 60s d'attente cumulée si le premier miroir est lent ou bloqué), ce qui pouvait à son tour dépasser le budget de la fonction. Les 3 miroirs sont maintenant interrogés en parallèle (le premier à répondre avec des résultats gagne), comme c'était déjà le cas dans le scraper d'arrière-plan mais pas dans la recherche manuelle.
- **Message d'erreur Apify jamais affiché** : le frontend attendait un champ `apifyError` dans la réponse pour afficher un avertissement, mais le backend ne le renvoyait jamais — ce toast n'apparaissait donc jamais, même en cas d'échec total. Le contrat est corrigé, et les erreurs 401/403/429 d'Apify affichent maintenant un message explicite (clé invalide/expirée, quota dépassé) plutôt qu'un message HTTP générique.

### Ajouté
- **Notifications d'erreurs applicatives cliquables** : toute erreur significative de l'application (échec de prospection sans aucun résultat, erreur serveur, plantage d'interface non rattrapé, erreur JavaScript non gérée) déclenche maintenant une notification dans la cloche, distincte visuellement (point rouge). Cliquer dessus ouvre une fenêtre de détail complet : message exact, contexte structuré (ex. villes/niches recherchées, erreurs de chaque miroir OSM) et stack trace le cas échéant, avec un bouton pour copier le détail. Anti-spam par signature d'erreur (une même erreur répétée ne notifie qu'une fois toutes les 10 minutes).
- Couverture de capture : error boundary React, page d'erreur globale (`global-error.tsx`), pages d'erreur dédiées Carte/Prospection, et un nouveau capteur global (`window.onerror` / `unhandledrejection`) pour les erreurs qui n'atteignent aucun de ces gardes-fous.

## [3.69.1] — Colonnes personnalisées de workspace, import manuel et copie rapide — 7 juillet 2026, 23h30

### Ajouté
- **Colonnes personnalisées persistées** : Intégration d'une colonne `custom_columns` dans la table `workspaces` (SQLite locale et Supabase cloud) pour mémoriser la liste des champs personnalisés définis par l'utilisateur pour son espace de travail.
- **Gestion des colonnes dans les Paramètres** : Ajout d'une section dédiée dans les Paramètres Généraux du Workspace pour lister, ajouter et supprimer des colonnes personnalisées.
- **Champs personnalisés sur la Fiche Prospect** : Rendu dynamique des colonnes personnalisées du workspace dans le volet des propriétés du prospect (`lead-detail-client.tsx`), avec édition en ligne (`InlineTextEdit`) et bouton de création rapide de nouveaux champs.
- **Mappage intelligent à l'Importation CSV** : Détection et suggestion automatique de mappage des en-têtes inconnus vers des colonnes existantes ou vers une nouvelle colonne à créer à la volée. Les nouvelles colonnes détectées sont automatiquement enregistrées au niveau du workspace.
- **Création manuelle de prospect enrichie** : Ajout d'une zone dédiée aux champs personnalisés dans le formulaire de création manuelle de prospect (`new-lead-root.tsx`), avec saisie des valeurs existantes et création à la volée de nouvelles colonnes.
- **Bouton Copie Rapide de Prospect** : Ajout d'un bouton de copie des informations en haut de la fiche de détails du prospect pour copier dans le presse-papiers une synthèse exhaustive de toutes les données du lead (coordonnées, réseaux sociaux, notes de terrain, champs personnalisés) formatée pour l'IA ou pour un document externe.

## [3.69.0] — Amélioration de la prospection, champs personnalisés CSV, relances automatisées et modèles OpenRouter — 7 juillet 2026, 15h50

### Ajouté
- **Scraper de prospects premium Apify** : Restauration complète du scraper premium de Google Places via Apify dans le module de prospection, avec une gestion robuste des diacritiques (accentuation) utilisant une regex ASCII-compatible (`[\u0300-\u036f]`) pour écarter tout plantage à la compilation Vercel/Next.js. Le scraper dispose d'un timeout de secours automatique pour basculer de manière transparente sur OpenStreetMap si nécessaire.
- **Filtres de prospection enrichis** : Intégration d'un curseur d'avis maximum ("Avis maximum", allant jusqu'à 1000/Illimité) à côté de la note et des avis minimums sur la carte, permettant d'exclure les établissements ayant trop d'avis pour cibler la prospection de façon ultra-sélective.
- **Importation CSV dynamique et champs personnalisés** : L'importateur CSV détecte maintenant automatiquement les colonnes non-standards et propose de créer des nouveaux champs personnalisés (ex: `custom__*`). Ces propriétés sont stockées au format JSON dans la table `leads` de la base SQLite et Supabase.
- **Personnalisation d'outreach par variables dynamiques** : Le compositeur et les séquences d'emails interpolent maintenant dynamiquement les balises associées aux colonnes personnalisées du CSV (ex: `{{nom_de_colonne}}`). Des badges/chips violettes spécifiques apparaissent dans la barre d'outils de TipTap pour les insérer facilement.
- **Enrichissement AI contextuel** : Les données des colonnes personnalisées importées sont automatiquement transmises au prompt du copilote de prospection pour guider l'intelligence artificielle dans la rédaction de messages hautement personnalisés.
- **Brouillons de relance automatique dans le Rescue Panel** : Le bouton "Relancer" sur la page de sauvetage des leads crée dorénavant à la fois la tâche manuelle de relance et lance la génération d'un brouillon d'email par l'IA dans l'onglet des brouillons à approuver.
- **Modèles OpenRouter et limites ajustées** : Ajout de raccourcis rapides pour sélectionner les modèles OpenRouter (**Llama 3.3 70B Free**, **Llama 3.3 70B** standard, et **DeepSeek V3**) dans l'onglet Minerva AI des Paramètres, avec détection automatique du provider lors de la sauvegarde. La limite locale d'appels IA a été rehaussée de 8 à 60 requêtes par minute pour absorber les requêtes en batch.

## [3.68.1] — Carte : vraie cause du plantage identifiée et corrigée — 6 juillet 2026, 22h48

### Corrigé
- Le correctif précédent (coordonnées invalides) ne suffisait pas — la vraie cause la plus probable du plantage de la Carte est l'absence totale de vérification du support WebGL avant de créer la carte : sur un navigateur, une machine virtuelle ou un appareil sans WebGL disponible, la bibliothèque de carte plante immédiatement, peu importe les données. Un message clair s'affiche maintenant à la place ("navigateur non supporté") au lieu de faire planter toute la page.

## [3.68.0] — Fiabilité de l'assistant IA, carte et séquences — 6 juillet 2026, 22h33

### Corrigé
- L'assistant IA (page Assistant) pouvait afficher "Erreur IA — OpenRouter streaming error 400" sans jamais essayer un autre modèle IA, contrairement au reste de l'application qui bascule automatiquement sur un second provider en cas d'échec. L'assistant fait maintenant le même repli automatique.
- La page Carte pouvait planter entièrement ("La carte a rencontré un problème") si un lead ou un point avait des coordonnées invalides. Les marqueurs et popups ignorent maintenant silencieusement les coordonnées invalides au lieu de faire planter toute la carte.
- Le créateur de séquence était en partie un module (fenêtre superposée) laissé par erreur dans le code, alors que le bouton "Nouvelle séquence" ouvre déjà la page dédiée complète (`/sequences/new`). Le module inutilisé a été retiré.

## [3.67.0] — Corrections IA, campagnes et Paramètres — 6 juillet 2026, 22h05

### Corrigé
- Des colonnes de lead qui n'ont jamais existé (`leads.name`, `leads.email`, `leads.company`, `leads.last_contacted_at`) faisaient planter la recherche de leads par l'assistant IA et la suggestion de prochaine action — corrigées vers les vraies colonnes.
- Plusieurs notifications "Échec IA" identiques apparaissaient pour un seul événement de saturation du provider IA, à cause d'une vérification et d'une écriture séparées et non simultanées qui laissaient passer plusieurs notifications en même temps. Corrigé, et ajout d'une vraie limite de fréquence des appels IA (8 par minute par utilisateur) avec sa propre notification distincte.
- Une campagne créée en demandant à l'assistant IA n'apparaissait jamais nulle part dans l'application — elle était enregistrée dans un système que rien d'autre ne consulte. Unifiée sur le système réellement utilisé partout ailleurs (page Campagnes, onglet Campagnes d'Outreach, assistant de lancement des Playbooks).
- Lancer un Playbook ne créait en réalité aucun lead (les résultats de la recherche de prospects étaient récupérés puis jetés) et son statut restait bloqué sur "En cours" indéfiniment. Les deux sont corrigés — un Playbook lancé crée maintenant réellement des leads rattachés à sa campagne, et le statut passe à "Terminé" avec un vrai décompte.
- Le lien "Campagne" dans les dernières exécutions de Playbooks menait vers la liste générale au lieu de la campagne concernée.
- Dans Paramètres > Minerva AI, l'outil "Recherche web (Firecrawl)" affichait "Clé requise" même une fois la clé déjà enregistrée.
- Les statistiques "Conversations / Emails rédigés / Recherches web" de Paramètres > Minerva AI étaient des nombres fixes sans lien avec la réalité, rendant impossible de voir la moindre conversation ou recherche correspondante. Remplacées par de vrais comptages du mois en cours, avec liens directs vers les conversations et les emails, et la liste des dernières recherches web affichée directement dans Paramètres.

### Ajouté
- Un vrai graphique en barres (au lieu de simples barres de progression) dans l'onglet Analytics du détail d'une campagne.
- Document technique expliquant comment répliquer la sidebar et la mise en page de l'application dans un autre projet (`docs/DESIGN_SYSTEM_REPLICATION.md`).

## [3.66.0] — Fiabilité IA & prospection en masse — 2026-07-06

### Ajouté
- **Toggle "IA activée"** (Paramètres > Minerva AI), distinct de l'agent autonome — teste immédiatement la connexion à au moins un provider IA lors de l'activation, avec un cron de vérification périodique (toutes les 6h) et une notification automatique en cas de panne (à l'activation ou pendant l'utilisation normale).
- **Onglet Brouillons** dans la Boîte de réception, accessible même sans Gmail connecté.
- **Pipeline d'envoi en batch** : bouton "Générer brouillons IA" sur la sélection multiple de la page Leads, et cron automatique opt-in (désactivé par défaut) qui génère chaque matin des brouillons pour les leads froids éligibles — toujours en attente d'approbation humaine, jamais d'envoi direct.
- **Exploration approfondie du site du prospect** — quand l'enrichissement initial (page d'accueil) ne suffit pas, l'agent explore automatiquement 1-2 pages internes du même site (À propos, Contact, Services) avant de générer le message de prospection.
- **Personas de prospection** enfin persistées côté cloud (table manquante depuis longtemps, invisible en mode web).

### Corrigé
- **Approuver un brouillon ne faisait rien** — ni dans l'onglet Approbations, ni dans Brouillons de l'Inbox, l'approbation ne faisait que basculer un booléen sans jamais mettre l'email en file d'envoi. C'est maintenant réparé : approuver met réellement l'email en file, respectant les mêmes quotas/fenêtres d'envoi qu'avant.
- **Un email envoyé n'apparaissait jamais dans l'Inbox** — l'envoi via la file d'attente n'enregistrait le lien de conversation Gmail que sur la file elle-même, jamais sur le lead, empêchant toute détection de réponse et tout affichage dans l'Inbox.
- **L'enrôlement en masse dans une séquence ne faisait rien** — le premier email d'une séquence n'était jamais amorcé après un enrôlement, les leads restaient bloqués indéfiniment à la première étape.
- **Deux systèmes d'authentification Google coexistaient**, causant des échecs silencieux (envoi d'email, export Drive, réservation de rendez-vous, séquences) pour les comptes connectés uniquement via le flux le plus récent. Consolidé sur un seul système.
- **Génération de brouillons trop générique** — interrogeait des colonnes de lead qui n'ont jamais existé, échouant systématiquement et repliant sur un texte passe-partout. Corrigé et enrichi avec le décideur, la vibe de l'entreprise, les avis Google et la persona/le style configurés par l'utilisateur — jamais exploités auparavant.
- Débit d'envoi du batch augmenté à un rythme réaliste (jusqu'à 10 emails/workspace/passage, toutes les heures en journée au lieu d'une fois par jour) — mêmes quotas configurés, juste un mécanisme d'application correct.

## [3.65.0] — Audit v11 → v12, Phase 10/10 (finale) : automatisations, monitoring, prospection — 2026-07-06

### Corrigé
- **"Enrichir automatiquement à l'import" enfin réellement respecté** — ce réglage dans Paramètres > Automatisations était purement cosmétique : l'enrichissement se lançait systématiquement à chaque nouveau lead, que le réglage soit activé ou non. Vérifie maintenant le réglage avant d'agir.

### Vérifié (déjà fonctionnels, aucun changement nécessaire)
- **Monitoring** (Paramètres > Monitoring) — l'endpoint qui alimente cette page existe et calcule bien des volumes réels (leads créés, réponses détectées, emails envoyés/échoués, actions agent, taux de succès IA) sur les 7 derniers jours. Une fausse alerte de ma part durant l'audit (liée à un build Electron tournant en parallèle qui renommait temporairement le dossier des routes API) m'avait fait croire que la route n'existait pas — elle existe et est correcte.
- **Enrichissement nocturne** (cron quotidien à 2h) et **envoi d'email après enrichissement** et **tag automatique des réponses** — tous les trois consultent et respectent déjà correctement leurs réglages respectifs.
- **Prospection de bout en bout** — carte (Phase 8), enrichissement en masse et scraping revus : aucune anomalie de code trouvée après la correction des fondations de base de données (Phase 0).

## [3.64.0] — Audit v11 → v12, Phase 9/10 : vraies sessions de sécurité, profil synchronisé — 2026-07-06

### Ajouté
- **Vraie détection des appareils connectés** dans Paramètres > Sécurité — affichait auparavant une seule session fictive dérivée du navigateur local, incapable de détecter un second appareil (téléphone, autre ordinateur) pourtant bien connecté. Lit maintenant les vraies sessions actives depuis Supabase Auth, avec possibilité de déconnecter un appareil à distance.

### Corrigé
- **Synchronisation de l'avatar entre appareils** — une fois un avatar mis en cache localement sur un appareil, les mises à jour faites depuis un AUTRE appareil n'étaient plus jamais reflétées (le cache local prenait toujours le pas sur la valeur fraîche de la base de données, indéfiniment). La base de données est maintenant la seule source de vérité ; le cache local ne sert plus qu'à un affichage instantané le temps du chargement.

## [3.63.0] — Audit v11 → v12, Phase 8/10 : stabilité carte + mini-carte Prospecting — 2026-07-06

### Ajouté
- **Mini-carte à clusters dans Prospecting** — affiche tous les leads déjà ajoutés, regroupés en clusters colorés selon leur température moyenne (rouge = chaud, orange = tiède, bleu = froid). Cliquer un cluster zoome ET liste les leads qu'il contient dans un panneau latéral. Filtres par statut et par score minimum directement sur la carte. La carte était importée dans le code mais n'était jamais réellement affichée.

### Corrigé
- **Plus de plantage en cascade sur les pages carte** — `/map` et `/prospecting` n'avaient aucune limite de erreur : un problème sur la carte (coordonnées invalides, tuiles indisponibles) faisait planter toute l'application (écran blanc), forçant à naviguer en arrière puis à revenir pour la retrouver. Chaque page a maintenant sa propre limite d'erreur avec un bouton "Réessayer" qui n'affecte que la carte, pas le reste de l'app.

## [3.62.0] — Audit v11 → v12, Phase 7/10 : messages vocaux, fichiers, chat unifié — 2026-07-06

### Ajouté
- **Messages vocaux** dans `/messages` — enregistrement au micro directement dans le navigateur, aussi long que nécessaire, uploadé vers Supabase Storage (nouveau bucket `voice-messages`) et lu inline avec un lecteur audio. Auparavant, seuls images/GIFs/emojis étaient supportés.
- **Fichiers joints** — n'importe quel type de fichier peut être partagé dans une conversation (bucket `message-files`), affiché comme une pièce jointe cliquable.

### Changé
- **Un seul chat d'équipe** — `/messages` était dupliqué avec l'onglet "Chat d'équipe" de `/team` (les deux écrivaient dans la même table, avec des fonctionnalités qui divergeaient). L'onglet Chat de `/team` a été retiré au profit d'un lien direct vers `/messages`, qui devient le seul et unique endroit pour discuter.

## [3.61.0] — Audit v11 → v12, Phase 6/10 : import CSV pour l'Acquisition — 2026-07-06

### Ajouté
- **Import CSV** sur la page Acquisition : bouton "Importer CSV" à côté de "Créer un lead" (qui existait déjà et fonctionnait). Upload d'un fichier → association des colonnes du fichier aux champs des leads (nom d'entreprise, contact, email, téléphone, ville, secteur, site web) avec suggestion automatique du mapping → import en masse avec barre de progression. Les leads importés sont correctement étiquetés comme provenant d'un import CSV dans le tableau d'attribution (qui affichait déjà cette catégorie, mais qui ne recevait jamais aucune donnée faute d'un moyen d'importer un CSV).

### Vérifié
- Le formulaire de création manuelle de lead existait déjà et fonctionnait correctement (nom, contact, email, téléphone, ville, secteur, site web) — rien à corriger de ce côté.

## [3.60.0] — Audit v11 → v12, Phase 5/10 : galerie de sites web façon marketplace — 2026-07-06

### Ajouté
- **Portfolio de sites web** — dans "Site Web" > Galerie : collez un lien, l'app récupère automatiquement son aperçu (titre, description, image, favicon via les balises Open Graph — un endpoint qui existait déjà, `/api/link-preview`, mais n'était utilisé nulle part), catégorisez-le (Restaurant, Services professionnels, Immobilier...), ajoutez des tags. Recherche et filtres par catégorie façon marketplace. Nouvelle table `saved_websites`, partagée avec toute l'équipe (au lieu d'un stockage local par appareil).
- Sidebar renommée **"Site Web"** (au lieu de "Site web IA") pour refléter que la section couvre maintenant le générateur IA et le portfolio.

## [3.59.0] — Audit v11 → v12, Phase 4/10 : campagnes, groupes dynamiques, tags visibles — 2026-07-06

### Ajouté
- **Groupes dynamiques de leads** — nouveau système de segments par règles (ex: score > 80 ET secteur = Restaurant), qui se mettent à jour tout seuls quand un lead correspond aux critères, sans rien faire manuellement. Nouvelle table `lead_segments`.
- **Séquences ciblant un groupe entier ou une campagne** — jusqu'ici une séquence ne pouvait viser qu'un seul lead à la fois. Depuis `/sequences/new`, on peut maintenant choisir "Segment dynamique" ou "Campagne" comme cible : une séquence individuelle est créée pour chaque lead correspondant (avec barre de progression).
- **Configuration d'automatisation sur les campagnes** — à la création d'une campagne (`/campaigns/new`), en plus du ciblage (niches/villes) déjà existant : choix des canaux de contact (Email/Appel/SMS/LinkedIn), volume quotidien maximum, et bascule approbation manuelle vs 100% automatique. Visible ensuite sur la fiche de la campagne.
- **Tags visibles dans le tableau des leads** — les tags (posés manuellement ou par l'assistant IA via l'outil `tag_lead`) apparaissent désormais comme colonne dans la liste principale des leads, alors qu'ils n'étaient auparavant visibles que sur la fiche individuelle du lead.

### Vérifié
- Le score, la température (chaud/tiède/froid) et le score d'opportunité des leads étaient déjà affichés et filtrables dans le tableau principal — contrairement à ce qui semblait être le cas, ce n'était pas un point à corriger.

## [3.58.0] — Audit v11 → v12, Phase 3/10 : notifications, emails, assistant actionnable — 2026-07-06

### Ajouté
- **Notifications natives sur les actions de l'agent IA** — jusqu'ici, quand l'agent autonome (`/api/agent/loop`, manuel ou cron) exécutait des actions sur le pipeline, rien ne vous en informait. Il envoie maintenant une vraie notification native (déjà suivie en temps réel par l'app) résumant ce qu'il a fait.
- **Bouton "Synchroniser maintenant" dans l'Inbox** — la vérification des réponses Gmail ne tournait qu'une fois par jour (8h), donnant l'impression que l'app ne recevait jamais rien. L'endroit de synchronisation manuelle existait déjà dans le code mais n'était relié à aucun bouton ; c'est corrigé. Le cron automatique passe aussi de 1x/jour à toutes les 2h.
- **Assistant IA capable d'agir réellement** — en plus de créer des leads/tâches, mettre à jour un statut et envoyer un email (déjà fonctionnel), l'assistant peut maintenant : ajouter une note à un lead, lancer un vrai enrichissement (Google Places, site web) sur des leads, et vous amener directement vers une page précise de l'app suite à une demande en langage naturel.
- **Agent autonome enrichi** — les outils `send_email` et `trigger_enrichment` existent maintenant aussi côté agent autonome (`lib/agent-tools.ts`), qui ne pouvait jusque-là que créer des tâches/brouillons/tags mais jamais envoyer un vrai email ni lancer un enrichissement.

### Nettoyé
- Suppression de ~170 lignes de réponses simulées ("Hermes Agent", "Lucifee") dans `/api/chat` qui affichaient de faux logs d'appels d'outils ("Appel d'outil en cours...") sans jamais rien exécuter réellement. Code mort, jamais atteint par le vrai flux (qui appelle bien l'IA réelle) — mais trompeur à la lecture et source probable de confusion sur ce que l'app fait vraiment.

## [3.57.0] — Audit v11 → v12, Phase 2/10 : fiabilité des providers IA — 2026-07-05

### Changé
- **Ordre de priorité des providers IA** : Cloudflare Workers AI (primaire) → OpenRouter (secondaire) → Anthropic Claude (tertiaire), comme demandé. Chaque palier n'est utilisé que si sa clé est réellement configurée ; en production actuellement, seul OpenRouter a une clé valide (Cloudflare et Anthropic attendent encore les identifiants).
- **Vrai mécanisme de repli** — si le provider principal échoue, l'appel retente automatiquement avec le provider suivant dans l'ordre de priorité au lieu d'abandonner directement. Le "repli" existait dans le code mais retournait toujours `null` sans jamais rien faire.
- **Page Paramètres > Modèles** refaite pour afficher les vrais providers supportés (Cloudflare, OpenRouter, Anthropic) avec leur statut en direct (disponible/latence/erreur), à la place d'une liste figée incluant GPT-4o, Groq et Mistral — trois providers qui n'ont jamais eu de branche de code correspondante et ne pouvaient donc jamais fonctionner.
- **Modèle Anthropic par défaut mis à jour** partout dans l'app (assistant, agents, Minerva AI, paramètres) — l'ancien identifiant de modèle codé en dur était périmé.

## [3.56.0] — Audit v11 → v12, Phase 1/10 : navigation & attribution des leads — 2026-07-05

### Changé — Navigation
- **Fini les 3 couches de "Séquences"** : la page `/sequences` (renommée « Séquences, Composer & Cadences ») regroupe maintenant tout — séquences automatiques par lead, modèles réutilisables, rédaction manuelle, file d'envoi et calendrier de relances — via un simple switch de vue. L'ancien onglet « Séquences » imbriqué dans `/outreach` a disparu.
- **Plus de doublon "Inbox"** : l'onglet Inbox a été retiré d'`/outreach` (qui garde Campagnes, Templates, Approbations) — un seul vrai Inbox reste, accessible depuis la sidebar.
- **Une seule page Équipe** : `/team` regroupe maintenant Membres, **Groupes** (nouveau — voir ci-dessous), Chat, Rôles, Charge de travail et Feed revenus. Settings > Membres et Settings > Groupes (qui ne persistaient jamais rien nulle part) ont été retirés.
- **Groupes d'équipe enfin réels** — l'ancien widget "Groupes" des Paramètres était de la donnée locale factice, sans aucune table en base ni moyen d'y assigner un membre. Nouvelle implémentation dans `/team` : créez un groupe, cochez de vrais membres de l'équipe, voyez-les listés dedans. Nouvelles tables `team_groups` / `team_group_members`.

### Corrigé
- **Bug d'attribution des leads scrapés** — un lead importé via le scraping (OSM, Google/Here/Yelp/PagesJaunes) était systématiquement étiqueté « Manuel » dans le tableau d'Acquisition, alors qu'il ne l'était pas. La fonction d'ajout de lead ne renseignait jamais la colonne qui pilote cet affichage ; elle la déduit maintenant correctement de la vraie source.

## [3.55.0] — Audit v11 → v12, Phase 0/10 : fondations base de données — 2026-07-05

Premier volet d'un audit complet de l'application demandé par l'utilisateur (bugs de scraping, campagnes, emails, navigation, IA, sécurité...). Cette phase corrige la cause racine derrière une bonne partie des erreurs remontées : **plusieurs mois de modifications de schéma n'avaient jamais été réellement appliqués à la base de données de production**, alors que le code, lui, avait continué d'évoluer en supposant qu'elles l'étaient. Les phases suivantes (navigation, IA, campagnes, galerie de sites, messagerie, carte, sécurité...) seront livrées une par une, chacune avec sa propre entrée de changelog.

### Corrigé — Base de données
- **Mise en place du suivi officiel des migrations Supabase** (`supabase/config.toml`, historique `supabase_migrations.schema_migrations`) — jusqu'ici, les ~47 fichiers `supabase_migration_*.sql` du projet n'étaient trackés par aucun outil, ce qui a permis à la prod de dériver silencieusement de ce que le code attendait.
- **Colonnes manquantes ajoutées** (sans aucune perte de données, migration additive uniquement) : `leads.google_place_id/google_place_data/google_enriched_at/gmail_thread_id`, `email_sequences.workspace_id/lead_id/status/created_at/updated_at`, `email_sequence_steps.channel`, `campaigns.target_niche/target_city/sequence_ids/created_by`, `settings.firecrawl_api_key/firecrawl_api_key_masked/custom_instructions_about/custom_instructions_model`.
- **`email_sequence_steps.sequence_id`** — la colonne réelle s'appelait `email_sequence_id` alors que tout le code (création de séquence, cron d'envoi, agent IA, statistiques du jour) l'appelle `sequence_id` depuis des mois ; renommée pour correspondre au code, sans perte de données.
- **Brouillons IA créés par l'agent/les automatisations** (`lib/agent-tools.ts`, `lib/automations-engine.ts`) écrivaient dans une colonne `body` qui n'a jamais existé sur la table `drafts` (la vraie colonne est `content`) et oubliaient de renseigner l'auteur du brouillon — ces deux bugs faisaient échouer silencieusement toute génération de brouillon par l'IA. Corrigé.
- Ces erreurs concrètes disparaissent : `column leads.google_place_id/gmail_thread_id does not exist`, `column email_sequences.created_at does not exist`, `column email_sequence_steps.sequence_id/channel does not exist`, `column drafts.body does not exist`, `column campaigns.target_niche does not exist`, `column settings.firecrawl_api_key(_masked)/custom_instructions_about does not exist`.

## [3.54.0] — Release GitHub v11.0.0 — 2026-07-05

Cette release fait suite à un audit complet de l'application (sécurité, build, navigation) mené juste avant, et couvre : correctifs de sécurité critiques, résolution d'une régression bloquant le build de production, mise en place du monitoring, une première tranche du backlog « Revenue OS » (Reply Classifier v2, Lead Rescue Center, Deal Risk Score) et une suite de tests E2E Playwright réellement exécutée et vérifiée.

### Sécurité (P0)
- **Jeton API Cloudflare retiré du code source** (`lib/ai.ts`, `api/ai/gateway/status|providers`) — n'était lu que depuis la variable d'environnement, plus de fallback en dur. **Action requise : ce jeton a été exposé dans l'historique git et doit être régénéré côté Cloudflare.**
- **Jeton de service Hermes** (6 routes `api/agent/*`) — fallback faible `'hermes_service_token_secret_12345'` retiré, comparaison `timingSafeEqual`, échec si `HERMES_SERVICE_TOKEN` n'est pas configuré.
- **Webhooks Twilio/Resend** — rejettent désormais la requête si le secret de signature est absent, au lieu de sauter silencieusement la vérification.
- **Auth manquante ajoutée** sur `generate-proposal`, `notifications/email`, `sms/send`.

### Build & Infrastructure
- **Fix régression build export statique** — 13 pages dynamiques (`leads/[id]`, `workspaces/[id]`, `field/[planId]`, etc.) avaient perdu leur `generateStaticParams()` placeholder lors d'un refactor antérieur (`52e5a53`), cassant silencieusement `pnpm electron:build`/`cap:sync` depuis cette régression. Restauré et vérifié (116 routes exportées avec succès).
- **Fix build de production réel** — `app/api/email-sequences/route.ts` ré-exportait des fonctions internes (`sendGmailStep`, `refreshToken`) en violation des règles strictes de Next.js 16 sur les exports de route, faisant échouer `next build` depuis des mois sans que `tsc --noEmit` seul ne le détecte.
- **Monitoring Sentry** — `@sentry/nextjs` installé et configuré (`instrumentation.ts`, `instrumentation-client.ts`, `app/global-error.tsx`), branché sur l'`ErrorBoundary` existant. No-op tant que `NEXT_PUBLIC_SENTRY_DSN` n'est pas configuré.
- **Nouvelle page `/settings/monitoring`** — volumes réels des 7 derniers jours (leads créés, réponses détectées, emails/SMS envoyés, actions agent, taux de succès IA), statut Sentry.
- **Suite de tests E2E Playwright** — 8 fichiers, 45 tests couvrant auth, leads, pipeline, inbox, agenda, assistant IA, paramètres et navigation complète. Exécutée et vérifiée de bout en bout contre un compte de test réel (43 passés, 2 skip légitimes sur données absentes).

### Ajouté — Backlog Revenue OS (1ère tranche)
- **Reply Classifier v2** — le cron `gmail-check-replies` assumait auparavant que **toute** réponse (même négative) était positive : statut forcé à « Meeting Booked », RDV Google Calendar auto-réservé demain 10h, sans jamais appeler de classification IA malgré son existence dans `lib/agent-tools.ts`. Corrigé : classification réelle (intéressé/pas intéressé/objection/planification/demande info), le statut et le RDV automatique ne s'activent plus que sur réponse réellement positive.
- **Cadences intelligentes** — une réponse négative/objection met désormais en pause automatiquement la séquence active du lead, sur les deux systèmes de séquencement de l'app (`email_sequences` et `sequence_enrollments`).
- **Fix file d'envoi** — `process-queue` envoyait un email déjà en file même si sa séquence parente venait d'être mise en pause ; vérifie maintenant le statut de l'enrollment avant l'envoi.
- **Lead Rescue Center** (`/leads/rescue`) — tableau de bord réel des leads stagnants (nurture/pause/sans contact depuis 14+ jours), réutilise le moteur `lib/nba-engine.ts` existant, action « Créer une relance » en un clic.
- **Deal Risk Score** — badge de risque réel sur les cartes du pipeline (récence d'activité, sentiment de la dernière réponse, probabilité de closing faible sur deal chiffré).
- **Fix `listLeadsToFollowUp`** — utilisait une colonne inexistante (`last_contacted_at` au lieu de `last_activity_at`) et des statuts français ne correspondant à aucune valeur réelle en base (`Client`/`Perdu` vs `Won`/`Lost`), rendant le filtre silencieusement inopérant.

### Navigation
- **`/audit`** (Audit SEO) et **`/personas`** (Profils cibles) reliés à la navigation — pages fonctionnelles jusque-là invisibles.
- **`/recovery`** relié au menu Paramètres & Plus.
- **Suppression du code mort** — `/automations` (top-level, doublon orphelin du vrai builder `/settings/automations`) et `/ops` (cockpit avec animation de terminal factice) retirés, aucune référence externe trouvée.

### Connu — hors scope de cette release
- Le reste du backlog « Revenue OS » (6 agents Hermes spécialisés, Call Intelligence, Meeting Packet automatique, AI Copy Lab, Trust & Compliance Center, Client Portal) reste non commencé — chantiers de plusieurs jours chacun.
- Bug découvert en testant : `invalid input syntax for type uuid: "default_ws"` sur les sessions Assistant/Canvas pour un workspace fraîchement créé — un chemin de code utilise un littéral `"default_ws"` au lieu d'un UUID réel. À investiguer séparément.

## [3.52.0] - 2026-07-02

### Corrigé — Notifications actives, Son confirmé, Vocal → Assistant AI, Carte MapLibre fonctionnelle

#### Carte Interactive (MapLibre GL)
- **Fix CSS tuiles** — Les images de tuiles raster (CartoCDN) étaient bloquées par le reset Tailwind CSS (`max-width: 100%` sur `img`). Ajout d'overrides ciblés `.maplibregl-map img`, `.maplibregl-canvas` et `.maplibregl-canvas-container` avec `max-width: none !important` pour restaurer le rendu complet de la carte.
- **Canvas MapLibre** — Suppression des `border` et `outline` parasites appliqués par le reset `* {}` de Tailwind sur l'élément `<canvas>`.

#### Notifications Natives & Son
- **Permission proactive** — `NotificationPermissionPrompt` affiche maintenant une toast interactive après 5 secondes avec un bouton "Activer" qui déclenche `Notification.requestPermission()` dans un geste utilisateur valide (résout le blocage des navigateurs qui refusent la demande hors interaction).
- **Son déverrouillé** — La création du son de confirmation se fait maintenant depuis le gestionnaire de clic du toast, garantissant que l'`AudioContext` n'est jamais dans un état `suspended` non résolvable.
- **Notification de test** — Envoi d'une notification native de confirmation immédiatement après l'activation pour valider le canal.

#### Voix AI → Redirection vers l'Assistant
- **Nouveau flux vocal** — Le dictaphone global (bouton micro de la topbar) stocke maintenant le transcript dans `localStorage` (`minerva_pending_voice_query`) puis redirige automatiquement vers `/assistant`.
- **Interface simplifiée** — Le panneau flottant montre uniquement le transcript en direct et un champ texte de secours, sans traitement local ni création de tâches en doublon.
- **Pickup automatique** — La page `/assistant` relit `minerva_pending_voice_query` au démarrage et envoie automatiquement le message comme si l'utilisateur l'avait tapé manuellement.
- **Nettoyage état** — Suppression des états `isProcessingVoice`, `copilotMessages`, `messagesEndRef`, `executeProposedTasks` devenus inutiles (économie de ~60 lignes de code et d'un appel API redondant).

## [3.51.0] - 2026-07-02 à 07:48

### Corrigé & Amélioré — Notifications, Voix AI, Carte & Nettoyage codebase

#### Notifications Natives Navigateur
- **Son de confirmation** — Correction du bug AudioContext fermé trop tôt : les sons de confirmation (tâche créée, tâche complétée) sont maintenant bien audibles avec une note douce à 880Hz.
- **Permission navigateur** — La demande de permission système s'ouvre maintenant dès le premier clic sur la cloche (via `onOpenChange`) et non plus après, ce qui garantit le déclenchement dans un geste utilisateur valide.
- **Notification tâche** — Chaque tâche créée ou complétée émet maintenant une notification native `Notification` + son simultanément.

#### Voice Tasker & AI Chat
- **Vraie dictée vocale dans l'Assistant** — Remplacement de la simulation factice par `SpeechRecognition` natif (`continuous: true`, `interimResults: true`) : les résultats s'accumulent en temps réel dans le champ de texte.
- **Redirection après dictée** — Dicter une tâche depuis la page Tâches stocke le transcript dans `localStorage` et redirige automatiquement vers `/assistant` qui relit et envoie le message au démarrage.

#### Carte Interactive
- **MapLibre GL CSS** — Import du fichier CSS `maplibre-gl/dist/maplibre-gl.css` manquant : les tuiles, contrôles de navigation et marqueurs s'affichent maintenant correctement.

#### Nettoyage codebase
- **Suppression des routes dupliquées** — Les dossiers `app/(app)/cockpit/` et `app/(app)/command/` sont supprimés (les composants pilotage sont maintenant dans `app/(app)/today/_components/`).
- **Migrations SQL organisées** — Tous les fichiers `.sql` déplacés depuis la racine vers `supabase/migrations/`.
- **Images déplacées** — Tous les fichiers `image*.png` déplacés vers `docs/assets/`.

## [3.50.0] - 2026-07-02 à 07:36

### Ajouté — Lancement de Minerva v8 — Revenue OS orchestré (Phase 1)
- **Consolidation du Cockpit** — Fusion de Today, Cockpit, Command Center et Agent Feed sous une seule et unique route d'atterrissage `/today`.
- **Système d'onglets unifié** — Navigation fluide entre les onglets **Opérations** (agenda, priorités, actions NBA), **Inbox** (messages), et **Pilotage stratégique** (mémoire IA, rapports hebdomadaires, SLAs, journal d'activité de l'agent).
- **Parcours client en 7 phases** — Ajout d'une barre de progression visuelle comptabilisant en temps réel la répartition de vos prospects le long du tunnel commercial canonique (Nouveau → Relance → Appel → RDV → Proposition → Négociation → Gagné).
- **Outreach Control Center** — Intégration de la file d'approbations de l'agent au sein du cockpit pour valider en un clic les brouillons d'emails ou relances planifiées.
- **Redirection automatique** — Suppression des doublons d'interfaces en redirigeant dynamiquement `/cockpit` et `/command` vers `/today`.

## [3.46.0] - 2026-07-02 à 07:33

### Ajouté — Modèle Google Gemma 4 & Tolérance aux Balises de Raisonnement
- **Intégration de Google Gemma 4** — Bascule par défaut vers le modèle `@cf/google/gemma-4-26b-a4b-it` de Cloudflare Workers AI pour de meilleures performances dans les réponses et le respect du format JSON.
- **Robustesse de l'analyse** — Ajout d'un filtre nettoyant les balises de raisonnement `<think>...</think>` (utilisées par les modèles comme DeepSeek R1). Cela évite les erreurs d'analyse du format et garantit que le Copilote affiche toujours la réponse finale proprement.

## [3.45.0] - 2026-07-02 à 07:07

### Ajouté — Intégration de Cloudflare Workers AI & Nouveau Modèle DeepSeek
- **Hébergement Cloud Workers AI** — Ajout du support de la plateforme d'intelligence artificielle Cloudflare Workers AI directement dans l'application.
- **Modèle intelligent DeepSeek V4** — Configuration du modèle `deepseek/deepseek-v4-pro` comme modèle par défaut. Ce modèle offre des réponses ultra-rapides et hautement intelligentes pour planifier vos tâches et converser avec le copilote Minerva.
- **Sécurisation par jeton** — Utilisation de votre clé d'API Cloudflare et identifiant de compte directement pour s'affranchir de toute configuration technique complexe locale.

## [3.44.0] - 2026-07-02 à 06:55

### Ajouté — Assistant Vocal Intelligent (Copilote) & Liste de Tâches Simplifiée
- **Enregistrement en continu** — Correction d'un problème qui coupait le micro après quelques mots. Vous pouvez désormais dicter de longues phrases ou listes sans interruption.
- **Discussion interactive avec l'IA** — Une nouvelle fenêtre de messagerie vous permet de parler ou d'écrire directement à l'intelligence artificielle de Minerva.
- **Planification intelligente** — L'IA comprend vos demandes complexes (ex: "planifie de relancer Jean demain"), extrait automatiquement les tâches, calcule les dates, et vous présente une liste claire pour validation.
- **Bouton vert de confirmation** — Permet de valider et de créer toutes les tâches détectées en un seul clic.
- **Connexion Cloud via OpenRouter** — Utilisation automatique de modèles d'IA distants pour garantir une exécution rapide et sans configuration complexe sur votre ordinateur.

## [3.36.0] - 2026-06-23

### Ajouté — 7 Nouvelles Intégrations (Maps, Docs, Meeting, Scraping)
- **Google Directions API** — Intégration serveur active (clé API Cloud Maps) pour le calcul d'itinéraires routiers, cyclistes et multi-modes entre plusieurs prospects, visible dans la catégorie `maps`.
- **Google Docs API** — Connexion OAuth permettant de créer, lire et modifier des documents Google Docs directement depuis Minerva pour générer propositions commerciales et comptes-rendus, catégorie `document`.
- **Google Meet REST API** — Intégration active (Private) pour la création automatique d'espaces de réunion Meet via l'API REST officielle lors de la prise de rendez-vous, catégorie `meeting`.
- **Firecrawl** — Connecteur de scraping web propre (Markdown) via la clé API Firecrawl pour enrichir les fiches prospects à partir de leurs sites, catégorie `scraping`.
- **Yelp Fusion** — Enrichissement local des prospects avec avis, notes, photos et horaires via l'API Yelp Fusion, catégorie `scraping`.
- **HERE Maps** — Alternative à Google Maps pour le géocodage et le calcul d'itinéraires, intégrée via clé API HERE, catégorie `maps`.
- **Icônes natives** — Toutes les nouvelles intégrations utilisent leurs icônes officielles via `@thesvg/react` (`Firecrawl`, `Yelp`, `Here`, `GoogleDocs2026`).

## [3.35.1] - 2026-06-23

### Corrigé — Résolution du bug d'affichage des icônes SVG sur la page Intégrations
- **Bugs visuels résolus** — Résolution du problème d'icônes géantes (comme Microsoft Teams) qui chevauchaient et cassaient la mise en page de l'application en s'assurant que les props de dimensions (`width`, `height`) soient bien propagées.
- **Intégration @thesvg/react complète** — Migration de l'ensemble des logos de la page Intégrations (Gmail, Google Drive, Google Maps, Zoom, SharePoint, Microsoft Teams, Todoist, Notion, Slack, Google Tasks, Google Meet) vers les composants officiels de `@thesvg/react`.
- **Nouveau composant Google Contacts** — Ajout d'une icône personnalisée haute fidélité premium pour l'intégration Google Contacts.

## [3.35.0] - 2026-06-23

### Ajouté — Intégration globale des icônes SVG premium (@thesvg/react)
- **Bibliothèque d'icônes SVG** — Intégration de `@thesvg/react` et de composants d'icônes personnalisés haute fidélité pour Gmail, Google Maps, Google Chat, Google Drive, Google Calendar, Google Chrome, Slack, GitHub, Todoist et Microsoft Teams.
- **Remplacement global** — Mise à niveau visuelle des indicateurs d'agenda sur le Dashboard principal et les fiches lead avec le nouveau logo Google Calendar circulaire.
- **Paramètres épurés** — Remplacement systématique des icônes de boîte de dialogue et de configuration de service dans les Paramètres (Gmail, Slack, Notion) par leurs équivalents SVG premium, avec suppression des arrière-plans colorés au profit de boîtes neutres minimalistes.
- **Actions d'engagement** — Intégration des logos Gmail et Google Maps sur les boutons d'action de la fiche lead et les onglets du panneau d'activité.

## [3.34.0] - 2026-06-23

### Ajouté — Redesign Premium UI/UX du Dashboard (Today)
- **Refonte UI/UX du Tableau de bord (Today)** — Suppression de toutes les ombres surélevées (`shadow-sm`, `shadow-md`, etc.) sur l'ensemble des 17 widgets du cockpit.
- **Grille de fond Cult UI** — Remplacement du motif de points radiaux par l'overlay de grille Cult UI linéaire (`bg-grid-pattern-20`) et harmonisation de la couleur de fond en crème warm cream (`bg-[#fafaf8]`).
- **Harmonisation des couleurs d'accentuation** — Remplacement de toutes les occurrences de vert clair `#10b981` ou styles non standard par le vert émeraude de marque officiel (#059669) pour les jauges, barres de progression et icônes.

## [3.33.0] - 2026-06-23

### Ajouté — Redesign Premium UI/UX de 5 Pages Clés & i18n
- **Refonte UI/UX de l'Agenda** — Calendrier mensuel dynamique adapté selon la locale de l'utilisateur, et vues Semaine/Jour horaires stylisées.
- **Refonte UI/UX du Centre d'Acquisition** — Simplification des cartes de statistiques, design minimaliste et outline-style pour les onglets de filtrage.
- **Refonte UI/UX des Comptes / Entreprises** — Vue double colonne épurée, indicateur émeraude de sélection active, et structure en grille fine.
- **Refonte UI/UX des Skills IA** — Liste de compétences sous forme de cartes minimalistes avec interrupteurs de basculement premium et modale de création épurée.
- **Refonte UI/UX des Automations** — Refonte visuelle de la liste des règles (badges SI/ALORS émeraude/gris) et du builder de création en 4 étapes avec indicateurs circulaires.
- **Intégration du motif Cult UI** — Application homogène de la texture de grille `bg-grid-pattern-20` et des bordures hairline fines (`border-[#e5e5e0]`) sans ombres sur l'ensemble de ces pages.
- **Localisation Complète (i18n)** — Traduction intégrale de toutes ces interfaces en français, anglais et allemand (`lib/translations.ts`).

## [3.32.0] - 2026-06-23

### Corrigé — Correction du partage de lead et intégrations Google
- **Partage public de lead** — Résolution du problème de jointure PostgREST instable dans la prévisualisation des partages via deux requêtes Supabase distinctes.
- **Export Google Drive** — Génération de documents Google Docs enrichis (HTML) avec mise en page et marque Minerva au lieu de fichiers texte brut.
- **Services Google** — Ajout de Google Contacts et Google Tasks avec un panneau Google Workspace affichant leur statut en temps réel.
- **Sécurité et Fallback** — Fallback sur Claude Haiku en cas d'erreur de complétion du modèle IA principal lors de la génération de messages.
- **Migration SQL v4.5** — Ajout idempotent des colonnes d'enrichissement sur la table `leads` (`reviews_count`, `maps_url`, `photos`, `social_links`, `latitude`, `longitude`, `assigned_to`, et scores v2) et sécurisation de `lead_shares` avec RLS/grants.

## [3.31.0] - 2026-06-22

### Ajouté — Visionneuse d'images & Nettoyage de la base de code
- **Visionneuse plein écran (Lightbox)** — Ouverture des images et GIFs du module Messages dans un overlay plein écran moderne avec effet flouté et fermeture simplifiée.
- **Auto-persistance des scores** — Sauvegarde automatique des 4 dimensions de score en base de données lors de la première consultation de la fiche d'un lead.
- **Nettoyage et Consolidation** — Suppression de 71 fichiers obsolètes, déplacement des contextes vers `lib/` et mise à jour du README.

## [3.30.0] - 2026-06-22

### Ajouté — Scoring v2 Multidimensionnel
- **Scoring en 4 Dimensions** — Division du score de lead sur 100 points en 4 axes clés de 25 points : ICP Fit, Engagement, Urgence, et Revenu.
- **Interface de score enrichie** — Visualisation détaillée via 4 barres de progression colorées au sein de la fiche lead.
- **Persistance et synchronisation** — Intégration des nouvelles colonnes de score dans SQLite (`database.cjs`) et Supabase avec migration SQL associée.

## [3.29.0] - 2026-06-22

### Ajouté — Messagerie enrichie, Emojis & Processseur d'Envoi
- **Support des images et GIFs** — Affichage natif et compression automatique des images envoyées dans le module de messagerie.
- **Sélecteur d'Emojis** — Ajout d'un panneau d'emojis intégré dans la zone d'envoi.
- **Queue Processor Outreach** — Exécution d'une tâche planifiée toutes les 15 minutes pour l'envoi d'e-mails Gmail et la progression dans les séquences.

## [3.28.0] - 2026-06-23

### Ajouté — Générateur de Proposition Interactif, Scraping Avancé & Script Pitch
- **Générateur de proposition interactif** — Nouvelle interface pour choisir des services (avec presets inclus), modifier les descriptions & prix, ajouter des offres à la volée, et calculer dynamiquement le montant total et les taxes ajustables (GST/QST 14.975% par défaut).
- **Live Preview & Impression PDF minimaliste** — Aperçu papier A4 en temps réel au style minimaliste noir & blanc haute fidélité. Exportation native PDF avec `electron.printToPdf` ou impression par navigateur (`window.print()`).
- **Scraping de site web & Enrichissement lead** — Scraping approfondi de site web (Firecrawl + fallback) pour extraire le gérant (nom, rôle, email), la vibe d'entreprise, et mettre à jour le score d'opportunité global.
- **Pitch de vente Québec 2026** — Génération automatique de script d'appel à froid québécois, conforme aux directives d'outreach direct et personnalisé. Enregistré sous forme de brouillon de type `Call`.
- **Message previews & Correction partage** — Nettoyage automatique des astérisques markdown pour l'aperçu du texte des messages. Résolution de l'erreur `Lead not found` lors de la création d'un partage de lead.

## [3.27.4] - 2026-06-22

### Corrigé — Résolution des modèles OpenRouter obsolètes & nettoyage du scraping
- **Résolution des modèles retirés d'OpenRouter** — Redirection automatique et transparente des modèles free obsolètes (comme `meta-llama/llama-3-8b-instruct:free` et `google/gemma-2-9b-it:free` qui renvoyaient des erreurs 404) vers `openrouter/free` (auto-routeur libre).
- **Nettoyage du Scraping de Site Web** — Ajout d'une fonction de filtrage `cleanFallbackDescription` pour éliminer les images Markdown (`![alt](url)`) et les liens (`[texte](url)`) du texte brut retourné en cas d'échec de la complétion IA.
- **Mise à jour des Paramètres et de la DB** — Remplacement des valeurs par défaut de configuration d'IA par le modèle `openrouter/free` dans les préférences utilisateurs et dans l'initialisation de la DB SQLite locale.

## [3.27.3] - 2026-06-22

### Corrigé — Résolution du runtime de l'API Chat
- **Bascule du runtime de l'API Chat** — Changement du runtime de `/api/chat` de `edge` à `nodejs` (Serverless Function) afin de supporter l'intégration de l'SDK Anthropic (`@anthropic-ai/sdk`) qui référence des modules Node.js natifs (`node:fs`, `node:path`) impossibles à charger dans l'environnement Edge strict de Vercel.
- **Maintien du Streaming** — Le flux de complétion (ReadableStream SSE) reste pleinement opérationnel et fonctionnel sur les serveurs Node.js.

## [3.27.2] - 2026-06-22

### Modifié — Migration Next.js 16 Proxy & correctifs de build
- **Migration Next.js 16 Proxy** — Renommage de `middleware.ts` en `proxy.ts` et de sa fonction exportée `middleware` en `proxy` pour se conformer aux conventions de Next.js 16.
- **Compatibilité runtime Node.js** — Utilisation automatique du runtime Node.js par défaut pour le routeur/proxy, évitant les erreurs de bundle Vercel sur les dépendances internes (`node:fs`, `node:path`).
- **Nettoyage de configuration** — Suppression de la configuration de secours Webpack obsolète dans `next.config.ts`.

## [3.27.1] - 2026-06-22

### Ajouté — Configuration globale de la clé OpenRouter & validation Vercel
- **Configuration globale sur Vercel** — Déploiement et enregistrement de la clé globale `OPENROUTER_API_KEY` sur les environnements de Production, Preview, et Development pour assurer la connectivité de toutes les fonctionnalités IA.
- **Environnement local mis à jour** — Ajout de la clé OpenRouter globale dans le fichier `.env.production.local` pour les tests et exécutions locales.
- **Connexion IA confirmée** — Liaison et validation complète du flux de requêtes entre l'application et OpenRouter.

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
