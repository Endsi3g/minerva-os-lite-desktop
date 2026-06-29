# PRD Cofounder — Minerva v5

## Vision

Minerva v5 transforme Minerva d'une application riche en modules en un **Revenue OS hybride terrain + digital** pour équipes locales, centré sur un seul résultat visible : convertir des leads provenant du terrain, des publicités, des formulaires et de l'outbound en rendez-vous avec le moins d'effort manuel possible.[cite:201][cite:210][cite:209]

La thèse produit de v5 est que la valeur ne vient plus d'un plus grand nombre de pages ou de capacités IA exposées, mais d'un système qui décide, prépare et exécute les meilleurs prochains mouvements commerciaux avec une logique claire, visible et pilotable.[file:183]

## Pourquoi v5 maintenant

Le produit a déjà accumulé une profondeur fonctionnelle importante : prospection, inbox, agenda, mode terrain, comptes, automatisations, templates, scoring, intelligence comportementale, preuves de visite, intégrations Google, Slack et Notion, ainsi qu'une couche IA et des capacités agentiques en cours.[file:183] Cette richesse crée aussi trois tensions produit majeures : proposition de valeur trop large, navigation devenue dense, et perception d'une IA encore séparée du travail réel plutôt qu'intégrée au moteur du produit.[file:183][cite:201]

v5 doit donc être une version de **compression produit** : moins de dispersion visible, plus de hiérarchie, plus d'automatisation réelle, et une architecture IA enfin fiable grâce à une gateway interne unifiée et observable.[file:183][web:217]

## Positionnement

### Positionnement court

Minerva aide les équipes locales à convertir leurs leads terrain, pub et outbound en rendez-vous plus vite, avec moins d'effort manuel.[file:183]

### Positionnement long

Minerva v5 est un Revenue OS hybride qui unifie la prospection locale, l'outreach, le terrain, l'agenda et l'automatisation dans un seul système. Chaque lead entrant ou trouvé devient un objet actionnable, enrichi, priorisé, suivi et poussé vers le prochain mouvement commercial pertinent jusqu'au booking ou à la clôture.[file:183][cite:209]

### ICP prioritaire

Le cœur de cible est constitué de petites équipes commerciales locales, agences locales, structures de services B2B locales, closers terrain et équipes hybrides qui mélangent prospection locale, visites, leads entrants et suivi commercial quotidien.[file:183]

### Promesse produit

- Plus de rendez-vous.
- Moins de leads oubliés.
- Moins de temps administratif.
- Une meilleure vitesse de traitement.
- Une exécution commerciale plus cohérente à l'échelle d'une petite équipe.[file:183]

## Principes produit v5

1. **Le flow avant les features** — Toute décision produit doit renforcer le flow lead -> action -> booking -> revenu.[file:183]
2. **L'IA comme moteur, pas comme onglet** — L'intelligence doit apparaître dans les écrans métier, pas comme une destination parallèle.[file:183][cite:207]
3. **Le système doit être visible et pilotable** — Toute action automatisée doit avoir un état, une cause, un log et un niveau d'autonomie.[file:183]
4. **La surface doit être simple, le backend peut être profond** — La complexité doit vivre derrière une architecture claire, pas dans la navigation.[cite:203][cite:201]
5. **Le terrain est un différenciateur stratégique** — Le mode terrain n'est pas un module annexe; il fait partie du cœur de la catégorie produit choisie.[file:183]

## Ce qu'on garde

Les briques suivantes restent au cœur de v5 car elles servent directement le flux de revenu et ont déjà été investies de manière crédible :

- Prospection locale et enrichment leads.[file:183]
- Leads, fiches lead, scoring et contexte CRM.[file:183]
- Pipeline commercial.[file:183]
- Inbox Gmail et lecture/réponse assistée.[file:183]
- Agenda, booking links, disponibilité et rendez-vous.[file:183]
- Terrain : tournées, outcomes, preuves, galerie, scripts de visite et GPS live.[file:183]
- Automations, notifications, relances suggérées et tasks.[file:183]
- Accounts / vue 360 entreprises.[file:183]
- Templates, playbooks et reporting opérationnel déjà connectés au réel.[file:183]
- Intégrations métier utiles : Google, Slack, Notion, formulaires et webhooks.[file:183]

