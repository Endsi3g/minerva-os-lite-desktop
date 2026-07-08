'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Lang = 'fr' | 'en' | 'de';

interface HighlightItem {
  text: string;
}

interface ChangelogVersion {
  version: string;
  date: string;       // pre-formatted French date, e.g. "2 juillet 2026 à 14h30"
  title: string;      // descriptive title, no version number
  highlights: HighlightItem[];
}

// ─── Versions data ─────────────────────────────────────────────────────────────

const versions: ChangelogVersion[] = [
  {
    version: 'v3.77.0',
    date: '8 juillet 2026 · 10h45',
    title: 'Programmes de croissance, Phase 4 : organisation des agents IA',
    highlights: [
      { text: "Vue \"Équipe d'agents Minerva\" en haut de la page /agents : 3 équipes nommées (Growth, Outreach & Inbox, Terrain), chacune avec son niveau d'autonomie, ses actions récentes (exécutées vs suggérées), et les programmes de croissance touchés." },
      { text: "Aucun nouveau moteur d'agent — une classification des actions existantes par-dessus l'infrastructure déjà en place." },
    ],
  },
  {
    version: 'v3.76.0',
    date: '8 juillet 2026 · 10h00',
    title: 'Programmes de croissance, Phase 3 : visibilité cockpit',
    highlights: [
      { text: "Carte \"Programmes actifs\" dans /today, juste après le parcours en 7 phases : objectif, progression, lien direct vers la fiche du programme." },
      { text: "Badge \"Programmes\" sur la fiche détail d'un lead : affiche le ou les programmes auxquels ce lead est rattaché, avec lien direct — un lead peut appartenir à plusieurs programmes à la fois." },
    ],
  },
  {
    version: 'v3.75.0',
    date: '8 juillet 2026 · 09h15',
    title: 'Programmes de croissance, Phase 2 : orchestration du Playbook Wizard',
    highlights: [
      { text: "Le Playbook Wizard crée désormais un vrai programme de croissance au lancement : étape \"Objectif de croissance\" (RDV / clients / MRR) + cible chiffrée, directement dans l'écran de configuration." },
      { text: "Chaque lead scrapé par un playbook est automatiquement rattaché au programme dès sa création, sans action manuelle — première brique concrète combinant acquisition et suivi de programme." },
    ],
  },
  {
    version: 'v3.74.0',
    date: '8 juillet 2026 · 08h30',
    title: 'Programmes de croissance, Phase 1 : modèle de données + objectif',
    highlights: [
      { text: "Une campagne devient un \"programme\" suivable dès qu'un objectif de croissance lui est assigné — Remplir mon agenda (RDV), Signer des clients, ou Faire croître le MRR — avec une cible chiffrée. Étape dédiée à la création, badge dans la liste, carte objectif/progression sur la fiche détail." },
      { text: "Un lead peut désormais appartenir à plusieurs programmes actifs simultanément (nouvelle table de liaison), distinct du lien \"campagne principale\" existant qui reste inchangé." },
      { text: "Phase 1 sur 5 — bâtie sur l'infrastructure existante (campagnes, séquences, playbooks) plutôt que dupliquée. Prochaines étapes : orchestration du Playbook Wizard, visibilité cockpit, organisation des agents IA, métriques par programme." },
    ],
  },
  {
    version: 'v3.73.2',
    date: '8 juillet 2026 · 07h30',
    title: 'Nettoyage : CI mobile désactivé temporairement + code mort retiré',
    highlights: [
      { text: "Le workflow CI mobile révèle deux prérequis manquants dans le repo (dossier natif Android jamais commité, aucun Gemfile pour Fastlane) qui le font échouer plus loin. Déclenchement automatique désactivé en attendant — n'affecte pas le déploiement web." },
      { text: "Code mort retiré : une route de génération de proposition jamais appelée nulle part, et deux onglets Paramètres (Modèles, Préférences) qui étaient des sélecteurs 100% inertes depuis leur création." },
    ],
  },
  {
    version: 'v3.73.1',
    date: '8 juillet 2026 · 07h00',
    title: 'CI mobile cassé depuis plusieurs releases (export statique + routes API)',
    highlights: [
      { text: "Le workflow GitHub Actions \"Deploy Mobile Apps\" échouait sur chaque tag de version depuis plusieurs releases. Cause réelle : il appelait next build directement en mode export statique, sans la dissimulation temporaire des routes API que font déjà les autres scripts de build — une exportation statique ne peut structurellement pas inclure de routes serveur. Corrigé en utilisant les bons scripts (cap:sync:ios ajouté, n'existait pas)." },
      { text: "Le chemin de travail des étapes Fastlane pointait vers un dossier qui n'existe pas dans le repo réel — aurait fait échouer le workflow à l'étape suivante. Retiré." },
    ],
  },
  {
    version: 'v3.73.0',
    date: '8 juillet 2026 · 06h00',
    title: "Audit complet des pages liées à l'IA",
    highlights: [
      { text: "Bug critique : les Paramètres réécrasaient silencieusement le provider IA choisi à CHAQUE sauvegarde de n'importe quel onglet (pas seulement l'onglet IA), avec une coercition qui pouvait défaire un choix explicite de Cloudflare en changeant simplement sa photo de profil. Corrigé — un seul écran gère désormais ces réglages." },
      { text: "/api/nba/explain (bouton \"Pourquoi ?\" sur le score d'un lead) et la recherche web IA faisaient un appel direct codé en dur vers Anthropic, sans passer par la cascade — 100% cassés en production. Routés désormais via la cascade complète." },
      { text: "La génération de script de voicemail substituait silencieusement un script générique en cas d'échec IA, sans jamais le signaler. Le script générique est conservé comme repli mais l'échec est maintenant visible." },
      { text: "La génération de site web IA n'envoyait jamais les réglages IA de l'utilisateur, contrairement à toutes ses fonctions sœurs — corrigé." },
      { text: "FAQ et notes dans Paramètres mises à jour pour refléter la cascade à 3 providers (Cloudflare → OpenRouter → Anthropic) au lieu d'Anthropic seul." },
    ],
  },
  {
    version: 'v3.72.3',
    date: '8 juillet 2026 · 04h35',
    title: 'Résolution du modèle Cloudflare auto-réparante',
    highlights: [
      { text: "\"Cloudflare Workers AI error 410: Model has been deprecated\" persistait malgré la correction du catalogue de modèles : un utilisateur ayant déjà sélectionné l'ancien modèle déprécié l'avait toujours enregistré dans ses paramètres, qui ne se met pas à jour tout seul quand le catalogue change. La résolution du modèle ignore maintenant les ID Cloudflare connus comme dépréciés et retombe automatiquement sur Kimi K2 — plus besoin de resélectionner manuellement." },
    ],
  },
  {
    version: 'v3.72.2',
    date: '8 juillet 2026 · 04h10',
    title: 'Diagnostic complet des échecs de la cascade IA + README à jour',
    highlights: [
      { text: "La notification \"Échec IA\" ne montrait que l'erreur du dernier provider essayé, jamais celle des providers précédents. Si Cloudflare (primaire) échouait puis OpenRouter échouait aussi, on ne voyait que \"OpenRouter saturé\" sans savoir que Cloudflare avait aussi été tenté. Le message final liste maintenant l'échec de chaque provider de la chaîne." },
    ],
  },
  {
    version: 'v3.72.1',
    date: '8 juillet 2026 · 03h40',
    title: '"Agent planning failed" : réponse vide de Cloudflare traitée comme un succès',
    highlights: [
      { text: "\"Agent planning failed\" sans aucun détail exploitable : Kimi K2 peut épuiser tout son budget de tokens en raisonnement sans jamais produire de réponse finale — l'appel HTTP réussissait quand même, donc c'était traité comme un succès et le repli vers un autre provider ne se déclenchait jamais. Une réponse vide déclenche maintenant une vraie erreur qui permet à la cascade de retomber sur le provider suivant, et le message d'erreur réel est maintenant loggé et notifié. Budget de tokens de la planification de l'agent doublé (2000 → 4000)." },
    ],
  },
  {
    version: 'v3.72.0',
    date: '8 juillet 2026 · 03h00',
    title: 'Cloudflare Workers AI configuré et rendu primaire',
    highlights: [
      { text: "Le catalogue de modèles dans Paramètres > Minerva AI proposait un modèle Cloudflare déprécié depuis le 2026-05-30 (tout appel échouait en HTTP 410) au lieu du vrai modèle utilisé par défaut par le backend (Kimi K2). Remplacé, avec le badge \"Par défaut\" déplacé sur cette entrée pour refléter l'ordre de priorité réel de la cascade IA." },
      { text: "L'affichage du modèle actif dans Paramètres (quand rien n'a jamais été choisi explicitement) montrait Claude Sonnet alors que le backend utilise Cloudflare par défaut dans ce cas — corrigé." },
      { text: "Identifiants Cloudflare Workers AI configurés en production, vérifiés fonctionnels par un appel réel avant mise en ligne — second provider IA réellement opérationnel, indépendant d'OpenRouter." },
    ],
  },
  {
    version: 'v3.71.2',
    date: '8 juillet 2026 · 02h15',
    title: 'Régression : ID de modèle Cloudflare envoyé à OpenRouter',
    highlights: [
      { text: "\"OpenRouter error 400: @cf/meta/llama-3.1-8b-instruct is not a valid model ID\" : la fonction de résolution de modèle OpenRouter ne filtrait que les ID au format Anthropic, jamais ceux au format Cloudflare. Un modèle Cloudflare configuré par l'utilisateur pouvait fuiter tel quel vers un appel OpenRouter de secours. Corrigé dans la fonction partagée." },
    ],
  },
  {
    version: 'v3.71.1',
    date: '7 juillet 2026 · 23h05',
    title: 'Apify : mémoire insuffisante causant un plantage systématique du run',
    highlights: [
      { text: "\"Apify server responded with HTTP 400: run-failed / Actor run did not succeed\" : l'acteur de scraping Google Maps tournait avec seulement 1024 Mo de mémoire alors qu'il pilote un navigateur headless par recherche — largement insuffisant, causant un plantage par manque de mémoire avant la fin du run. Mémoire relevée à 4096 Mo (recommandation par défaut d'Apify). Le message d'erreur distingue maintenant un plantage de run (mémoire/anti-bot) d'un problème de clé API." },
    ],
  },
  {
    version: 'v3.71.0',
    date: '7 juillet 2026 · 22h15',
    title: 'Fiabilité IA, import CRM silencieux et messagerie éditable',
    highlights: [
      { text: "Échec IA — modèle temporairement saturé alors qu'un provider sain est configuré : la cascade de repli n'essayait qu'un seul provider de secours avant d'abandonner. Elle essaie maintenant tous les providers configurés dans l'ordre avant de notifier un échec réel, et n'attend plus 60s inutilement sur un 429 OpenRouter." },
      { text: "Import de prospects dans le CRM silencieusement sans effet : addLead() avalait ses erreurs sans jamais les remonter — l'interface affichait \"importé avec succès\" même quand rien n'était enregistré en base. Concerne la Prospection, l'import CSV/Contacts dans Leads, la création manuelle, et les widgets de création rapide. Les erreurs réelles s'affichent maintenant clairement." },
      { text: "Édition et suppression de ses propres messages dans Messages (chat d'équipe et messages directs), répercuté en temps réel." },
      { text: "Nouveaux composants shadcn/ui Attachment, Bubble, Marker, Message, MessageScroller intégrés dans une refonte de l'interface de Messages : bulles de conversation, séparateurs de date, pièces jointes, défilement à ancrage intelligent." },
    ],
  },
  {
    version: 'v3.70.0',
    date: '7 juillet 2026 · 20h30',
    title: 'Prospection : vrai budget de temps Apify + notifications d\'erreurs cliquables',
    highlights: [
      { text: "\"Aucun client trouvé\" malgré une clé Apify valide et connectée : la recherche de prospection coupait l'appel Apify après 42 secondes (budget codé en dur de 55s, en contradiction avec les 120s déclarées côté déploiement), alors que le scraper Google Maps a besoin de 60 à 100+ secondes pour produire des résultats. Le budget est maintenant aligné (jusqu'à 90s pour Apify)." },
      { text: "Secours OpenStreetMap inefficace : les 3 miroirs étaient interrogés un par un (jusqu'à 60s d'attente cumulée). Ils sont maintenant interrogés en parallèle — le premier à répondre avec des résultats gagne." },
      { text: "Le message d'erreur Apify (clé invalide, quota dépassé) n'était jamais affiché à cause d'un champ manquant dans la réponse du serveur. Corrigé, avec des messages explicites par type d'échec (401/403/429)." },
      { text: "Notifications d'erreurs applicatives cliquables : toute erreur significative (prospection sans résultat, erreur serveur, plantage d'interface, erreur JavaScript non gérée) déclenche une notification distincte (point rouge) dans la cloche. Cliquer dessus ouvre le détail complet — message exact, contexte, stack trace — avec un bouton pour copier." },
    ],
  },
  {
    version: 'v3.69.1',
    date: '7 juillet 2026 · 23h30',
    title: 'Colonnes personnalisées de workspace, import manuel et copie rapide',
    highlights: [
      { text: "Colonnes personnalisées persistées : Intégration d'une colonne custom_columns dans la table workspaces (SQLite locale et Supabase cloud) pour mémoriser la liste des champs personnalisés définis par l'utilisateur pour son espace de travail." },
      { text: "Gestion des colonnes dans les Paramètres : Ajout d'une section dédiée dans les Paramètres Généraux du Workspace pour lister, ajouter et supprimer des colonnes personnalisées." },
      { text: "Champs personnalisés sur la Fiche Prospect : Rendu dynamique des colonnes personnalisées du workspace dans le volet des propriétés du prospect (lead-detail-client.tsx), avec édition en ligne (InlineTextEdit) et bouton de création rapide de nouveaux champs." },
      { text: "Mappage intelligent à l'Importation CSV : Détection et suggestion automatique de mappage des en-têtes inconnus vers des colonnes existantes ou vers une nouvelle colonne à créer à la volée. Les nouvelles colonnes détectées sont automatiquement enregistrées au niveau du workspace." },
      { text: "Création manuelle de prospect enrichie : Ajout d'une zone dédiée aux champs personnalisés dans le formulaire de création manuelle de prospect (new-lead-root.tsx), avec saisie des valeurs existantes et création à la volée de nouvelles colonnes." },
      { text: "Bouton Copie Rapide de Prospect : Ajout d'un bouton de copie des informations en haut de la fiche de détails du prospect pour copier dans le presse-papiers une synthèse exhaustive de toutes les données du lead (coordonnées, réseaux sociaux, notes de terrain, champs personnalisés) formatée pour l'IA ou pour un document externe." },
    ],
  },
  {
    version: 'v3.69.0',
    date: '7 juillet 2026 · 15h50',
    title: 'Amélioration de la prospection, champs personnalisés CSV, relances automatisées et modèles OpenRouter',
    highlights: [
      { text: "Scraper de prospects premium Apify : Restauration complète du scraper premium de Google Places via Apify dans le module de prospection, avec une gestion robuste des diacritiques (accentuation) utilisant une regex ASCII-compatible ([\\u0300-\\u036f]) pour écarter tout plantage. Le scraper dispose d'un timeout de secours automatique pour basculer sur OpenStreetMap." },
      { text: "Filtres de prospection enrichis : Intégration d'un curseur d'avis maximum (Avis maximum, allant jusqu'à 1000/Illimité) à côté de la note et des avis minimums sur la carte, pour exclure les établissements ayant trop d'avis." },
      { text: "Importation CSV dynamique et champs personnalisés : L'importateur CSV détecte automatiquement les colonnes non-standards et propose de créer de nouveaux champs personnalisés (ex: custom__*). Ces propriétés sont stockées au format JSON." },
      { text: "Personnalisation d'outreach par variables dynamiques : Le compositeur et les séquences d'emails interpolent dynamiquement les balises associées aux colonnes personnalisées du CSV (ex: {{nom_de_colonne}})." },
      { text: "Enrichissement AI contextuel : Les données des colonnes personnalisées importées sont automatiquement transmises au prompt du copilote de prospection pour guider la personnalisation par l'IA." },
      { text: "Brouillons de relance automatique dans le Rescue Panel : Le bouton \"Relancer\" crée la tâche manuelle et lance la génération d'un brouillon d'email par l'IA." },
      { text: "Modèles OpenRouter et limites ajustées : Raccourcis rapides pour sélectionner Llama 3.3 70B Free, Llama 3.3 70B standard et DeepSeek V3, avec dérogation automatique du provider. Limite haussée de 8 à 60 appels IA par minute." },
    ],
  },
  {
    version: 'v3.68.1',
    date: '6 juillet 2026 · 22h48',
    title: 'Carte : vraie cause du plantage identifiée et corrigée',
    highlights: [
      { text: "Le correctif précédent ne suffisait pas — la vraie cause la plus probable est l'absence de vérification du support WebGL avant de créer la carte, qui plantait immédiatement sur un navigateur ou une machine sans WebGL, peu importe les données. Un message clair s'affiche maintenant à la place." },
    ],
  },
  {
    version: 'v3.68.0',
    date: '6 juillet 2026 · 22h33',
    title: "Fiabilité de l'assistant IA, carte et séquences",
    highlights: [
      { text: "L'assistant IA pouvait afficher une erreur OpenRouter sans jamais essayer un autre modèle. Il fait maintenant le même repli automatique que le reste de l'application." },
      { text: "La page Carte pouvait planter entièrement si un lead avait des coordonnées invalides. Les marqueurs et popups ignorent maintenant silencieusement les coordonnées invalides au lieu de faire planter toute la carte." },
      { text: "Le créateur de séquence gardait par erreur un module inutilisé dans le code, alors que le bouton \"Nouvelle séquence\" ouvre déjà la page dédiée complète. Le module inutilisé a été retiré." },
    ],
  },
  {
    version: 'v3.67.0',
    date: '6 juillet 2026 · 22h05',
    title: 'Corrections IA, campagnes et Paramètres',
    highlights: [
      { text: "Des colonnes de lead qui n'ont jamais existé faisaient planter la recherche de leads par l'assistant IA et la suggestion de prochaine action. Corrigées." },
      { text: "Plusieurs notifications \"Échec IA\" identiques apparaissaient pour un seul événement de saturation du provider IA. Corrigé, et ajout d'une vraie limite de fréquence des appels IA (8 par minute par utilisateur) avec sa propre notification." },
      { text: "Une campagne créée en demandant à l'assistant IA n'apparaissait jamais nulle part dans l'application — elle était enregistrée dans un système que rien d'autre ne consulte. Unifiée sur le système utilisé partout ailleurs." },
      { text: "Lancer un Playbook ne créait en réalité aucun lead et son statut restait bloqué sur \"En cours\" indéfiniment. Un Playbook lancé crée maintenant réellement des leads rattachés à sa campagne, et le statut passe à \"Terminé\" avec un vrai décompte." },
      { text: "Le lien \"Campagne\" dans les dernières exécutions de Playbooks menait vers la liste générale au lieu de la campagne concernée." },
      { text: "Dans Paramètres > Minerva AI, l'outil \"Recherche web (Firecrawl)\" affichait \"Clé requise\" même une fois la clé déjà enregistrée." },
      { text: "Les statistiques \"Conversations / Emails rédigés / Recherches web\" de Paramètres étaient des nombres fixes sans lien avec la réalité. Remplacées par de vrais comptages du mois en cours, avec liens directs vers les conversations et les emails, et la liste des dernières recherches web affichée directement dans Paramètres." },
      { text: "Ajout d'un vrai graphique en barres (au lieu de simples barres de progression) dans l'onglet Analytics du détail d'une campagne." },
    ],
  },
  {
    version: 'v3.66.0',
    date: '6 juillet 2026 · 20h00',
    title: 'Fiabilité IA & prospection en masse',
    highlights: [
      { text: "Approuver un brouillon ne faisait rien — ni dans Approbations, ni dans Brouillons de l'Inbox, ça ne faisait que basculer un booléen sans jamais mettre l'email en file d'envoi. Réparé : l'approbation met maintenant réellement l'email en file, mêmes quotas/fenêtres qu'avant." },
      { text: "Un email envoyé n'apparaissait jamais dans l'Inbox — le lien de conversation Gmail n'était enregistré que sur la file d'envoi, jamais sur le lead. Corrigé." },
      { text: "L'enrôlement en masse dans une séquence ne faisait rien — le premier email n'était jamais amorcé, les leads restaient bloqués à la première étape indéfiniment." },
      { text: 'Deux systèmes d\'authentification Google coexistaient, causant des échecs silencieux (envoi, Drive, réservation, séquences) pour les comptes connectés via le flux le plus récent. Consolidé sur un seul système.' },
      { text: 'Génération de brouillons trop générique — interrogeait des colonnes de lead inexistantes, échouant systématiquement. Corrigé et enrichi avec le décideur, la vibe de l\'entreprise, les avis Google et la persona/style configurés par l\'utilisateur.' },
      { text: 'Toggle "IA activée" avec test de connectivité immédiat, vérification périodique (6h) et notification automatique en cas de panne.' },
      { text: 'Onglet Brouillons dans la Boîte de réception, accessible même sans Gmail connecté.' },
      { text: 'Batch d\'envoi : bouton "Générer brouillons IA" sur la sélection multiple des Leads, et cron automatique opt-in pour les leads froids éligibles — toujours en attente d\'approbation, jamais d\'envoi direct.' },
      { text: 'Exploration approfondie du site du prospect (À propos, Contact, Services) quand la page d\'accueil seule ne suffit pas — jamais de recherche externe.' },
      { text: 'Personas de prospection enfin persistées côté cloud.' },
    ],
  },
  {
    version: 'v3.65.0',
    date: '6 juillet 2026 · 01h15',
    title: 'Audit v11 → v12 — Phase 10/10 (finale) : automatisations, monitoring, prospection',
    highlights: [
      { text: 'Le réglage "Enrichir automatiquement à l\'import" était purement cosmétique — l\'enrichissement se lançait systématiquement, réglage activé ou non. Corrigé.' },
      { text: 'Vérifié : Monitoring, enrichissement nocturne, envoi d\'email après enrichissement et tag automatique des réponses fonctionnaient déjà correctement.' },
      { text: 'Revue de bout en bout de la Prospection (carte, enrichissement, scraping) — aucune anomalie trouvée après les corrections de base de données du début de cet audit.' },
      { text: 'Fin de l\'audit complet v11 → v12 en 10 phases : base de données, navigation, IA, notifications, campagnes, galerie de sites, acquisition, messagerie, cartes, sécurité et automatisations.' },
    ],
  },
  {
    version: 'v3.64.0',
    date: '6 juillet 2026 · 01h00',
    title: 'Audit v11 → v12 — Phase 9/10 : sécurité et profil',
    highlights: [
      { text: 'Vraie détection des appareils connectés dans Paramètres > Sécurité — affichait une seule session fictive incapable de voir un second appareil pourtant bien connecté. Lit maintenant les vraies sessions actives, avec possibilité de déconnecter un appareil à distance.' },
      { text: 'Synchronisation de l\'avatar entre appareils corrigée — une fois mis en cache sur un appareil, les mises à jour faites depuis un autre appareil n\'étaient plus jamais reflétées. La base de données est maintenant la seule source de vérité.' },
    ],
  },
  {
    version: 'v3.63.0',
    date: '6 juillet 2026 · 00h53',
    title: 'Audit v11 → v12 — Phase 8/10 : stabilité carte + mini-carte Prospecting',
    highlights: [
      { text: 'Plus de plantage en cascade sur les pages carte — /map et /prospecting affichent maintenant un bouton "Réessayer" propre au lieu de faire planter toute l\'application.' },
      { text: 'Nouvelle mini-carte à clusters dans Prospecting : leads regroupés par région, colorés selon leur température moyenne, clic sur un cluster = zoom + liste des leads dedans, filtres statut/score directement sur la carte.' },
    ],
  },
  {
    version: 'v3.62.0',
    date: '6 juillet 2026 · 00h45',
    title: 'Audit v11 → v12 — Phase 7/10 : messages vocaux, fichiers, chat unifié',
    highlights: [
      { text: 'Messages vocaux dans Messages — enregistrement au micro directement dans le navigateur, aussi long que nécessaire, avec lecteur audio inline.' },
      { text: 'Pièces jointes fichiers — n\'importe quel type de fichier peut être partagé dans une conversation.' },
      { text: 'Un seul chat d\'équipe — l\'onglet Chat de la page Équipe (qui faisait doublon avec Messages) a été retiré au profit d\'un lien direct vers Messages.' },
    ],
  },
  {
    version: 'v3.61.0',
    date: '6 juillet 2026 · 00h33',
    title: 'Audit v11 → v12 — Phase 6/10 : import CSV pour l\'Acquisition',
    highlights: [
      { text: 'Nouveau bouton "Importer CSV" sur la page Acquisition, avec association automatique des colonnes du fichier aux champs des leads, aperçu et import en masse.' },
      { text: 'Le formulaire de création manuelle de lead existait déjà et fonctionnait correctement — vérifié.' },
    ],
  },
  {
    version: 'v3.60.0',
    date: '6 juillet 2026 · 00h28',
    title: 'Audit v11 → v12 — Phase 5/10 : galerie de sites web façon marketplace',
    highlights: [
      { text: 'Nouveau Portfolio dans "Site Web" > Galerie : coller un lien récupère automatiquement son aperçu (titre, description, image, favicon), avec catégorisation et tags, recherche et filtres.' },
      { text: 'Sidebar renommée "Site web IA" → "Site Web".' },
    ],
  },
  {
    version: 'v3.59.0',
    date: '6 juillet 2026 · 00h23',
    title: 'Audit v11 → v12 — Phase 4/10 : campagnes automatisées, groupes dynamiques',
    highlights: [
      { text: 'Groupes dynamiques de leads par règles (ex: score > 80 ET secteur = Restaurant), mis à jour automatiquement.' },
      { text: 'Une séquence peut maintenant cibler un segment entier ou une campagne au complet, pas seulement un lead à la fois.' },
      { text: 'Configuration d\'automatisation sur les campagnes : canaux de contact, volume quotidien max, approbation manuelle vs automatique.' },
      { text: 'Les tags posés sur un lead (manuellement ou par l\'IA) sont maintenant visibles directement dans le tableau des leads.' },
    ],
  },
  {
    version: 'v3.58.0',
    date: '6 juillet 2026 · 00h12',
    title: 'Audit v11 → v12 — Phase 3/10 : notifications, emails, assistant actionnable',
    highlights: [
      { text: 'L\'agent IA autonome envoie maintenant une vraie notification native après avoir exécuté des actions — jusqu\'ici aucune action IA ne déclenchait de notification.' },
      { text: 'Bouton "Synchroniser maintenant" dans l\'Inbox pour vérifier les nouveaux emails sans attendre le contrôle automatique.' },
      { text: 'L\'assistant IA peut maintenant ajouter une note à un lead, lancer un enrichissement réel, et naviguer vers une page précise de l\'app.' },
    ],
  },
  {
    version: 'v3.57.0',
    date: '5 juillet 2026 · 23h58',
    title: 'Audit v11 → v12 — Phase 2/10 : fiabilité des providers IA',
    highlights: [
      { text: 'Ordre de priorité des providers IA corrigé : Cloudflare Workers AI en premier, OpenRouter en second, Anthropic Claude en dernier recours.' },
      { text: 'Vrai mécanisme de repli — si le provider principal échoue, l\'app retente maintenant automatiquement avec le suivant.' },
      { text: 'Paramètres > Modèles affiche les vrais providers avec leur statut en direct, au lieu d\'une liste figée qui ne fonctionnait jamais.' },
    ],
  },
  {
    version: 'v3.56.0',
    date: '5 juillet 2026 · 23h47',
    title: 'Audit v11 → v12 — Phase 1/10 : navigation nettoyée',
    highlights: [
      { text: 'Séquences, Composer, Queue et Cadences regroupés au même endroit (/sequences) — fini d\'aller chercher ces outils cachés dans un sous-onglet d\'Outreach.' },
      { text: 'Plus de double Inbox — Outreach n\'a plus son propre onglet Inbox qui ramenait en boucle sur la vraie page Inbox.' },
      { text: 'Nouvel onglet Groupes dans Équipe, réellement fonctionnel cette fois — l\'ancien widget des Paramètres ne sauvegardait jamais rien.' },
      { text: 'Fix d\'attribution : un lead trouvé par scraping n\'est plus étiqueté à tort "Manuel" dans Acquisition.' },
    ],
  },
  {
    version: 'v3.55.0',
    date: '5 juillet 2026 · 23h26',
    title: 'Audit v11 → v12 — Phase 0/10 : fondations base de données',
    highlights: [
      { text: 'Cause racine des erreurs "column does not exist" en continu depuis des mois : la base de données de production n\'avait jamais reçu plusieurs mois de changements de schéma. Corrigé.' },
      { text: 'Mise en place du suivi officiel des migrations Supabase pour que ce genre de dérive ne se reproduise plus.' },
      { text: 'Deux bugs qui faisaient échouer silencieusement les brouillons générés par l\'IA, corrigés au passage.' },
    ],
  },
  {
    version: 'v3.54.0',
    date: '5 juillet 2026 · 18h15',
    title: 'Release v11.0.0 — Sécurité, build de production, Revenue OS',
    highlights: [
      { text: 'Correctifs de sécurité critiques (jetons codés en dur retirés, comparaisons non sécurisées corrigées, authentification manquante ajoutée sur plusieurs routes).' },
      { text: 'Fix d\'une régression bloquant le build de production depuis des mois, jamais détectée par le typecheck seul.' },
      { text: 'Monitoring Sentry mis en place.' },
      { text: 'Reply Classifier v2, cadences intelligentes, Lead Rescue Center et Deal Risk Score ajoutés.' },
      { text: 'Suite de tests E2E Playwright (45 tests) exécutée et vérifiée de bout en bout.' },
    ],
  },
  {
    version: 'v3.53.0',
    date: '4 juillet 2026 · 08:30',
    title: 'Kimi K2 — IA primaire, Carte intelligente & Sidebar repensée',
    highlights: [
      { text: 'IA Primaire — Kimi K2 : Le modèle @cf/moonshotai/kimi-k2.7-code (Moonshot AI via Cloudflare Workers AI) est maintenant le modèle principal de toute l\'application — assistant, agents, analyses, génération d\'emails, intelligence comportementale. Aucune dépendance externe requise.' },
      { text: 'Agents IA fonctionnels : La boucle agent, Hermès ReAct, l\'intelligence comportementale et les analyses NBA fonctionnent maintenant end-to-end — le bug de priorité de provider (Cloudflare était sauté en faveur d\'un modèle cassé) est corrigé.' },
      { text: 'JSON stripping : Les modèles raisonnants (Kimi K2) encapsulent leur réponse dans ```json ... ``` — ces backticks sont maintenant automatiquement supprimés avant le parsing, ce qui garantit que l\'agent Hermès reçoit du JSON valide.' },
      { text: 'Propagation d\'erreur IA : Les erreurs réelles du provider sont maintenant remontées jusqu\'à l\'interface au lieu d\'être swallowées sous "modèle temporairement indisponible".' },
      { text: 'Carte — FlyTo : Cliquer sur un lead dans la sidebar gauche ou sur un point sur la carte déplace maintenant la map directement vers ce lead (map.flyTo zoom 15, durée 900ms).' },
      { text: 'Carte — Popup inline : Au clic sur un lead, les infos apparaissent maintenant en popup ancré au point sur la carte (nom, ville, statut, email, score, distance GPS) plutôt qu\'une sidebar droite. Le panneau détail complet s\'ouvre via "Voir détails" dans le popup.' },
      { text: 'Carte — GPS nearby leads : Quand le tracking GPS est actif, les leads sont triés par distance et chaque lead affiche sa distance en temps réel (mètres si < 1km, kilomètres sinon). Le popup affiche aussi la distance.' },
      { text: 'Sidebar — Minerva AI repositionnée : La section "Minerva AI" (Assistant IA, Agents, Intelligence, Skills) est maintenant au-dessus de "Marketing" dans la navigation — plus de valeur, plus de visibilité.' },
      { text: 'Paramètres — Groupes collapsibles : Les 3 sections (Compte, Espace de travail, Outils) dans la sidebar des paramètres peuvent maintenant être repliées/dépliées via un bouton chevron. Les sections avec un élément actif restent visuellement distinguées.' },
      { text: 'Production API 404 : Les routes API (/api/chat, /api/agent/hermes, etc.) retournaient 404 sur le domaine principal Vercel à cause d\'un cache CDN périmé. Corrigé via réassignation d\'alias et fix du provider IA.' },
    ],
  },
  {
    version: 'v3.52.0',
    date: '3 juillet 2026',
    title: 'Map IA, Onboarding cult-ui, Chat Claude-style & Outils IA avancés',
    highlights: [
      { text: 'Carte — Bâtiments 3D : Toggle d\'extrusion 3D des bâtiments (fill-extrusion MapLibre) avec basculement automatique du pitch à 52° et bearing à -17°.' },
      { text: 'Carte — Vue satellite : Couche raster Esri World Imagery superposée aux tuiles CartoDB Positron via toggle dans la topbar.' },
      { text: 'Carte — Requêtes IA en langage naturel : Barre de filtrage intelligente (Brain icon) — tapez "prospects non contactés depuis 30 jours" et Claude génère les filtres automatiquement.' },
      { text: 'Carte — Survol cinématique : Bouton Play dans la tournée qui anime la caméra de waypoint en waypoint avec pitch 55°, bearing rotatif et transitions fluides.' },
      { text: 'Onboarding repensé : Nouveau flow 3 étapes avec cult-ui — Feature Carousel (3 slides Minerva), ChoiceGroup rôle/secteur, formulaire profil avec ShiftCard d\'aide.' },
      { text: 'Assistant — Claude Composer : Redesign de l\'input landing en style Claude.ai — grande zone de texte arrondie, sélecteur de modèle, bouton + attachements, chips catégories en dessous.' },
      { text: 'Email Tool IA : Composant AiEmailTool — brouillon email avec variantes Warm/Formal, sujet, corps, bouton Gmail compose, copie en un clic.' },
      { text: 'Image Search IA : Composant AiImageSearch — grille collage 2 colonnes avec badges domaine, favicons Google S2, lightbox carousel avec navigation prev/next.' },
      { text: 'Image Loader IA : Composant AiImageLoader — animation canvas pixel-mosaic pendant la génération d\'image, labels de statut cycliques, transition fondu vers l\'image finale.' },
      { text: 'Cursor Questions : Composant CursorQuestions — wizard de questions clavier-friendly avec options A/B/C/D, multi-sélection, champ "Autre", navigation par flèches.' },
      { text: 'Link Preview : Composant LinkPreview — carte survol avec titre, description, favicon, OG image — route /api/link-preview pour extraction de métadonnées.' },
      { text: 'Firecrawl Web Research : Route /api/tools/tool-search-firecrawl — recherche web, scraping URL, crawl de site via Firecrawl + synthèse Claude Haiku en streaming.' },
    ],
  },
  {
    version: 'v9.1.0',
    date: '2 juillet 2026',
    title: 'Fix — Carte, Notifications, Vocal AI & Nettoyage',
    highlights: [
      { text: 'Carte MapLibre : Les tuiles raster s\'affichent maintenant correctement — fix du reset Tailwind CSS qui bloquait le rendu des images de tiles (max-width: none).' },
      { text: 'Canvas MapLibre : Suppression des bordures et outlines parasites sur l\'élément <canvas> causées par le reset global Tailwind.' },
      { text: 'Notifications natives : La demande de permission s\'affiche maintenant proactivement au démarrage (toast interactif après 5s) au lieu d\'attendre que l\'utilisateur ouvre la cloche.' },
      { text: 'Son de confirmation : L\'AudioContext est maintenant créé depuis un geste utilisateur valide (clic sur "Activer" dans la toast), ce qui déverrouille le son dans tous les navigateurs.' },
      { text: 'Voix → Assistant AI : Le dictaphone global redirige maintenant vers /assistant avec le transcript envoyé automatiquement comme message, au lieu de rester dans un panneau flottant.' },
      { text: 'Panneau vocal simplifié : Interface épurée montrant uniquement le transcript en direct et un champ texte de secours.' },
    ],
  },
  {
    version: 'v9.0.0',
    date: '2 juillet 2026 à 07h36',
    title: 'Minerva v8 — Revenue OS orchestré (Consolidation)',
    highlights: [
      { text: 'Consolidation du Cockpit : Fusion complète de Today, Cockpit, Command Center et Agent Feed sous un écran unique (/today).' },
      { text: 'Onglets Opérations, Inbox, et Pilotage stratégique : Regroupe agenda, tâches, boîte mail et rapports stratégiques/mémoire IA au même endroit.' },
      { text: 'Tunnel 7 Phases : Visualisez la répartition visuelle de vos prospects le long du parcours commercial canonique.' },
      { text: "Outreach Control Center : File d'approbations de l'agent directement dans le cockpit pour valider les brouillons d'un clic." },
      { text: 'Redirections automatiques : Les routes /cockpit et /command redirigent maintenant proprement vers /today.' },
    ],
  },
  {
    version: 'v8.9.0',
    date: '2 juillet 2026 à 07h33',
    title: 'Modèle Google Gemma 4 & Tolérance think',
    highlights: [
      { text: 'Google Gemma 4 : Configuration du modèle @cf/google/gemma-4-26b-a4b-it par défaut pour des réponses et un format JSON rapides et respectés.' },
      { text: 'Filtre think : Nettoyage automatique des balises <think>...</think> pour éviter les plantages de format JSON avec les modèles de raisonnement.' },
    ],
  },
  {
    version: 'v8.8.0',
    date: '2 juillet 2026 à 07h07',
    title: 'Hébergement Cloudflare Workers AI',
    highlights: [
      { text: 'Cloudflare Workers AI : Support complet de la plateforme Workers AI native pour exécuter les requêtes et les flux de streaming.' },
      { text: 'Modèle DeepSeek : Intégration du modèle deepseek/deepseek-v4-pro par défaut avec token de sécurisation cloud.' },
    ],
  },
  {
    version: 'v8.6.0',
    date: '1 juillet 2026 à 09h00',
    title: 'Rapport hebdomadaire automatique',
    highlights: [
      { text: 'Rapport hebdomadaire automatique : chaque lundi, recevez un résumé de vos actions de la semaine — emails envoyés, réponses reçues, rendez-vous bookés, et vos meilleures opportunités du moment.' },
      { text: 'Livré chaque lundi à 8h : votre rapport est généré automatiquement et apparaît dans vos notifications en tant que résumé cliquable.' },
      { text: 'Taux d\'acceptation NBA : dans votre centre de pilotage, suivez combien de recommandations IA vous avez appliquées cette semaine.' },
      { text: 'Carte de rapport dans Revenue OS : 4 indicateurs clés (score IA, bookings, réponses positives, leads avancés) avec rapport détaillé en un clic.' },
    ],
  },
  {
    version: 'v8.5.0',
    date: '1 juillet 2026 à 08h00',
    title: 'Gestion de la charge d\'équipe',
    highlights: [
      { text: 'Tableau de charge d\'équipe : voyez en un coup d\'œil qui est surchargé, qui a de la disponibilité, et combien de leads sont assignés à chaque membre.' },
      { text: 'Alertes de délai dépassé : Minerva vous avertit automatiquement quand une action importante dépasse son délai (ex: relance non envoyée depuis 3 jours).' },
      { text: 'Feed revenus équipe : un onglet dédié dans la page Équipe affiche toutes les victoires commerciales — réponses positives, rendez-vous bookés — avec horodatage.' },
      { text: 'Bouton d\'assignation intelligente : assignez une action NBA à un membre en un clic — il reçoit une notification automatique.' },
      { text: 'Page Équipe enrichie : 3 onglets — Membres, Charge de travail, Feed revenus.' },
    ],
  },
  {
    version: 'v8.4.0',
    date: '1 juillet 2026 à 07h00',
    title: 'Détection automatique des réponses positives',
    highlights: [
      { text: 'Quand un prospect répond positivement, Minerva le détecte automatiquement et met à jour son statut, crée une tâche de booking, et notifie votre équipe — sans aucune action de votre part.' },
      { text: 'Détection d\'intention enrichie : les réponses signalant un intérêt ou une demande de rendez-vous déclenchent toutes les actions commerciales appropriées en boucle fermée.' },
    ],
  },
  {
    version: 'v8.3.0',
    date: '1 juillet 2026 à 06h00',
    title: 'Mémoire stratégique de l\'agent',
    highlights: [
      { text: 'Mémoire stratégique : Minerva apprend de vos résultats — quelles niches répondent le mieux, quel jour envoyer vos emails, quel canal utiliser pour chaque type de client.' },
      { text: 'Recommandations actionnables : 3 conseils stratégiques générés par l\'IA à partir de vos vrais résultats, visibles dans votre cockpit.' },
      { text: 'Carte Mémoire stratégique dans Revenue OS : top 5 apprentissages avec niveau de confiance et taille d\'échantillon.' },
    ],
  },
  {
    version: 'v8.2.0',
    date: '1 juillet 2026 à 05h00',
    title: 'Parcours client en 7 phases',
    highlights: [
      { text: 'Chaque lead suit maintenant un parcours en 7 étapes claires : Email initial → Relance → Appel → Visite terrain → Booking → Proposition → Suivi. Minerva calcule la phase de chaque prospect automatiquement.' },
      { text: 'Timeline de progression dans chaque fiche lead : visualisez où en est chaque prospect dans son parcours, avec un bouton "Exécuter maintenant" pour passer à l\'étape suivante.' },
      { text: 'Changement de canal automatique : si un prospect a ouvert 3 emails sans répondre, Minerva suggère de passer à l\'appel ou au terrain.' },
    ],
  },
  {
    version: 'v8.1.0',
    date: '1 juillet 2026 à 04h00',
    title: 'Revenue OS — Centre de pilotage',
    highlights: [
      { text: 'Command Center (/command) : nouvelle page de pilotage avec 4 blocs en temps réel — File de priorités, Prochaines meilleures actions, Performance, État opératoire.' },
      { text: 'File de priorités intelligente : 4 catégories (Urgent, Opportunité, Bloqué, À approuver) avec les 5 leads les plus importants de chaque catégorie.' },
      { text: 'Filtres niche + canal : filtrez instantanément votre pipeline par secteur ou type de contact.' },
      { text: 'Panneau droite : KPIs temps réel, fil des dernières actions IA, alertes de signaux, taux d\'acceptation des recommandations.' },
    ],
  },
  {
    version: 'v8.0.0',
    date: '30 juin 2026 à 20h00',
    title: 'Agent Minerva autonome',
    highlights: [
      { text: 'Agent autonome toutes les 4h — l\'agent analyse votre pipeline, choisit les meilleures actions et les exécute automatiquement. Toutes les actions sont tracées avec explication.' },
      { text: 'Digest du soir (18h) — résumé quotidien enrichi : emails envoyés, réponses reçues, RDV créés, actions agent, leads ajoutés. Visible dans les notifications + email si SMTP configuré.' },
      { text: 'Carte "Résumé d\'aujourd\'hui" dans Today — 4 KPIs (emails, réponses, RDV, actions agent) et les 3 dernières actions avec leur raisonnement.' },
      { text: 'RDV Google Calendar automatique — quand une réponse positive est détectée dans Gmail, un RDV est créé automatiquement dans votre agenda pour le lendemain à 10h.' },
      { text: 'Vérification Gmail toutes les 2h — détection quasi temps réel des nouvelles réponses.' },
      { text: 'Mode Terrain — badge "(approx.)" pour les leads sans coordonnées GPS exactes.' },
      { text: 'Automations — l\'action "Envoyer un email" crée désormais un brouillon dans la file d\'approbation Outreach.' },
    ],
  },
  {
    version: 'v7.1.0',
    date: '30 juin 2026 à 18h00',
    title: 'Moteur NBA & Cockpit',
    highlights: [
      { text: 'Moteur NBA hybride — score 0-100 calculé sur 3 signaux : délai sans contact, engagement email, performance de la niche. Actions recommandées : relance email, changement de canal, booking, nurture, pause.' },
      { text: 'Apprentissage par niche — Minerva analyse vos taux de réponse et booking par secteur pour recommander le canal et le timing optimal.' },
      { text: 'Score et explication NBA — 3 endpoints : scoring batch, calcul à la demande, explication IA par lead (bouton "Pourquoi ?" dans chaque fiche).' },
      { text: 'Carte NBA dans chaque fiche lead — score coloré, action recommandée, raisonnement de l\'agent, recalcul en temps réel.' },
      { text: 'Cockpit Revenue OS (/cockpit) — 4 KPIs, séquences performantes, alertes de signaux, top 5 leads NBA.' },
      { text: 'Onboarding stratégique — modal de démarrage 2 étapes (niche + objectif) pour initialiser les recommandations dès la première connexion.' },
    ],
  },
  {
    version: 'v7.0.0',
    date: '30 juin 2026 à 16h00',
    title: 'Prochaine Meilleure Action',
    highlights: [
      { text: 'Prochaine Meilleure Action (NBA) — carte en haut de l\'Accueil : Minerva identifie l\'action la plus urgente du moment et vous la présente avec son raisonnement et les signaux justificatifs.' },
      { text: 'Exécution en 1 clic — générez un brouillon de relance, planifiez un rappel ou redirigez vers le bon écran selon l\'action recommandée.' },
      { text: 'Bouton "Passer" — marquez une action comme rejetée et chargez automatiquement la suivante dans la file.' },
      { text: 'Carte NBA — bordure verte distinctive, label d\'action avec icône typée, raisonnement en italique, signaux en petite typo.' },
    ],
  },
  {
    version: 'v6.2.0',
    date: '29 juin 2026 à 22h00',
    title: 'Profils d\'autonomie agent',
    highlights: [
      { text: '3 profils d\'autonomie — Manuel / Contrôlé / Mains libres remplacent les 11 réglages individuels dans Paramètres → Intelligence. Un clic suffit pour configurer l\'agent.' },
      { text: 'Profil Contrôlé (recommandé) — brouillons et relances générés automatiquement, mis en file d\'approbation. Validez avant l\'envoi.' },
      { text: 'Profil Mains libres — l\'agent agit sans confirmation sur tous les domaines.' },
      { text: 'Réglages avancés toujours accessibles via "Réglages avancés" pour les configurations personnalisées.' },
      { text: 'Indicateur "Configuration personnalisée" si aucun profil preset ne correspond.' },
    ],
  },
  {
    version: 'v6.1.0',
    date: '29 juin 2026 à 20h00',
    title: 'Relances automatiques & Intent IA',
    highlights: [
      { text: 'Relance automatique des leads tièdes — bouton "Générer les relances" dans Today : l\'agent détecte les top 3 leads inactifs depuis 7j+ et génère un brouillon pour chacun dans Outreach → Approbations.' },
      { text: 'Carte Priorités agent dans Today — top 5 leads tièdes/froids triés par score avec badge température et jours d\'inactivité.' },
      { text: 'Badge intent IA sur chaque thread Inbox — classification automatique : Intéressé, RDV, Infos demandées, Objection, Pas intéressé.' },
      { text: 'Auto-classification à l\'ouverture d\'un thread — premier clic → classification silencieuse, badge mis à jour en temps réel.' },
      { text: 'Endpoint /api/agent/relance — génère 3 brouillons de relance en un appel, visibles immédiatement dans Approbations.' },
      { text: 'Endpoint /api/inbox/classify — classification IA + sauvegarde intent + log dans timeline lead.' },
    ],
  },
  {
    version: 'v6.0.0',
    date: '29 juin 2026 à 18h00',
    title: 'Plateforme Minerva AI dédiée',
    highlights: [
      { text: 'Minerva AI — plateforme dédiée aux fonctionnalités IA : Assistant, Intelligence, Agents, Skills. Accessible via icône dans la topbar.' },
      { text: 'Navigation duale — layout AI épuré avec 4 entrées, historique de sessions dans la sidebar, switch Reach ↔ AI en un clic.' },
      { text: 'Switch de plateforme dans la topbar — bouton "Minerva AI" sur Reach, bouton "Minerva Reach" sur AI. Prêt pour subdomains.' },
      { text: 'Nav Reach simplifiée — 6 entrées : Accueil, Leads, Outreach, Carte, Agenda, Équipe.' },
      { text: 'Bug Scrape → Email en mode Electron : websiteDescription transmise directement dans le body POST.' },
      { text: 'Sidebar Reach : bloc session assistant retiré (code mort). Import nettoyé.' },
    ],
  },
  {
    version: 'v5.3.0',
    date: '29 juin 2026 à 16h00',
    title: 'Outreach Control Center',
    highlights: [
      { text: 'Outreach Control Center — Campagnes et Approbations sont désormais des écrans complets.' },
      { text: 'Écran Campagnes — liste avec KPIs (envoyés, ouvertures, réponses, positifs, RDV), toggle pause/relance, alertes de performance.' },
      { text: 'Écran Approbations — file unifiée brouillons IA + actions agent. Approuver ou Rejeter chaque item avec son raisonnement.' },
      { text: 'Autonomie Outreach granulaire — 6 niveaux indépendants : création brouillons, premier envoi, relances auto, réponse, pause séquence, mise à jour pipeline.' },
      { text: 'Nouveaux outils Agent Minerva — pause/resume séquence, tag lead, classify reply, résumé inbox, suggestion de follow-up.' },
      { text: 'Routes API outreach — enrollments pause/resume, approbations, campagnes, enrollments avec join lead+séquence.' },
      { text: 'Migration Supabase v5_outreach — colonnes source/intent_type/approved sur drafts, current_step/next_send_at/paused_at sur enrollments.' },
    ],
  },
  {
    version: 'v5.2.0',
    date: '29 juin 2026 à 14h00',
    title: 'Agent Minerva & Mémoire IA',
    highlights: [
      { text: 'Agent Minerva — boucle autonome perceive → plan → act → log. L\'agent analyse le pipeline, choisit les meilleures actions et les exécute selon votre niveau d\'autonomie.' },
      { text: 'Niveaux d\'autonomie par domaine — 5 niveaux (Désactivé → Automatique) configurables pour Tâches, Pipeline, Séquences, Emails et Terrain.' },
      { text: 'Mémoire d\'agent — table agent_memory par workspace. L\'agent mémorise ses apprentissages et les réinjecte à chaque cycle.' },
      { text: 'Journal des actions agent — chaque action tracée avec reasoning et signaux. Approuver ou rejeter depuis l\'interface.' },
      { text: 'AI Gateway unifié — lib/ai.ts unique source de vérité pour tous les appels IA. Fallback automatique Anthropic ↔ OpenRouter.' },
      { text: 'Suppression de Groq et Together AI — stack IA simplifié : Claude (Anthropic) + OpenRouter.' },
      { text: 'Migration Supabase v5_agent — tables agent_memory, agent_actions, ai_gateway_logs ; colonnes agent_autonomy + agent_enabled.' },
    ],
  },
  {
    version: 'v5.1.0',
    date: '29 juin 2026 à 12h00',
    title: 'Inbox Google & Timeline unifiée',
    highlights: [
      { text: 'Sidebar v5 — "Paramètres" retiré des entrées principales. Terrain renommé "Carte".' },
      { text: 'Rôles — page dédiée /settings/roles/new et /team/roles/new pour créer des rôles d\'accès.' },
      { text: 'Google Inbox — correction critique : getFreshAccessToken utilisait maybeSingle() qui cassait avec plusieurs comptes. Correction avec limit(1).' },
      { text: 'Breadcrumb Leads — sous-navigation (Liste | Pipeline | Comptes | Prospection | Timeline) affichée sur les pages de la famille Leads.' },
      { text: 'Timeline unifiée — page /leads/timeline avec notifications, tâches, visites terrain, chronologie par date.' },
      { text: 'Bannière de mise à jour — version mise à jour.' },
    ],
  },
  {
    version: 'v5.0.0',
    date: '29 juin 2026 à 10h00',
    title: 'Navigation v5 & AI Gateway',
    highlights: [
      { text: 'Navigation v5 — 7 entrées épurées : Accueil, Leads, Outreach, Terrain, Agenda, Équipe, Paramètres.' },
      { text: 'AI Gateway interne — centralise tous les appels IA. Logs persistés dans ai_gateway_logs.' },
      { text: 'Agent Feed sur l\'Accueil — timeline temps réel des actions IA. Polling 30s, liens cliquables vers les leads concernés.' },
      { text: 'Outreach unifié — 5 onglets : Inbox, Séquences, Campagnes, Templates, Approbations.' },
      { text: 'Famille Leads — sous-navigation Liste | Pipeline | Comptes | Prospection | Timeline.' },
      { text: 'Diagnostics IA dans Paramètres — latence par provider, taux succès/fallback, test ping, historique des requêtes.' },
    ],
  },
  {
    version: 'v4.5.0',
    date: '28 juin 2026 à 22h00',
    title: 'Automations & Changelog redesigné',
    highlights: [
      { text: 'Changelog — badges de type : les étiquettes texte deviennent des icônes circulaires 18px (Bug rouge, Sparkles vert, Palette indigo).' },
      { text: 'Leads — restauration de l\'arrière-plan crème chaud (#fafaf8) avec superposition de grille.' },
      { text: 'Centre d\'automations (/automations) — 4 cartes avec toggle on/off, bouton "Run maintenant", historique 7 jours.' },
      { text: 'Trigger manuel /api/automations/trigger — déclenche n\'importe quel cron depuis la page Automations.' },
    ],
  },
  {
    version: 'v4.4.0',
    date: '28 juin 2026 à 20h00',
    title: 'Performance & Iconographie',
    highlights: [
      { text: 'Charts analytics — polish visuel : axes, grilles, tooltips alignés avec la charte graphique (#059669 vert Minerva).' },
      { text: 'Mémoïsation — useMemo et React.memo sur les composants lourds (graphiques, tableaux) pour éliminer les re-renders inutiles.' },
      { text: 'Iconographie unifiée : remplacement des icônes génériques par des variantes Lucide cohérentes.' },
      { text: 'Toasts améliorés : description contextuelle, durée 5s, icône de statut colorée.' },
      { text: 'Titres de page : chaque vue met à jour document.title avec le nom de l\'entité.' },
    ],
  },
  {
    version: 'v4.3.0',
    date: '28 juin 2026 à 18h00',
    title: 'Pipeline enrichi & Propositions',
    highlights: [
      { text: 'Nouvelles étapes pipeline : "Proposition envoyée" et "Négociation" avec codes couleur (violet + ambre).' },
      { text: 'Onglet Prévisions dans le pipeline : KPIs, graphique barres par mois pondéré, deals à clôturer.' },
      { text: 'Builder de propositions 5 sections avec génération IA par section et calcul taxes QC (TPS 5% + TVQ 9.975%).' },
      { text: 'Export PDF proposition — Electron natif. Web : impression navigateur. Format A4 professionnel.' },
      { text: 'Persistance propositions dans table "proposals". Bouton "Marquer envoyée" automatique.' },
      { text: 'IA par section : génère Présentation, Problème, Solution ou Modalités selon le contexte du lead.' },
    ],
  },
  {
    version: 'v4.2.0',
    date: '28 juin 2026 à 16h00',
    title: 'Performances serveur optimisées',
    highlights: [
      { text: 'SVG inline — icônes Instagram et Facebook en JSX inline. Zéro requête réseau, rendu immédiat.' },
      { text: 'Singleton admin Supabase — client service-role partagé. Élimine la réinstanciation par requête.' },
      { text: 'Correction N+1 team/members — profils chargés en une seule requête IN au lieu de N requêtes.' },
      { text: 'Cache serveur + client — TTL 30-60s pour /api/team/members et permissions. Invalidation automatique.' },
    ],
  },
  {
    version: 'v4.1.0',
    date: '27 juin 2026 à 20h00',
    title: 'UX fluide & Recherche améliorée',
    highlights: [
      { text: 'Transitions de page — barre de progression verte fine en haut + fade-in 180ms. Respect prefers-reduced-motion.' },
      { text: 'Skeleton chargement — tableau Leads affiche 8 lignes animées pendant le chargement initial.' },
      { text: 'Polices — correction subset Inter + display: swap pour éliminer les décalages CLS.' },
      { text: 'Recherche leads — debounce 220ms + historique 5 dernières recherches + touche Escape pour effacer.' },
      { text: 'AlertDialog — remplace les window.confirm() natifs. Suppression en masse avec dialog contextuel.' },
      { text: 'Fil d\'Ariane — affiche le vrai nom du business dans la fiche lead (ex: "Cabinet Dentaire Dr. Laurent").' },
    ],
  },
  {
    version: 'v4.0.0',
    date: '27 juin 2026 à 18h00',
    title: 'Automatisation complète',
    highlights: [
      { text: 'Automatisation complète — enrichissement batch, cron nocturne à 2h, auto-email après enrichissement. L\'app peut prospecter et contacter sans intervention.' },
      { text: 'Tags leads — auto-tags depuis statut CRM et réponses email. Tags libres manuels depuis la fiche lead.' },
      { text: 'Paramètres Automations — 4 toggles : Enrichir à l\'import, Enrichissement nocturne, Email auto, Tagger les réponses.' },
      { text: 'Cron nocturne — /api/cron/enrich-leads tourne à 2h, traite 50 leads non enrichis par workspace.' },
      { text: 'AI 429 rate limit — retry automatique après 60s pour les appels non-streaming et streaming.' },
      { text: 'Page Prospection responsive — grille xl:grid-cols-[1fr_300px], s\'adapte à la largeur disponible.' },
    ],
  },
  {
    version: 'v3.47.0',
    date: '27 juin 2026 à 14h00',
    title: 'Corrections Google & Interface',
    highlights: [
      { text: 'Google auth — getAuthStatus renforcé : si des tokens valides existent, auto-réparation. Plus jamais de demande de reconnexion inutile.' },
      { text: 'google_tokens upsert — évite les doublons lors d\'une reconnexion.' },
      { text: 'Intégrations Google — si déjà connecté dans /integrations, toutes les pages le détectent.' },
      { text: 'Fiche lead — layout responsive corrigé : 2 colonnes à xl (≥1280px), padding réduit.' },
      { text: 'Google Calendar (Today) + Gmail/Agenda — GoogleConnectModal centralisé.' },
      { text: 'AI 429 — message explicite "modèle temporairement saturé, réessaie dans 30-60s".' },
      { text: 'Widget Intelligence — rapport IA rendu en JSX structuré via MarkdownRenderer.' },
      { text: 'Changelog — tags (Fix / Nouveauté / Design) sur tous les highlights. Versions v3.43–v3.46 rétroactivement taguées.' },
    ],
  },
  {
    version: 'v3.46.0',
    date: '26 juin 2026 à 22h00',
    title: 'Inbox & Statistiques',
    highlights: [
      { text: 'Inbox Gmail — resolveAccessToken renforcé : auto-réinitialise le statut à "connected" si tokens valides.' },
      { text: 'Google Maps — bouton converti en electron-safe (shell.openExternal dans Electron).' },
      { text: 'Couleurs profil agence — bouton "Réinitialiser" pour revenir au vert Minerva (#059669).' },
      { text: 'Attribution leads projets — picker de projet dans la fiche lead fonctionnel (project_id FK).' },
      { text: 'Templates Email — accessible depuis la sidebar sous "Templates Email" (/email-templates).' },
      { text: 'Notifications — 4 nouveaux types : email_sent, email_received, lead_aging, scraping_done.' },
      { text: 'Page Statistiques (/analytics) — 3 onglets : Vue globale, Prospection, Activité équipe.' },
    ],
  },
  {
    version: 'v3.45.0',
    date: '26 juin 2026 à 20h00',
    title: 'Responsive global',
    highlights: [
      { text: 'Refonte responsive globale — suppression de toutes les contraintes de largeur fixes sur toutes les pages. Contenu fluide sur tout l\'écran.' },
      { text: 'Padding adaptatif appliqué sur 25+ pages : Today, Leads, Pipeline, Analytics, Prospecting, Settings, etc.' },
      { text: 'BottomBlur Messages — n\'apparaît plus sur /messages (couvrait l\'input bar).' },
      { text: 'globals.css — overflow-x: hidden sur html/body + classes .page-container et .table-responsive.' },
    ],
  },
  {
    version: 'v3.44.0',
    date: '26 juin 2026 à 18h00',
    title: 'Projets & Leads',
    highlights: [
      { text: 'Projets — association leads ↔ projets via colonne project_id. Sélecteur dans la fiche lead.' },
      { text: 'Fiche lead — sélecteur "Projet" dans la sidebar droite. Lien direct vers le projet si assigné.' },
      { text: 'Page projet — compteur et filtre utilisent project_id explicite.' },
      { text: 'updateLead : projectId → project_id mappé dans les deux chemins (Electron + Supabase).' },
    ],
  },
  {
    version: 'v3.43.0',
    date: '25 juin 2026 à 14h00',
    title: 'Email & OpenRouter',
    highlights: [
      { text: 'OpenRouter — modèles Anthropic remappés automatiquement vers meta-llama/llama-3.3-70b-instruct:free.' },
      { text: 'Email — bannière de confirmation après envoi (sujet + destinataire) + notification macOS via Electron.' },
      { text: 'Panneau outreach — Score V2 (ICP/Engagement) retiré. Voicemail activée dès qu\'un numéro est présent.' },
      { text: 'Bouton Google Maps — shell.openExternal() dans Electron. Ouvre dans le navigateur système.' },
      { text: 'Inbox — onglet "Envoyés" : fils du label SENT Gmail, liés automatiquement aux leads par email.' },
      { text: 'Inbox OAuth — resolveAccessToken maybeSingle() + fallback legacy settings + google_accounts.' },
    ],
  },
  {
    version: 'v3.42.0',
    date: '24 juin 2026 à 14h00',
    title: 'Google Places & Animations',
    highlights: [
      { text: 'Google Places auto-enrichissement : note, avis, résumé IA et top 2 avis récupérés automatiquement (cache 7j). Clé GOOGLE_PLACES_API_KEY requise.' },
      { text: 'Section "Google Insights" dans la fiche lead : rating étoiles, résumé IA, extraits d\'avis.' },
      { text: 'Email IA refondu : 1ère phrase spécifique issue de Google. Sans "J\'espère que tu vas bien" ni "leader".' },
      { text: 'Fiche lead mobile : 8 onglets scrollables horizontalement (overflow-x-auto).' },
      { text: 'Transition fluide entre onglets (AnimatePresence fade + slide 6px, 160ms).' },
      { text: 'Sidebar — slide depuis la gauche : drawer sur mobile, width spring + inner slide sur desktop.' },
      { text: 'Transitions de page globales : AnimatePresence mode=\'wait\' (opacity + y:8→0, 180ms).' },
      { text: 'Migration SQL v4.9 : colonnes google_place_id, google_place_data, google_enriched_at sur leads.' },
    ],
  },
  {
    version: 'v3.41.0',
    date: '24 juin 2026 à 10h00',
    title: 'Navigation & Animations spring',
    highlights: [
      { text: 'Bottom nav mobile : 4 destinations + sheet "Plus" pour 6 destinations secondaires. Retour tactile spring (scale: 0.88).' },
      { text: 'Icônes sidebar : strokeWidth 1.5 inactif / 2 actif, opacity 60% inactif.' },
      { text: 'Sidebar — accordion "Paramètres & Plus" collapsable AnimatePresence (height: 0→auto, 180ms).' },
      { text: 'Workspace switcher animé : AnimatePresence mode=\'wait\' key={activeWorkspace.id}.' },
      { text: 'Barre de filtres leads plus aérée : gap-3, hauteurs h-8, hover vert #047857.' },
      { text: 'Toutes les animations Framer Motion spring (stiffness 300–400, damping 30, mass 1).' },
    ],
  },
  {
    version: 'v3.40.0',
    date: '23 juin 2026 à 22h00',
    title: 'Smartlead, Voicemail & Bibliothèque',
    highlights: [
      { text: 'Smartlead sequences : enrôler un lead dans une campagne Smartlead depuis la fiche lead. Score ICP + canaux recommandés.' },
      { text: 'Voicemail Drop Cowboy : script IA ≤80 mots + envoi Ringless Voicemail via API Drop Cowboy.' },
      { text: 'Bibliothèque de preuves (/leverage-library) : CRUD études de cas. L\'IA sélectionne la plus pertinente lors de la génération d\'email.' },
      { text: 'Paramètres → Intégrations : clés Smartlead, Drop Cowboy, IA Inbox (toggle auto-réponse + seuil confiance).' },
      { text: 'Migration SQL v4.8 : tables leverage_library et voicemail_queue + colonnes settings.' },
    ],
  },
  {
    version: 'v3.39.0',
    date: '23 juin 2026 à 20h00',
    title: 'Composer Gmail & DM',
    highlights: [
      { text: 'Email → Brouillon Gmail : l\'envoi crée un brouillon dans Gmail. Bouton "Sauvegarder" conserve dans la table drafts.' },
      { text: 'Onglet DM (Instagram/Facebook) : composer un message direct, générer un template IA, copier en 1 clic.' },
      { text: 'Description du lead éditable : Textarea avec bouton "Enregistrer" via updateLead.' },
      { text: 'Filtre "Avis minimum" dans le scraper : slider 0–500 avis, filtrage en temps réel.' },
      { text: 'Dernier lead visité en tête de liste avec badge "Récemment visité".' },
    ],
  },
  {
    version: 'v3.38.0',
    date: '23 juin 2026 à 18h00',
    title: 'Réseaux sociaux & Instagram',
    highlights: [
      { text: 'Réseaux sociaux sur les fiches leads : section Instagram/Facebook/LinkedIn + site web avec icônes SVG natifs.' },
      { text: 'Galerie Instagram : bouton "Voir les posts" scrape le profil, affiche une grille 3×3 des derniers posts.' },
      { text: 'Bibliothèque → Images : upload vers Supabase Storage, galerie avec prévisualisation, copie d\'URL, suppression.' },
      { text: 'Setup agence : le logo importé est sauvegardé dans la bibliothèque. Couleur d\'accent workspace avec aperçu live.' },
      { text: 'Migration SQL v4.7 : colonnes agency_website, agency_logo_url, social_links, table services.' },
    ],
  },
  {
    version: 'v3.37.0',
    date: '23 juin 2026 à 16h00',
    title: 'Composer unifié & Enrichissement',
    highlights: [
      { text: 'Composer unifié dans la fiche lead : 4 actions — Email (Gmail), Appel (script IA + résultats), Tâche rapide, RDV (booking).' },
      { text: 'Enrichissement v2 : logo (Google Favicons), taille estimée (Claude AI), stack tech (19 technos), score présence web 0-100.' },
      { text: 'Page /ads : 3 onglets — Facebook Lead Ads (OAuth Meta), Google Ads (guide UTM), Attribution marketing.' },
      { text: 'Dashboard Attribution : 4 KPIs + tableau par source (CPL, taux RDV, délai, pipeline).' },
      { text: 'Alerte Speed-to-Lead dynamique : rouge si délai > 5 min, vert si optimal.' },
    ],
  },
  {
    version: 'v3.36.0',
    date: '23 juin 2026 à 14h00',
    title: 'Déduplication & Speed-to-Lead',
    highlights: [
      { text: 'Déduplication multi-source : détection automatique par domaine, téléphone et nom (algorithme Levenshtein). Tab "Doublons" dans /acquisition.' },
      { text: 'Fusion intelligente : le lead avec le plus de champs remplis devient le principal, les doublons sont archivés.' },
      { text: 'Widget Speed-to-Lead dans /acquisition : timer SLA par lead entrant (vert < 2h, ambre < 24h, rouge > 24h).' },
      { text: 'Nouveaux types séquences multicanales : call, sms, ab_test avec scripts et variantes.' },
      { text: '150+ nouvelles clés i18n (FR/EN/DE) pour les modules v4.5.' },
    ],
  },
  {
    version: 'v3.35.1',
    date: '23 juin 2026 à 12h30',
    title: 'Icônes officielles',
    highlights: [
      { text: 'Résolution des bugs d\'icônes géantes (ex: Teams) qui brisaient la mise en page.' },
      { text: 'Migration vers les logos officiels @thesvg/react (Gmail, Drive, Maps, Zoom, SharePoint, Teams, Todoist, Notion, Slack, Tasks, Meet).' },
      { text: 'Composant Google Contacts haute fidélité.' },
    ],
  },
  {
    version: 'v3.35.0',
    date: '23 juin 2026 à 12h00',
    title: 'Bibliothèque d\'icônes premium',
    highlights: [
      { text: 'Intégration globale de @thesvg/react — icônes officielles hautes fidélité pour tous les services connectés.' },
      { text: 'Icônes personnalisées pour Gmail, Google Maps, Google Chat, Drive, Calendar, Slack, GitHub, Todoist, Teams.' },
      { text: 'Cartes de configuration dans Paramètres : suppression des arrière-plans colorés au profit de boîtes neutres.' },
      { text: 'Fiches lead : logos Gmail, Google Maps, Google Calendar sur les onglets et actions.' },
    ],
  },
  {
    version: 'v3.34.0',
    date: '23 juin 2026 à 10h00',
    title: 'Dashboard premium',
    highlights: [
      { text: 'Alignement esthétique du Dashboard sur la charte graphique premium.' },
      { text: 'Suppression des ombres surélevées au profit du design plat et bordures hairline #e5e5e0.' },
      { text: 'Arrière-plan grille Cult UI (bg-grid-pattern-20).' },
      { text: 'Couleurs accentuation uniformisées en vert émeraude (#059669) sur tous les widgets.' },
      { text: 'Mise à jour des 17 widgets du cockpit (objectifs, agenda, séquences, tâches, suggestions IA, stats…).' },
    ],
  },
  {
    version: 'v3.33.0',
    date: '23 juin 2026 à 08h00',
    title: 'Refonte 5 pages clés',
    highlights: [
      { text: 'Refonte Premium : Agenda, Acquisition, Comptes, Skills IA, Automations — conformes à la charte Cult UI.' },
      { text: 'Grille bg-grid-pattern-20 harmonisée sur toutes ces pages.' },
      { text: 'Suppression des ombres, typographie dense, accents vert #059669 uniformes.' },
      { text: 'i18n complète : textes en dur remplacés par des clés dynamiques (FR/EN/DE).' },
      { text: 'Agenda : calendrier mensuel localisé + vues Semaine/Jour horaires.' },
    ],
  },
  {
    version: 'v3.32.0',
    date: '23 juin 2026 à 06h00',
    title: 'Partage lead & Export Drive',
    highlights: [
      { text: 'Lien de partage lead corrigé — share-preview réécrit avec 2 requêtes Supabase séparées. Fonctionne maintenant.' },
      { text: 'Aperçu partagé : note Google (étoiles), badges ville/catégorie, score en vert Minerva.' },
      { text: 'Export Google Drive — documents exportés en Google Docs (HTML→Docs) avec mise en forme complète.' },
      { text: 'Intégrations Google — Google Contacts et Google Tasks ajoutés. Panneau Google Workspace unifié.' },
      { text: 'Génération de messages — fallback Anthropic Haiku si le modèle configuré échoue.' },
      { text: 'Migration SQL v4.5 — colonnes enrichissement leads + correction RLS table lead_shares.' },
    ],
  },
  {
    version: 'v3.31.0',
    date: '22 juin 2026 à 23h55',
    title: 'Chat images & Nettoyage codebase',
    highlights: [
      { text: 'Lightbox plein écran dans Messages — cliquer une image ouvre un overlay plein écran.' },
      { text: 'Score v2 auto-persisté — calculé et sauvegardé à l\'ouverture d\'une fiche lead.' },
      { text: 'Nettoyage codebase — 71 fichiers supprimés (scratch-*.cjs, screenshots, 13 composants démo). Migrations SQL déplacées.' },
      { text: 'RLS fix documenté — Policies leads_workspace / tasks_workspace identifiées et supprimées. Données restaurées.' },
    ],
  },
  {
    version: 'v3.30.0',
    date: '22 juin 2026 à 23h10',
    title: 'Scoring v2 multidimensionnel',
    highlights: [
      { text: 'Scoring v2 — Score 0-100 sur 4 axes : ICP Fit, Engagement (pipeline + température), Urgence, Revenu.' },
      { text: 'Carte score dans la fiche lead — 4 barres de progression colorées avec valeurs individuelles /25.' },
      { text: 'API /api/leads/score — calcule et sauvegarde les 4 sous-scores + log score_updated dans lead_events.' },
      { text: 'Migration SQL — 4 nouvelles colonnes : score_icp, score_engagement, score_urgency, score_revenue.' },
    ],
  },
  {
    version: 'v3.29.0',
    date: '22 juin 2026 à 22h55',
    title: 'Images & Emoji dans le chat',
    highlights: [
      { text: 'Rendu natif des images et GIFs — s\'affichent correctement, clic pour plein écran.' },
      { text: 'Emoji picker — 45 emojis en 3 catégories (Smileys, Gestes, Symboles).' },
      { text: 'Upload image/GIF avec compression auto (max 800px, qualité 70%). Aperçu avant envoi.' },
      { text: 'Queue Processor Outreach — vérifie fenêtre d\'envoi et quota, envoie 1 email HTML par workspace par run.' },
    ],
  },
  {
    version: 'v3.28.0',
    date: '23 juin 2026 à 00h05',
    title: 'Générateur de propositions',
    highlights: [
      { text: 'Générateur de proposition interactif — sélecteur de services, ajustement de prix en direct, lignes personnalisées.' },
      { text: 'Calculateur financier — Total HT, taxes (14.975% défaut QC) et TTC en temps réel.' },
      { text: 'Aperçu A4 format papier — rendu en direct style impression professionnel.' },
      { text: 'Export PDF natif Desktop via printToPdf Electron.' },
      { text: 'Enrichissement B2B — scraping site, identification du décideur, pitch d\'appel québécois.' },
    ],
  },
  {
    version: 'v3.27.4',
    date: '22 juin 2026 à 19h45',
    title: 'Correctifs OpenRouter & Scraping',
    highlights: [
      { text: 'Modèles retirés d\'OpenRouter — redirection automatique vers openrouter/free pour éviter les 404.' },
      { text: 'Scraping site web — élimination automatique des balises Markdown brutes en cas de fallback.' },
      { text: 'Paramètres IA — routeur automatique libre d\'OpenRouter proposé par défaut.' },
    ],
  },
  {
    version: 'v3.27.3',
    date: '22 juin 2026 à 19h30',
    title: 'Runtime API Chat',
    highlights: [
      { text: 'Runtime API Chat — changement de Edge vers Node.js pour résoudre les erreurs de bundle Anthropic SDK.' },
      { text: 'Streaming SSE maintenu sans interruption pour les utilisateurs.' },
    ],
  },
  {
    version: 'v3.27.2',
    date: '22 juin 2026 à 19h15',
    title: 'Migration Next.js 16 Proxy',
    highlights: [
      { text: 'Migration middleware.ts vers proxy.ts (Next.js 16) — résout les erreurs de bundle Vercel.' },
      { text: 'Bascule vers Node.js natif pour la compatibilité avec toutes les dépendances.' },
      { text: 'Nettoyage config Webpack obsolète dans next.config.ts.' },
    ],
  },
  {
    version: 'v3.27.1',
    date: '22 juin 2026 à 18h50',
    title: 'Configuration Vercel & OpenRouter',
    highlights: [
      { text: 'OPENROUTER_API_KEY enregistrée sur Vercel (Production, Preview, Development).' },
      { text: 'Clé OpenRouter ajoutée dans .env.production.local pour les tests locaux.' },
      { text: 'Liaison IA opérationnelle et validée.' },
    ],
  },
  {
    version: 'v3.27.0',
    date: '22 juin 2026 à 22h45',
    title: 'Moteur IA unifié',
    highlights: [
      { text: 'lib/ai.ts — moteur IA prenant en charge OpenRouter, Anthropic avec cascade intelligente des clés API.' },
      { text: 'Streaming SSE standardisé — format delta OpenAI pour compatibilité client.' },
      { text: 'Refactoring 10 routes d\'API vers le helper unifié.' },
      { text: 'SQLite Electron — colonnes openrouter_key, ai_provider, ai_model avec sync bidirectionnel Supabase.' },
      { text: 'Correctifs TypeScript — déstructuration contextUser + typage index traductions. Compilation réussie.' },
    ],
  },
  {
    version: 'v3.26.0',
    date: '22 juin 2026 à 20h00',
    title: 'Centre d\'acquisition',
    highlights: [
      { text: 'Centre d\'Acquisition (/acquisition) — tour de contrôle des leads entrants, filtrables par source. Badge SLA coloré.' },
      { text: 'Actions rapides — "Qualifier" passe un lead de New → Contacted sans ouvrir la fiche.' },
      { text: 'Timeline unifiée par lead — historique chronologique dans la fiche lead (lead_events + événements synthétiques).' },
      { text: 'Colonnes DB : lead_source_type, utm_*, Table lead_events. Migration SQL v4.1 incluse.' },
    ],
  },
  {
    version: 'v3.25.0',
    date: '22 juin 2026 à 18h00',
    title: 'Temps réel & Présence en ligne',
    highlights: [
      { text: 'Leads & Tâches en temps réel — Supabase Realtime déclenche des mises à jour immédiates sans rechargement.' },
      { text: 'Présence en ligne — détection des membres connectés avec page active et avatar.' },
      { text: 'Edge Runtime — /api/chat, /api/integrations/slack et notion en Edge Runtime Vercel.' },
      { text: 'Web Push (Service Worker) — gestion push + notificationclick. Endpoint /api/push/subscribe.' },
    ],
  },
  {
    version: 'v3.24.0',
    date: '22 juin 2026 à 16h00',
    title: 'Canvas WYSIWYG & Fenêtre flottante',
    highlights: [
      { text: 'Canvas TipTap — éditeur de texte riche style Word/Notion. Gras, Italique, Titres sans écrire du Markdown.' },
      { text: 'Fenêtre flottante — bouton "Détacher" : canvas déplaçable par glisser-déposer. "Ancrer" le ramène.' },
      { text: 'Sauvegarde directe dans la Bibliothèque — bouton "Bibliothèque" dans l\'en-tête.' },
      { text: 'Indicateur de réflexion — icône Minerva pulse pendant la génération IA.' },
      { text: 'Points de contrôle — marque-page sur chaque message pour restaurer la conversation.' },
    ],
  },
  {
    version: 'v3.23.0',
    date: '22 juin 2026 à 14h30',
    title: 'Slack & Notion connecteurs',
    highlights: [
      { text: 'Slack connector — webhook entrant dans Paramètres. Toutes les notifications poussées dans votre canal.' },
      { text: 'Notion connector — token + ID de base pour exporter les documents Canvas vers Notion.' },
      { text: 'Claude Sonnet par défaut — modèle assistant mis à jour. Plus de réponses simulées.' },
      { text: 'Boutons Services — derniers boutons oranges corrigés en vert (#047857).' },
    ],
  },
  {
    version: 'v3.22.0',
    date: '22 juin 2026 à 12h56',
    title: 'Comptes / Entreprises vue 360°',
    highlights: [
      { text: 'Comptes / Entreprises (/accounts) — leads groupés par entreprise. Vue détaillée par compte : contacts, pipeline cumulé, visites terrain et notes.' },
      { text: 'Accès rapide depuis la sidebar dans la section CRM.' },
    ],
  },
  {
    version: 'v3.21.0',
    date: '22 juin 2026 à 12h52',
    title: 'Galerie de preuves de visite',
    highlights: [
      { text: 'Galerie des preuves (/field/gallery) — photos terrain regroupées par mois, avec résultat, contact, niveau d\'intérêt et aperçu plein écran.' },
      { text: 'Accessible depuis Mode Terrain — bouton "Preuves" dans l\'en-tête de tournée.' },
    ],
  },
  {
    version: 'v3.20.0',
    date: '22 juin 2026 à 12h48',
    title: 'Agenda : vues Semaine & Jour',
    highlights: [
      { text: 'Vues Semaine et Jour — grille horaire 7h–20h avec rendez-vous placés à leur heure.' },
      { text: 'Création rapide — cliquez sur un créneau horaire pour planifier un RDV à cette heure.' },
    ],
  },
  {
    version: 'v3.19.0',
    date: '22 juin 2026 à 12h45',
    title: 'Skills partagées & Contexte CRM',
    highlights: [
      { text: 'Skills partagées par équipe — compétences activées partagées au niveau du workspace.' },
      { text: '@ contexte CRM dans le chat — tapez @ pour injecter vos vrais leads, pipeline, tâches.' },
    ],
  },
  {
    version: 'v3.18.0',
    date: '22 juin 2026 à 12h37',
    title: 'Roadmap mise à jour',
    highlights: [
      { text: 'Roadmap — tout ce qui a été livré (v3.0→v3.17) marqué "Disponible".' },
      { text: 'Onglet "Prévu" : intégrations Slack/Notion/SharePoint, Comptes/Entreprises, timeline unifiée.' },
    ],
  },
  {
    version: 'v3.17.0',
    date: '22 juin 2026 à 12h25',
    title: 'Vision & Qualité du code',
    highlights: [
      { text: 'Modèle Vision — joindre une image dans l\'Assistant ; envoyée à un modèle vision, aperçu dans la conversation.' },
      { text: 'Google Connect dans Intégrations — design soigné deux volets depuis la page Intégrations.' },
      { text: 'Qualité — résolution des 262 erreurs ESLint. Lint : 0 erreur.' },
    ],
  },
  {
    version: 'v3.16.0',
    date: '22 juin 2026 à 11h51',
    title: 'Vert partout — Zéro orange',
    highlights: [
      { text: 'Balayage global — tout l\'orange de l\'application (28 fichiers) remplacé par le vert de marque.' },
      { text: 'DESIGN.md et CLAUDE.md — vert #059669 défini comme unique accent par défaut.' },
    ],
  },
  {
    version: 'v3.15.0',
    date: '22 juin 2026 à 11h44',
    title: 'Accent vert harmonisé',
    highlights: [
      { text: 'Pages Aujourd\'hui, Agenda, Services, Configuration, Automations — orange → vert de marque.' },
    ],
  },
  {
    version: 'v3.14.0',
    date: '22 juin 2026 à 11h41',
    title: 'Page Skills en vert',
    highlights: [
      { text: 'Page Skills — accent orange → vert de marque.' },
      { text: 'Puces de compétences @ dans le chat — accent vert.' },
    ],
  },
  {
    version: 'v3.13.0',
    date: '22 juin 2026 à 11h35',
    title: 'Skills cloud',
    highlights: [
      { text: 'Skills synchronisées dans Supabase — disponibles sur tous vos appareils.' },
      { text: 'Compétences par défaut auto-initialisées à la première utilisation.' },
    ],
  },
  {
    version: 'v3.12.0',
    date: '22 juin 2026 à 11h23',
    title: 'Nouvelle page Skills',
    highlights: [
      { text: 'Page Skills — activez des compétences IA par packs (Ventes, Marketing, Produit, Données, Opérations, Support).' },
      { text: 'Créateur de compétences — créez vos propres compétences avec instructions sur mesure.' },
      { text: '@ dans le chat — insérez une compétence pour injecter ses instructions dans la requête.' },
    ],
  },
  {
    version: 'v3.11.0',
    date: '22 juin 2026 à 11h16',
    title: 'Titres IA & Modèle confirmé',
    highlights: [
      { text: 'Titres de discussion générés par l\'IA à partir du premier échange.' },
      { text: 'Modèle IA confirmé — "Minerva AI (Llama 3.3 70B)" via OpenRouter, provider transmis explicitement.' },
    ],
  },
  {
    version: 'v3.10.0',
    date: '22 juin 2026 à 11h11',
    title: 'Connexion Google fiabilisée',
    highlights: [
      { text: 'Nouvelle fenêtre de connexion Google — design soigné en deux volets, réutilisable depuis l\'inbox.' },
      { text: 'URI de redirection OAuth canonique — évite les erreurs "redirect_uri_mismatch".' },
    ],
  },
  {
    version: 'v3.9.0',
    date: '22 juin 2026 à 01h23',
    title: 'Page de prise de RDV',
    highlights: [
      { text: 'Page dédiée /agenda/new — titre, date, heure, durée, lead associé, notes, synchronisation Google.' },
      { text: 'Agenda — charte graphique respectée (tokens couleurs, rayons, typographie).' },
    ],
  },
  {
    version: 'v3.8.0',
    date: '22 juin 2026 à 01h19',
    title: 'Roadmap cochable & Notifications',
    highlights: [
      { text: 'Vérifications cochables dans la Roadmap — compteur d\'avancement par phase (état sauvegardé).' },
      { text: 'Notification quotidienne des relances suggérées par l\'intelligence comportementale.' },
    ],
  },
  {
    version: 'v3.7.0',
    date: '22 juin 2026 à 01h14',
    title: 'Notifications de mention & Plein écran',
    highlights: [
      { text: 'Notifications de mention — @mention dans le chat d\'équipe → notification automatique.' },
      { text: 'Images en plein écran dans le chat d\'équipe.' },
    ],
  },
  {
    version: 'v3.6.0',
    date: '22 juin 2026 à 00h46',
    title: 'Intelligence comportementale activée',
    highlights: [
      { text: 'Intelligence comportementale — bilans hebdomadaires + relances suggérées désormais pleinement fonctionnels.' },
      { text: 'Bilans hebdomadaires — IA génère un résumé d\'opportunités (leads à relancer) le week-end.' },
      { text: 'Relances suggérées dans Today — email de réactivation, appel, audit de site avec création de tâche en 1 clic.' },
    ],
  },
  {
    version: 'v3.5.0',
    date: '22 juin 2026 à 00h41',
    title: 'Activité équipe & Services',
    highlights: [
      { text: 'Activité de l\'équipe — widget temps réel des événements workspace (nouveaux leads, deals, tâches terminées).' },
      { text: 'Services & Tarifs — conformité charte (typographie unifiée).' },
      { text: 'Automations — icônes propres (plus d\'emojis), couleurs alignées.' },
    ],
  },
  {
    version: 'v3.4.0',
    date: '22 juin 2026 à 00h35',
    title: 'Canvas automatique & OpenRouter',
    highlights: [
      { text: 'Canvas automatique — l\'assistant ouvre le Canvas seul quand il rédige un document substantiel.' },
      { text: 'OpenRouter intégré — clé configurée, modèles accessibles de façon fiable.' },
      { text: 'Modèle Vision (texte + image) — nouveau modèle sélectionnable dans l\'assistant.' },
    ],
  },
  {
    version: 'v3.3.0',
    date: '22 juin 2026 à 00h29',
    title: 'Boîte de réception réparée',
    highlights: [
      { text: 'Inbox — détection Google corrigée : reconnue quelle que soit la méthode de connexion. Fils Gmail affichés.' },
      { text: 'Lecture des fils — détail et suggestions IA fonctionnent quelle que soit la connexion.' },
      { text: 'Conformité design — écran de connexion inbox conforme à DESIGN.md.' },
    ],
  },
  {
    version: 'v3.2.0',
    date: '22 juin 2026 à 00h22',
    title: 'Nouveau Agenda',
    highlights: [
      { text: 'Calendrier mensuel complet accessible en permanence depuis la sidebar.' },
      { text: 'Prise de rendez-vous — cliquez sur une date pour créer un RDV (titre, heure, durée, lead associé).' },
      { text: 'Notification automatique de l\'équipe à chaque nouveau RDV.' },
      { text: 'Synchronisation Google Agenda — ajout direct si Google est connecté.' },
      { text: 'Tâche Todoist automatique — création à l\'heure du rendez-vous si configuré.' },
    ],
  },
  {
    version: 'v3.1.0',
    date: '22 juin 2026 à 00h16',
    title: 'Mode Terrain amélioré',
    highlights: [
      { text: 'Compte-rendu de visite — page "Enregistrer le passage" scrollable. Bouton Confirmer toujours atteignable.' },
      { text: 'Champs Contact rencontré + Niveau d\'intérêt (Chaud / Tiède / Froid).' },
      { text: 'Photo preuve — joindre une photo de la visite comme preuve.' },
      { text: 'Notification automatique de l\'équipe à la confirmation d\'un passage.' },
    ],
  },
  {
    version: 'v3.0.0',
    date: '22 juin 2026 à 00h08',
    title: 'Base solide v3.0',
    highlights: [
      { text: 'Correctif date changelog — "Invalid Date" résolu.' },
      { text: 'Page Gérer le rôle refondue — look premium : carte membre, 3 niveaux d\'accès, aperçu des modules.' },
      { text: 'Mode Terrain — "Prochain arrêt", lien Google Maps, bouton "Prévenir l\'équipe", conformité DESIGN.md.' },
      { text: 'Website Scraper IA — extraction + description commerciale par IA, réinjectée dans scripts et emails.' },
      { text: 'Notifications équipe fonctionnelles — /api/notifications/team diffuse à tous les membres actifs.' },
      { text: 'Membres en double corrigés — déduplication par utilisateur, propriétaire n\'apparaît plus deux fois.' },
      { text: 'Chat équipe enrichi — emoji picker, images/GIF, avatars réels des membres.' },
    ],
  },
  {
    version: 'v2.99.0',
    date: '21 juin 2026 à 23h59',
    title: 'Statuts membres & Présence',
    highlights: [
      { text: 'Statuts membres — Invité (en attente), A rejoint, Accès app. Badge "En attente" ambré.' },
      { text: 'Présence en ligne — point vert + label "● En ligne" pour les membres actifs.' },
      { text: 'Toast de bienvenue — notification temps réel quand un membre rejoint le workspace.' },
    ],
  },
  {
    version: 'v2.98.0',
    date: '21 juin 2026 à 23h40',
    title: 'Carte, Automations & Notifications',
    highlights: [
      { text: 'Carte — clic lead dans la sidebar → flyTo immédiat sans double-clic.' },
      { text: 'Automation — "Nouvelle Règle" redirige vers builder 4 étapes.' },
      { text: 'Notifications desktop — rappels quotidiens (tâches en retard, pipeline vide). Electron + Web.' },
      { text: 'Mode Terrain /field/[plan]/prepare/[lead] — script IA, notes précédentes, formulaire pré-notes.' },
      { text: 'Templates email — CRUD complet, A/B test, tags, tokens variables, stats.' },
    ],
  },
  {
    version: 'v2.97.0',
    date: '21 juin 2026 à 18h00',
    title: 'Booking public & Rôles équipe',
    highlights: [
      { text: 'Page publique /book/[username] — calendrier, créneaux freebusy Google, formulaire, confirmation animée.' },
      { text: '/team/member/[id] — assigner rôle défaut ou rôle custom avec 19 toggles, prévisualisation des accès.' },
      { text: 'Fixes Supabase — migration v296 : 8 colonnes/tables manquantes. order by invited_at corrigé.' },
    ],
  },
  {
    version: 'v2.96.0',
    date: '21 juin 2026 à 12h00',
    title: 'Invitation & Rôles personnalisés',
    highlights: [
      { text: 'Page /join redesignée — animations CSS, avatar workspace, confetti, badge rôle, modules accessibles.' },
      { text: 'Quitter une équipe — bouton visible pour les non-propriétaires. Accès révoqué immédiatement.' },
      { text: 'Realtime team pages — refresh automatique à l\'invitation ou à l\'arrivée d\'un membre.' },
      { text: 'Sidebar filtrée par rôle — /api/team/my-permissions masque les entrées inaccessibles.' },
      { text: 'Rôles personnalisés — onglet "Rôles & Permissions" dans /team : CRUD complet de rôles (nom, couleur, 19 modules).' },
    ],
  },
  {
    version: 'v2.95.0',
    date: '21 juin 2026',
    title: 'Facturation & Partage lead',
    highlights: [
      { text: 'Facturation — module complet 5 onglets : Abonnement, Forfaits, Utilisation, Paiement, Factures.' },
      { text: 'Lead partage public — lien /lead-preview/[token] accessible sans compte. Page lecture seule.' },
      { text: 'Token invite sécurisé — redirect chain propre /join/[token] → login → retour /join/[token].' },
      { text: 'Plans Minerva — 4 plans : Gratuit, Pro (29$/mois), Business (79$/mois), Entreprise.' },
    ],
  },
  {
    version: 'v2.94.0',
    date: '21 juin 2026',
    title: 'Canvas & Invitations par lien',
    highlights: [
      { text: 'Canvas — boutons fonctionnels : Notes horodatées, Historique de documents, Taille de texte (S/M/L).' },
      { text: 'Canvas — Save to Library après chaque export (HTML / MD / TXT).' },
      { text: 'Services & Tarifs — 3 onglets : Catalogue, Forfaits, Devis (export HTML imprimable).' },
      { text: 'Invitations par lien — token unique à partager. Page /join/[token] pour l\'acceptation.' },
      { text: 'IA — 7 Action Pills avec prompts contextuels (vrais leads, pipeline, tâches en retard).' },
    ],
  },
  {
    version: 'v2.93.0',
    date: '21 juin 2026',
    title: 'Fiche lead enrichie & Kanban DnD',
    highlights: [
      { text: 'Fiche lead — étoiles (rating), avis, téléphone cliquable, site web, lien Google Maps directement visibles.' },
      { text: 'Pipeline Kanban drag & drop natif (HTML5). Colonne cible surlignée. Flèches ← → toujours disponibles.' },
      { text: 'Carte — clic lead → FlyTo animé (zoom 15). Auto-route OSRM dès 2+ waypoints (debounce 900ms).' },
      { text: 'Today — onglet "Boîte de réception" pour accéder à Gmail sans quitter Today.' },
    ],
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ChangelogPage() {
  useEffect(() => { document.title = 'Changelog — Minerva'; }, []);

  const [lang, setLang] = useState<Lang>('fr');

  useEffect(() => {
    const stored = localStorage.getItem('minerva_changelog_lang') as Lang | null;
    if (stored && ['fr', 'en', 'de'].includes(stored)) setLang(stored);
  }, []);

  const setLanguage = (l: Lang) => {
    setLang(l);
    localStorage.setItem('minerva_changelog_lang', l);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] text-[#26251e] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-20 pt-8 space-y-8">

        {/* ── Header ── */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-[#26251e]">Nouveautés</h1>
            <p className="text-sm text-[#7a7a76]">
              Toutes les mises à jour de Minerva OS, des plus récentes aux plus anciennes.
            </p>
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Langue</span>
            <div className="flex bg-[#e5e5e0]/60 p-0.5 rounded-lg">
              {(['fr', 'en', 'de'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer uppercase",
                    lang === l
                      ? "bg-white text-[#26251e] shadow-xs"
                      : "text-[#7a7a76] hover:text-[#26251e]"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            {lang !== 'fr' && (
              <span className="text-[10px] text-[#7a7a76] italic">
                {lang === 'en' ? 'English version coming soon' : 'Deutsche Version demnächst'}
              </span>
            )}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-[#e5e5e0] ml-[3px]" />

          <div className="space-y-10 pl-8">
            {versions.map((v) => (
              <div key={v.version} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-8 top-[3px] w-[7px] h-[7px] rounded-full bg-[#059669] border-2 border-[#fafaf8]" />

                {/* Date — no version chip */}
                <p className="text-[11px] font-bold text-[#7a7a76] mb-1 select-none">
                  {v.date}
                </p>

                {/* Entry title */}
                <h2 className="text-base font-black text-[#26251e] mb-3 leading-snug">
                  {v.title}
                </h2>

                {/* Highlights */}
                {lang !== 'fr' ? (
                  <p className="text-xs text-[#7a7a76] italic bg-[#e5e5e0]/30 rounded-lg px-3 py-2 w-fit">
                    {lang === 'en' ? '[EN coming soon]' : '[DE coming soon]'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {v.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span aria-hidden="true" className="shrink-0 w-[18px] h-[18px] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d4d4ce]" />
                        </span>
                        <span className="text-[13px] text-[#26251e] leading-relaxed">{h.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-[#7a7a76] pt-8 border-t border-[#e5e5e0]">
          Minerva OS Lite • Mis à jour en continu
        </div>
      </div>
    </div>
  );
}