Le changelog reste conservé et accessible; il ne sort pas du produit, mais il ne doit plus concurrencer les écrans de travail dans la hiérarchie principale.[file:183]

## Ce qu'on fusionne

### 1. Leads + Accounts + Pipeline + Timeline

Ces surfaces décrivent la même réalité commerciale sous plusieurs angles. En v5, elles deviennent une seule famille produit : **Leads**.[file:183]

Sous cette famille :
- Vue liste.
- Vue pipeline.
- Vue comptes.
- Timeline unifiée.
- Détail lead / détail compte avec même langage d'action.[file:183]

### 2. Assistant + Intelligence + Skills

Ces trois surfaces sont aujourd'hui trop séparées. En v5, elles deviennent :
- un **Agent Panel** global contextuel,
- un **Agent Feed** intégré à l'accueil et aux objets métier,
- un **Agent Studio** secondaire dans les réglages avancés pour la configuration de skills et comportements.[file:183][cite:207]

### 3. Automations + actions agentiques + observabilité

Les règles, actions automatiques, suggestions et logs doivent vivre dans une même surface : **Automation Control**.[file:183]

Cette fusion permet de répondre au problème actuel : le système agit, mais pas encore de façon assez visible, prévisible et pilotable.[file:183]

## Ce qu'on cache ou rétrograde

Les éléments suivants restent disponibles, mais passent hors navigation centrale :

- Roadmap produit.[file:183]
- Changelog produit, qui reste conservé et mieux relié aux annonces de mise à jour, mais non prioritaire dans la nav principale.[file:183]
- Skills en tant qu'écran de premier niveau.[file:183]
- Le nom Hermes côté utilisateur; il devient un terme interne d'infrastructure tant que la couche runtime n'est pas totalement fiable.[file:183][cite:211]
- Les écrans IA trop “plateforme” qui ne sont pas directement reliés à une action métier.[file:183]

## Navigation finale v5

La navigation principale doit refléter la machine à revenu, pas l'organisation interne du code :

| Entrée | Rôle principal |
|---|---|
| Accueil | Cockpit exécutable, priorités, Agent Feed, approbations, actions du jour |
| Leads | Liste, pipeline, comptes, timeline, détail lead et compte |
| Outreach | Inbox, séquences, campagnes, templates, approvals |
| Terrain | Carte, tournées, visites, preuves, outcomes, scripts |
| Agenda | Rendez-vous, calendrier, booking, disponibilité, suivis |
| Équipe | Activité, assignations, mentions, présence, permissions |
| Paramètres | Intégrations, automations, Agent Studio, billing, préférences |

Le changelog reste accessible depuis :
- bannière de mise à jour,
- menu profil / aide,
- page Paramètres > Produit / mises à jour.[file:183]

## Architecture IA cible

## Problème à résoudre

OpenRouter connecté mais non fiable, Hermes non fonctionnel comme runtime produit, et perception d'une IA présente mais encore trop détachée des workflows réels.[file:183]

## Décision d'architecture

Minerva v5 ne doit plus appeler directement un provider externe depuis plusieurs couches éparses. Toute demande IA passe par une **AI Gateway interne** déployée sur Railway, qui devient l'unique point d'entrée pour le runtime IA du produit.[web:217][web:212]

### Flux cible

1. L'UI Minerva déclenche une action IA.
2. L'app appelle l'AI Gateway.
3. L'AI Gateway sélectionne le provider ou le modèle.
4. Si le provider est froid, la Gateway lance un wake/ping préalable.[web:213]
5. La Gateway exécute la requête, gère timeouts, retries et fallback.
6. Le résultat revient avec logs, statut, provider utilisé, durée et erreurs éventuelles.[web:217]
7. L'action est affichée dans l'Agent Feed et l'historique d'automations.[file:183]

### Composants de l'AI Gateway

- `POST /v1/chat/completions`
- `POST /v1/responses`
- `GET /health`
- `GET /status`
- `POST /wake`
- `GET /providers`
- `GET /logs/:requestId`
- `POST /embeddings` si nécessaire plus tard

### Responsabilités de la Gateway

- Authentifier les appels internes de Minerva.
- Router vers OpenRouter, un modèle privé Railway/vLLM, ou un fallback futur.[web:212]
- Gérer warmup, wake et readiness checks.[web:213][web:217]
- Uniformiser les payloads.
- Journaliser latence, erreurs, provider choisi, fallback et succès.
- Exposer un statut simple à l'UI.

### Railway

Railway propose un déploiement vLLM prêt à l'emploi et documente les healthchecks HTTP, ce qui en fait une bonne base pour héberger soit un gateway simple, soit un serveur de modèle compatible OpenAI derrière ce gateway.[web:212][web:217]

### Stratégie recommandée

#### Phase 1 — Gateway légère

Déployer d'abord une gateway légère sur Railway, sans forcément héberger immédiatement un gros modèle maison. Cette gateway route vers OpenRouter et centralise l'observabilité, ce qui traite le problème réel avant d'ajouter de la complexité d'infrastructure.[file:183]

#### Phase 2 — Wake / warmup

Ajouter le pattern `POST /wake` + polling de `GET /status` ou `GET /health`, afin de réveiller un backend IA avant usage. La documentation vLLM documente explicitement un mode sleep/wakeup pour les moteurs d'inférence.[web:213]

#### Phase 3 — Modèle privé

Une fois la gateway stable, brancher un provider privé derrière elle : vLLM sur Railway si les ressources le permettent, ou un autre backend compatible OpenAI. Minerva continue de parler uniquement au gateway.[web:212]

## Niveaux d'autonomie

v5 doit introduire des niveaux d'autonomie lisibles et configurables :

| Niveau | Comportement |
|---|---|
| Off | Pas d'action IA automatique |
| Suggest | L'IA propose seulement |
| Prepare | L'IA prépare messages, tâches, notes, sans exécuter |
| Act with approval | L'IA agit après validation humaine |
| Auto | L'IA exécute automatiquement selon règles |

Ce niveau doit être configurable par type d'action : scoring, enrichissement, relance, création de tâche, booking suggestion, classement reply, changement de statut, notification équipe.[file:183]

## Backlog exact semaine par semaine

Le backlog ci-dessous part du principe d'une exécution resserrée sur 8 semaines, avec priorité à la clarté produit et à la fiabilité du moteur IA.

### Semaine 1 — Cadrage et recentrage

Objectif : figer les décisions structurantes.

- Finaliser le positionnement v5.
- Réécrire la copy produit interne : tagline, onboarding, promesse, labels de nav.
- Figer la navigation finale.
- Cartographier les surfaces à fusionner.
- Décider des entrées secondaires : changelog, roadmap, labs, skills.[file:183]
- Définir le vocabulaire final : Agent, Autopilot, Actions préparées, Automation Control.

### Semaine 2 — Architecture IA et observabilité

Objectif : mettre fin aux appels dispersés et opaques.

- Créer l'AI Gateway Railway.
- Ajouter `health`, `status`, `wake`, logs et routing provider.[web:217][web:213]
- Brancher temporairement OpenRouter uniquement via la Gateway.
- Ajouter erreurs visibles dans l'UI pour l'IA.
- Implémenter request IDs, logs persistés et panneau de statut provider.[file:183]

### Semaine 3 — Nouvelle navigation et shell produit

Objectif : rendre l'app immédiatement plus compréhensible.

- Refaire sidebar/top nav avec 7 entrées principales.
- Déplacer changelog et roadmap hors nav centrale tout en les gardant accessibles.[file:183]
- Unifier les CTA principaux.
- Ajouter un bouton Agent global permanent.
- Poser les fondations de l'Accueil exécutable.

### Semaine 4 — Agent Feed + Automation Control

Objectif : rendre l'intelligence visible et pilotable.

- Construire l'Agent Feed sur Accueil.
- Construire Automation Control : règles, logs, erreurs, retries, approbations.[file:183]
- Afficher les actions préparées et les actions automatiques récentes.
- Ajouter les niveaux d'autonomie et leur configuration par action.[file:183]

### Semaine 5 — Leads unifiés

Objectif : regrouper les surfaces commerciales dispersées.

- Fusionner listing leads, pipeline, comptes et timeline en famille “Leads”.[file:183]
- Construire la timeline unifiée lead / compte.
- Harmoniser les quick actions entre lead detail et account detail.
- Ajouter le panneau Agent contextuel dans ces écrans.

### Semaine 6 — Outreach unifié

Objectif : rendre l'outreach plus opératoire.

- Regrouper inbox, séquences, campagnes, templates et approvals.[file:183]
- Mettre en avant les relances à envoyer, réponses détectées, et suggestions prêtes.
- Ajouter workflow “prepare -> approve -> send”.
- Relier le tout à la timeline lead / compte.

### Semaine 7 — Terrain et Agenda comme noyaux différenciants

Objectif : faire émerger l'avantage hybride de Minerva.

- Rehausser Terrain comme surface de premier plan.[file:183]
- Relier tournées, outcomes, preuves, scripts et comptes/lead timeline.[file:183]
- Relier Agenda aux leads chauds, suggestions de booking et suivis post-visite.[file:183]
- Ajouter briefs automatiques de visite et de rendez-vous.

### Semaine 8 — Finition, QA, hardening

Objectif : rendre v5 crédible en production.

- QA end-to-end sur flows principaux.
- Audit des erreurs silencieuses côté IA et automations.[file:183]
- Vérifier tous les états vides, erreurs, et pending states.
- Valider les temps de réponse de la Gateway.
- Ajouter métriques internes : taux d'utilisation IA, taux de wake réussi, latence moyenne, taux de fallback, taux d'approbation.[web:217]

## Structure d'écrans page par page

## 1. Accueil

### Rôle

Centre nerveux exécutable du produit, et non tableau de bord passif.[cite:209]

### Structure

- Header avec période, objectifs, accès Agent global.
- Bloc “Aujourd'hui” : actions prioritaires.
- Agent Feed au centre.
- Colonne d'approbations à droite.
- Sections secondaires : leads urgents, relances à faire, rendez-vous du jour, tournées en cours, anomalies détectées.[file:183]

### Ce que l'IA y fait

- Priorise.
- Résume.
- Prépare.
- Signale anomalies et opportunités.
- Demande validation quand nécessaire.[file:183]

## 2. Leads

### Rôle

Surface maîtresse pour toutes les réalités commerciales : prospection, qualification, suivi, comptes, pipeline, historique.[file:183]

### Sous-vues

- Liste.
- Pipeline.
- Comptes.
- Timeline.

### Détail lead

- Header identité + score + source + statut.
- Colonne de contexte : site, contact, notes, last touch.
- Timeline centrale complète.[file:183]
- Bloc actions rapides : appeler, écrire, planifier, préparer visite, lancer playbook.
- Panneau Agent contextuel.

### Détail compte

- Vue 360 entreprise.
- Contacts liés.
- Pipeline cumulé.
- Visites terrain.
- Notes et documents.
- Timeline compte agrégée.[file:183]

## 3. Outreach

### Rôle

La salle de contrôle de toutes les communications sortantes et entrantes.[file:183]

### Structure

- Onglets : Inbox, Séquences, Campagnes, Templates, Approvals.
- Summary strip en haut : réponses du jour, réponses humaines, suivis en retard, brouillons prêts.
- Inbox avec suggestions et classification reply.[file:183]
- Séquences : performance, étapes, pause / reprise.
- Approvals : zone centrale pour l'humain dans la boucle.

### Ce que l'IA y fait

- Résume les threads.
- Classe replies.
- Prépare brouillons.
- Propose prochaines actions.
- Déclenche selon niveau d'autonomie.[file:183]

## 4. Terrain

### Rôle

Différenciateur stratégique : transformer la prospection physique en moteur natif du système.[file:183]

### Structure

- Carte / route planner.
- Liste de tournée.
- Briefs de visite.
- Enregistrement outcome.
- Galerie des preuves.
- Historique terrain par lead / compte.[file:183]

### Ce que l'IA y fait

- Prépare scripts de visite.
- Résume contexte avant déplacement.
- Suggère l'ordre de passage.
- Génère notes structurées après outcome.[file:183]

## 5. Agenda

### Rôle

Orchestrer le temps commercial, du rendez-vous planifié au suivi post-meeting.[file:183]

### Structure

- Vues Mois / Semaine / Jour.[file:183]
- Nouveau RDV.
- Booking links.
- Suivis à venir.
- Carte des rendez-vous liés à leads chauds.

### Ce que l'IA y fait

- Prépare briefs avant RDV.
- Suggère le meilleur créneau ou la meilleure relance.
- Convertit des signaux en tâches ou meetings préparatoires.[file:183]

## 6. Équipe

### Rôle

Rendre l'activité collective visible et coordonnée sans devenir un réseau social interne.[file:183]

### Structure

- Activité équipe.
- Mentions.
- Assignations.
- Présence.
- Permissions et rôles.

### Ce que l'IA y fait

- Résume les événements importants du workspace.
- Notifie intelligemment les bonnes personnes.
- Propose réassignations ou suivis selon charge et contexte.[file:183]

## 7. Paramètres

### Rôle

Réglages structurés, pas fourre-tout.

### Sections

- Profil et workspace.
- Intégrations.
- Automations.
- Agent Studio / skills avancées.
- Billing.
- Produit et mises à jour (incluant changelog).[file:183]
- Diagnostics IA / providers / Railway gateway.

### Sous-section critique : Diagnostics IA

- Provider principal.
- Provider de fallback.
- Dernier succès.
- Dernière erreur.
- Latence moyenne.
- Wake status.
- Test manuel d'un ping ou d'un prompt.[web:217][web:213]

## KPIs de succès v5

Les métriques de succès doivent être orientées revenu et exécution, pas seulement usage écran :

- Temps moyen entre création lead et première action.
- Taux de relance effectuée sous 24h.
- Taux de booking par source.
- Taux d'approbation des actions préparées par l'IA.
- Nombre de leads sans prochaine action définie.
- Latence moyenne AI Gateway.[web:217]
- Taux de fallback provider.[web:217]
- Taux de wake réussi avant requête.[web:213]

## Ce qui ne doit pas entrer dans v5

Pour protéger la clarté de la release, les éléments suivants ne doivent pas devenir prioritaires tant que le noyau v5 n'est pas solide :

- Ajouter encore plus de surfaces IA autonomes visibles.[file:183]
- Exposer Hermes comme concept marketing central.[file:183]
- Multiplier les pages “plateforme” sans impact sur lead -> booking.[file:183]
- Construire un self-hosting IA lourd avant d'avoir une Gateway observable et fiable.[web:217][web:212]

## Décision finale de cofounder

Minerva v5 n'est pas une version où l'application devient plus impressionnante. C'est la version où elle devient plus **inévitable** pour une petite équipe commerciale locale, parce qu'elle voit mieux, prépare mieux et agit mieux avec moins de friction.[file:183][cite:201]

Le produit garde sa profondeur, garde son changelog, garde sa richesse, mais change d'ordre interne : le flow de revenu passe avant les modules, l'Agent passe avant le chat, la visibilité système passe avant la sophistication cachée, et Railway + AI Gateway deviennent la fondation de fiabilité qui manquait à la promesse IA.[file:183][web:217][web:212]
