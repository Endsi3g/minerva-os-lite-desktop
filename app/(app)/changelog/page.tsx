'use client';

import React from 'react';
import { Megaphone, Calendar, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { TranslationKey } from '@/lib/translations';

interface ChangelogVersion {
  version: string;
  date: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  highlights: string[];
}

export default function ChangelogPage() {
  const { t } = useLanguage();

  const versions: ChangelogVersion[] = [
    {
      version: 'v2.77.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_77_0_title' as TranslationKey,
      descKey: 'changelog.v2_77_0_desc' as TranslationKey,
      highlights: [
        "Compétence Minerva (`SKILL.md`) : raccourcis et configuration intégrés pour interroger le CRM Minerva directement à partir d'Hermes.",
        "Client d'aide Python (`minerva_client.py`) : utilitaire sécurisé avec jeton d'authentification pour piloter les actions CRM en ligne de commande.",
        "Panneau d'administration Hermes : interface utilisateur visuelle et guides d'installation rapide ajoutés à l'onglet API des paramètres.",
        "Déploiement Cloud & VPS : configurations Docker Compose et guide pas-à-pas pour l'exécution H24 d'Hermes Gateway."
      ],
    },
    {
      version: 'v2.76.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_76_0_title' as TranslationKey,
      descKey: 'changelog.v2_76_0_desc' as TranslationKey,
      highlights: [
        "Intégration d'Hermes Agent ⚡ : couche agent autonome au-dessus des flux CRM et simulations d'actions agentiques hautes-fidélités.",
        "Résolution de l'erreur OSM : mise à jour du domaine de repli par défaut vers l'URL active et sécurisation du parsing JSON contre les retours HTML.",
        "Refonte de l'Assistant IA : transition vers l'accent vert émeraude du CRM, puces d'actions adaptatives connectées au CRM et animations fluides."
      ],
    },
    {
      version: 'v2.75.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_75_0_title' as TranslationKey,
      descKey: 'changelog.v2_75_0_desc' as TranslationKey,
      highlights: [
        "Filtrage intelligent des réponses (Inbox & Cron) : analyse automatique du sujet, de l'expéditeur et des en-têtes (ex. Auto-Submitted) pour éliminer les messages non professionnels.",
        "Exclusion des bounces et messages d'absence (Out of Office) : évite le déclenchement d'automations inappropriées ou la modification automatique des statuts de leads.",
        "Stabilité du CRM : seules les réponses réelles de prospects humains modifient le statut et notifient l'équipe."
      ],
    },
    {
      version: 'v2.74.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_74_0_title' as TranslationKey,
      descKey: 'changelog.v2_74_0_desc' as TranslationKey,
      highlights: [
        "Refonte de l'Assistant IA : interface moderne avec bulles de conversation soignées, sélecteur de modèle dynamique et support pour Hermes Agent ⚡.",
        "Éditeur de documents Canvas : panneau d'édition latéral fluide pour modifier, formater et exporter des documents générés par l'IA (Markdown, HTML, Texte).",
        "Page Conditions d'utilisation : conformité d'accès public intégrée à l'application (/terms).",
        "Icônes transparentes de la marque : icône de marque icon-192.png nettoyée sans arrière-plan."
      ],
    },
    {
      version: 'v2.73.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_73_0_title' as TranslationKey,
      descKey: 'changelog.v2_73_0_desc' as TranslationKey,
      highlights: [
        "Option d'authentification Google : bouton de connexion rapide lié à Supabase Auth.",
        "Téléchargement d'image & Partage réseaux sociaux : export des graphiques du Mode Esthétique en PNG/JPEG via html-to-image et intégration Web Share.",
        "Bannière globale de mise à jour : notification esthétique informant l'utilisateur des nouveautés.",
        "Gestion unverified app warning : aides et guides pour la synchronisation Gmail."
      ],
    },
    {
      version: 'v2.72.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_72_0_title' as TranslationKey,
      descKey: 'changelog.v2_72_0_desc' as TranslationKey,
      highlights: [
        "Bypass Supabase Google OAuth : route d'API personnalisée stockant les jetons localement dans les paramètres de base de données.",
        "Redirection dynamique : prise en charge du paramètre state pour renvoyer l'utilisateur vers son point d'origine.",
        "Nouveau favicon vert de marque.",
        "Mode Esthétique (LARP) : cockpit Today personnalisable avec thèmes de style (Crème, Émeraude, Charbon) et ratios de capture (1:1, 16:9, 9:16)."
      ],
    },
    {
      version: 'v2.71.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_71_0_title' as TranslationKey,
      descKey: 'changelog.v2_71_0_desc' as TranslationKey,
      highlights: [
        "Leaderboard gamifié : classement de performance avec divisions de ligue (Bronze, Argent, Or, Platine).",
        "OTP anti-bot d'invitations : page d'acceptation sécurisée.",
        "Partage public bibliothèque : accès public en lecture seule aux documents et répertoires.",
        "Outils bulk-actions dans la bibliothèque.",
        "Graphique d'activité hebdomadaire Recharts sur l'accueil."
      ],
    },
    {
      version: 'v2.70.0',
      date: '2026-06-18',
      titleKey: 'changelog.v2_70_0_title' as TranslationKey,
      descKey: 'changelog.v2_70_0_desc' as TranslationKey,
      highlights: [
        "Mode Terrain sans Modales : Remplacement complet du modal d'outcome par des pages dédiées (/field/[planId]/outcome/[leadId]).",
        "RDV pris (meeting_booked) : Passage automatique du statut à 'Won' (Deal) + création d'une tâche 'Appel de closing' pour le lendemain.",
        "Absent (absent) : Création automatique d'une séquence de relance e-mail 'Passé vous voir' (e-mail J+0 + appel J+3) si e-mail disponible, plus tâche de rappel à J+2.",
        "Synchronisation bidirectionnelle : Mise à jour de sync.cjs pour synchroniser les tournées (route_plans) et les fiches de visite (field_visits) entre SQLite et Supabase.",
        "Endpoint de passage en ligne : Ajout de la route API /api/route-plans/visits gérant les passages terrain et leurs automations associées."
      ],
    },
    {
      version: 'v2.64.0',
      date: '2026-06-18',
      titleKey: 'changelog.v2_59_0_title' as TranslationKey,
      descKey: 'changelog.v2_57_0_desc' as TranslationKey,
      highlights: [
        "/playbooks : 10 templates de prospection complets (persona ICP, preset de scraping, séquence email, script d'appel, modèle de proposition). Déployer un playbook crée une vraie campagne dans le CRM.",
        '/integrations/forms : Webhooks inbound Typeform, Tally, Webflow, Framer — chaque soumission crée automatiquement un lead taggé source=inbound_form avec URL webhook unique.',
        '/client-reports/[id] : Portail client avec KPIs réels par workspace (leads, RDV, deals gagnés, MRR/ARR estimé, taux de conversion) — basé sur les données Supabase.',
        '/webhooks : Webhooks sortants avec 5 types d\'événements, bouton Tester, gestion active/inactif. Tables inbound_webhooks et outbound_webhooks ajoutées en base.',
        'Sidebar : Playbooks et Rapports clients dans CRM & Prospection, Webhooks dans Plateforme.',
      ],
    },
    {
      version: 'v2.63.0',
      date: '2026-06-18',
      titleKey: 'changelog.v2_59_0_title' as TranslationKey,
      descKey: 'changelog.v2_57_0_desc' as TranslationKey,
      highlights: [
        'Firecrawl + PagesJaunes/YellowPages.ca : extraction IA structurée des fiches d\'entreprises (500 req/mois gratuits sur firecrawl.dev, clé configurable dans Paramètres → Intégrations).',
        '411.ca : scraping direct HTML sans clé — best-effort, données variables selon disponibilité du rendu HTML.',
        'Boîte de réception déplacée au-dessus de Campagnes dans la sidebar (priorité inbox-first).',
        'Schéma Supabase + SQLite : colonne firecrawl_api_key ajoutée à la table settings.',
        '@mendable/firecrawl-js 4.28.0 installé et câblé au scraper multi-sources.',
      ],
    },
    {
      version: 'v2.62.0',
      date: '2026-06-18',
      titleKey: 'changelog.v2_59_0_title' as TranslationKey,
      descKey: 'changelog.v2_57_0_desc' as TranslationKey,
      highlights: [
        'Yelp Fusion API : nouvelle source de prospection — 500 req/jour gratuites, clé configurable dans Paramètres → Intégrations → Yelp Fusion API.',
        'HERE Places API : source la plus complète — 250 000 req/mois gratuites, fonctionne pour TOUS les types de business (services, commerces, artisans).',
        'Les deux sources retournent des données réelles : nom, adresse, téléphone, note, coordonnées GPS.',
        'Sources Yelp et HERE s\'activent automatiquement dans Prospection dès que la clé est configurée.',
        'Interface prospection : badge "Clé configurée" ou "Clé manquante → Paramètres" selon l\'état de configuration.',
      ],
    },
    {
      version: 'v2.61.0',
      date: '2026-06-18',
      titleKey: 'changelog.v2_59_0_title' as TranslationKey,
      descKey: 'changelog.v2_57_0_desc' as TranslationKey,
      highlights: [
        'DuckDuckGo cassé — DDG retournait une page bot-challenge côté serveur (0 résultats depuis des semaines). Code supprimé.',
        'Métiers de service (plombier, électricien, peintre…) : ajout d\'une recherche par nom de métier dans Overpass pour compléter les tags OSM absents.',
        'Miroirs Overpass en parallèle (Promise.any) — 3x plus rapide, élimine les timeouts séquentiels de 90s.',
        'maxDuration Vercel : scrape-maps=60s, scrape-apify=90s — résout les coupures à 10s sur plan Hobby.',
        'Banner ambre quand OSM retourne 0 résultats avec lien direct vers la config des clés API.',
      ],
    },
    {
      version: 'v2.60.0',
      date: '2026-06-18',
      titleKey: 'changelog.v2_59_0_title' as TranslationKey,
      descKey: 'changelog.v2_57_0_desc' as TranslationKey,
      highlights: [
        'Page /map : carte invisible résolue — coordonnées center inversées corrigées ([lat,lng] → [lng,lat] conforme MapLibre).',
        'ResizeObserver ajouté au composant Map — map.resize() automatique quand la CSS height arrive après l\'init du canvas.',
        'Déploiement Vercel : ERR_PNPM_OUTDATED_LOCKFILE résolu — pnpm-lock.yaml commité.',
        'Apify : réponses HTML (page d\'erreur auth) détectées avant JSON.parse — message d\'erreur actionnable affiché.',
      ],
    },
    {
      version: 'v2.59.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_59_0_title',
      descKey: 'changelog.v2_59_0_desc',
      highlights: [
        'Leads table : overflow-x-auto — défilement horizontal sur mobile au lieu de colonnes tronquées.',
        'Agents workspace : le panneau de paramètres passe de fixe w-96 à pleine largeur sur mobile, empilé verticalement (max-h-[40vh]).',
        'Inbox : navigation mobile complète — liste seule → sélection → panneau de détail seul, avec bouton retour ← dans l\'en-tête.',
        'InboxList : largeur fixe w-[340px] remplacée par w-full sur mobile, md:w-[340px] sur tablette+.',
        'Settings : nav latérale `hidden md:block` remplacée par un `<select>` avec groupes d\'options sur mobile — toutes les sections accessibles.',
        'Settings root : flex-col sur mobile, flex-row sur md+ pour s\'adapter à la nav dropdown.',
      ],
    },
    {
      version: 'v2.58.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_58_0_title',
      descKey: 'changelog.v2_58_0_desc',
      highlights: [
        'Agents IA GMB Audit et Radar Réputation : remplacent Math.random() par de vraies réponses Anthropic/Groq/Together/OpenRouter.',
        'Nouvelle route API /api/agents/run : exécute les agents built-in et personnalisés via le provider IA configuré dans les Paramètres.',
        'Le score GMB est désormais extrait directement du rapport AI (regex sur **Score GMB :** N/100).',
        'Agents personnalisés utilisés maintenant le champ instructions comme system prompt pour appels IA réels.',
        'Log d\'exécution en temps réel pendant l\'appel IA (steps animés en parallèle).',
        'Fallback gracieux : message d\'erreur dans le résultat si le provider IA est inaccessible.',
      ],
    },
    {
      version: 'v2.57.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_57_0_title',
      descKey: 'changelog.v2_57_0_desc',
      highlights: [
        'OSM/Overpass tourne TOUJOURS en parallèle, même quand Apify est sélectionné — garantit des leads même en cas d\'échec Apify.',
        'Logique Apify-interne supprimée de scrape-maps : la source "Google Maps / OSM" est désormais exclusivement Overpass, sans confusion.',
        'Gestion d\'erreur par source (per-fetch .catch()) : un échec Apify n\'empêche plus d\'obtenir les résultats OSM.',
        'Bannière informative si Apify échoue : raison + lien "Vérifier la clé →".',
        'Page Personas conforme DESIGN.md : bg-background, bg-card border-border, aucune shadow sur cards, hovers #e5e5e2, CTA vert CRM.',
        'Correction build Vercel : types API (SeoAuditResult, InboxThread, ThreadMessage) extraits vers lib/ pour respecter la server boundary Next.js.',
      ],
    },
    {
      version: 'v2.54.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_54_0_title',
      descKey: 'changelog.v2_54_0_desc',
      highlights: [
        'Nouvelle page /personas : création et gestion des profils cibles (ICP — Ideal Customer Profile).',
        'Chaque profil définit des niches cibles, des villes cibles et des critères de scoring personnalisés (6 sliders 0–40 pts).',
        'Critères configurables : aucun site web, note < 3.5★, < 10 avis, température Chaud, niche correspondante, ville correspondante.',
        'Carte de profil : comptage des leads correspondants en temps réel + score moyen de compatibilité.',
        'Hook usePersonas() : localStorage pour Electron, Supabase pour web — aucune donnée perdue.',
        'scoreLeadByPersona() exporté depuis lib/lead-scoring.ts pour usage dans leads/pipeline.',
        'Sidebar CRM : nouvelle entrée "Profils cibles (ICP)" avec icône Target.',
      ],
    },
    {
      version: 'v2.51.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_51_0_title',
      descKey: 'changelog.v2_51_0_desc',
      highlights: [
        'Barre KPI revenue en haut du Pipeline : pipeline brut $, forecast pondéré (montant × probabilité %), deals gagnés et compteur de deals actifs.',
        'Barre de progression empilée par statut : Contacté (bleu), RDV fixé (ambre), Gagné (vert) — proportions visuelles du pipeline.',
        'La barre revenue est masquée automatiquement si aucun lead n\'a de deal renseigné.',
        'Compatibilité complète avec les filtres niche/propriétaire existants (barre calculée sur les leads filtrés).',
      ],
    },
    {
      version: 'v2.56.1',
      date: '2026-06-17',
      titleKey: 'changelog.v2_56_1_title',
      descKey: 'changelog.v2_56_1_desc',
      highlights: [
        'Suppression définitive de generateRealisticLeads() — le scraper ne retourne plus jamais de leads fictifs en fallback.',
        'Les résultats OSM et DDG/annuaires ont rating=0 et reviewsCount=0 quand la donnée n\'est pas disponible, au lieu de valeurs aléatoires inventées.',
        'Le filtre "Note minimum" ignore désormais les leads sans note (rating=0) au lieu de les exclure à tort.',
        'Audit SEO corrigé : "Note non disponible" au lieu de "Note 0/5 très faible" pour les résultats OSM.',
        'Réponse API enrichie quand 0 résultat : message explicatif sans jamais générer de faux leads.',
      ],
    },
    {
      version: 'v2.56.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_56_0_title',
      descKey: 'changelog.v2_56_0_desc',
      highlights: [
        'Nouvelle page /setup : checklist interactive de 6 étapes basée sur l\'état réel de l\'app (aucune donnée fictive).',
        'Détection automatique : profil, Gmail, premier lead, séquence email, objectifs mensuels, membre équipe.',
        'Barre de progression et état "Tout est prêt" avec lien vers /today quand les étapes obligatoires sont complètes.',
        'Mini-bannière sur /today : progression compacte + bouton "Continuer" vers /setup, dismissible via localStorage.',
        'Sidebar : nouvelle entrée "Configuration" dans la section Plateforme (icône ListChecks).',
      ],
    },
    {
      version: 'v2.55.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_55_0_title',
      descKey: 'changelog.v2_55_0_desc',
      highlights: [
        'Barre d\'actions rapides par thread : changez le statut du lead (Contacté, RDV Booké, Gagné, Perdu) sans quitter l\'inbox.',
        'Dialog "Créer un deal" : montant estimé, probabilité (%) et date de clôture — sauvegardés directement sur la fiche lead.',
        'Dialog "Ajouter une tâche de follow-up" : titre pré-rempli avec le nom du lead, date d\'échéance configurable.',
        'Filtre par campagne dans la liste : chips horizontaux affichant uniquement les campagnes ayant des threads liés.',
        'InboxThread enrichi avec leadStatus et campaignId (requête leads enrichie côté API).',
        'addTask accepte désormais un dueDate optionnel (défaut : aujourd\'hui).',
      ],
    },
    {
      version: 'v2.53.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_53_0_title',
      descKey: 'changelog.v2_53_0_desc',
      highlights: [
        'Bannière d\'objectifs mensuels pleine largeur : barres de progression compactes pour chaque quota configuré.',
        'Carte "Emails planifiés" : étapes de séquences prévues aujourd\'hui avec canal, nom du lead et heure d\'envoi.',
        'Flux d\'activité récente : fusionnel d\'activities Supabase + notifications réply_detected/lead_assigned des dernières 24h.',
        'Nouveau layout cockpit 2 colonnes : actions du jour (gauche) + contexte & stats (droite).',
        'Extraction de computeProgress / METRIC_LABELS / PERIOD_LABELS dans lib/goal-utils.ts (partagé entre Today et Settings).',
      ],
    },
    {
      version: 'v2.50.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_50_0_title',
      descKey: 'changelog.v2_50_0_desc',
      highlights: [
        'Nouvelle page /inbox : liste des threads Gmail liés aux leads avec snippet, compteur de messages et point vert (non lu).',
        'Onglets de filtrage client-side : Tous / Réponses positives / À relancer / Négatifs (reply_status).',
        'Panel de détail : corps des messages décodés en base64url, bulles de conversation côté envoyeur/reçu.',
        'Suggestions IA de réponse via Claude Haiku (3 options) + 3 presets de réponse rapide.',
        'reply_status : nouvelle colonne sur leads, dual-store SQLite + Supabase, mise à jour via updateLead.',
        'Banner de ré-authentification Gmail si le scope gmail.readonly est manquant (utilisateurs existants).',
      ],
    },
    {
      version: 'v2.44.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_44_0_title',
      descKey: 'changelog.v2_44_0_desc',
      highlights: [
        'Quota d\'envoi quotidien configurable dans Paramètres > Prospection (défaut : 50 e-mails/jour).',
        'Le cron de séquences vérifie le quota par utilisateur avant chaque envoi — les étapes excédentaires sont reportées.',
        'Presets rapides : 20 / 50 / 100 / 200 e-mails par jour.',
        'Les étapes de canal non-Email (Appel, LinkedIn, SMS) sont automatiquement ignorées par le cron d\'envoi.',
      ],
    },
    {
      version: 'v2.43.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_43_0_title',
      descKey: 'changelog.v2_43_0_desc',
      highlights: [
        'Séquences multi-canal : chaque étape peut être un Email, un Appel téléphonique, un message LinkedIn DM ou un SMS.',
        'Sélecteur de canal par étape dans le modal de création — badge coloré distinct par canal.',
        'Pour les étapes non-Email (Appel, LinkedIn, SMS) : champ de corps adapté + rappel automatique de tâche manuelle à J+délai.',
        'Affichage du canal dans la liste des étapes d\'une séquence existante (badge + libellé spécifique).',
      ],
    },
    {
      version: 'v2.42.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_42_0_title',
      descKey: 'changelog.v2_42_0_desc',
      highlights: [
        'Personnalisation des e-mails : section "Variables" dépliable dans le compositeur IA.',
        '4 presets rapides : {{probleme_principal}}, {{concurrent_exemple}}, {{offre_principale}}, {{objectif_client}}.',
        'Variables injectées automatiquement dans le prompt IA lors de la génération du brouillon.',
        'Substitution client-side des variables dans les instructions avant envoi à l\'API.',
      ],
    },
    {
      version: 'v2.41.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_41_0_title',
      descKey: 'changelog.v2_41_0_desc',
      highlights: [
        'Badge de sync en temps réel dans la topbar (Electron uniquement).',
        'Indique le nombre de modifications en attente de synchronisation avec le cloud.',
        'Icône de rechargement animée (spinner), tooltip explicatif, couleur ambre pour attirer l\'attention.',
        'Polling SQLite toutes les 5 secondes — disparaît automatiquement quand tout est synchronisé.',
      ],
    },
    {
      version: 'v2.40.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_40_0_title',
      descKey: 'changelog.v2_40_0_desc',
      highlights: [
        'Historique des scrapes : chaque scrape est enregistré en local (localStorage) avec niches, villes, sources et résultats.',
        'Section "Historique" dépliable en bas de la page Prospection.',
        'Statuts visuels : en cours (orange), terminé (vert) ou échoué (rouge).',
        'Bouton "Effacer l\'historique" pour réinitialiser.',
      ],
    },
    {
      version: 'v2.39.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_39_0_title',
      descKey: 'changelog.v2_39_0_desc',
      highlights: [
        'Objectifs & Quotas : nouvelle section dans Paramètres → Outils → Objectifs.',
        '4 métriques disponibles : leads créés, contactés, gagnés, e-mails envoyés.',
        'Périodicité semaine ou mois. Barre de progression avec indicateur "Objectif atteint".',
        'Données dual-store (SQLite Electron + Supabase web).',
      ],
    },
    {
      version: 'v2.38.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_38_0_title',
      descKey: 'changelog.v2_38_0_desc',
      highlights: [
        'Analytics avancés : 4 nouvelles sections de breakdown (par niche, ville, propriétaire, campagne).',
        'Chaque breakdown affiche : total leads, leads contactés, gagnés et taux de conversion.',
        'Graphiques à barres horizontales avec deux niveaux (activité totale + taux de conversion en vert).',
        'Top 8 entrées par catégorie, triées par volume décroissant.',
      ],
    },
    {
      version: 'v2.37.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_37_0_title',
      descKey: 'changelog.v2_37_0_desc',
      highlights: [
        'Tracking Gmail : l\'envoi via Gmail API sauvegarde maintenant le threadId sur le lead.',
        'Cron quotidien (10h) : détecte automatiquement les réponses à vos e-mails de prospection.',
        'Détection de réponse : si le prospect répond, le statut passe à "Meeting Booked" + notification créée.',
        'Notification en temps réel : "Réponse détectée — [Prospect] a répondu à votre e-mail."',
      ],
    },
    {
      version: 'v2.36.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_36_0_title',
      descKey: 'changelog.v2_36_0_desc',
      highlights: [
        'Pipeline Kanban : champ deal (montant + probabilité %) affiché sur chaque carte si renseigné.',
        'Colonne Kanban : total pipeline deal en bas de colonne si au moins un deal.',
        'Fiche lead — section "Deal" : montant, probabilité %, date de closing éditable inline.',
        'Fiche lead — sélecteur "Campagne" : assigne un lead à une campagne directement depuis la fiche.',
      ],
    },
    {
      version: 'v2.35.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_35_0_title',
      descKey: 'changelog.v2_35_0_desc',
      highlights: [
        'Nouvelle page /campaigns : liste des campagnes avec KPIs (total, contactés, gagnés), statut (active/pause/terminée/brouillon).',
        'Page /campaigns/[id] : onglets Vue d\'ensemble, Leads, Analytics — pipeline par statut + taux de conversion.',
        'Nouvelle page /activities : timeline chronologique de toutes les interactions (emails, notes, appels, tâches, leads créés).',
        'Sidebar : nouvelle section "CRM & Prospection" regroupant Campagnes, Pipeline, Activités.',
        'ReachContext : Campaign interface + addCampaign/updateCampaign/deleteCampaign dual-store (SQLite + Supabase).',
      ],
    },
    {
      version: 'v2.34.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_34_0_title',
      descKey: 'changelog.v2_34_0_desc',
      highlights: [
        'Panneau "Qualification" sur chaque fiche lead : Fit score (maturité digitale) + Intent score (signal d\'intérêt), barre de progression colorée.',
        'Checkboxes BANT (Budget / Authority / Need / Timing) sauvegardées en temps réel.',
        'Champ "Décideur" (nom + rôle) avec suggestion IA via Claude Haiku.',
        'Emails suggérés heuristiques (info@, contact@, prénom.nom@) cliquables pour définir l\'email principal.',
        'API /api/enrich-contact + extension schéma DB (campagnes, activités, goals, scrape_jobs anticipés).',
      ],
    },
    {
      version: 'v2.33.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_33_0_title',
      descKey: 'changelog.v2_33_0_desc',
      highlights: [
        'Page Aide — formulaire de contact support : useReach().user remplace auth.getUser() (une requête Supabase en moins).',
        'Sélecteur de catégorie (Bug / Fonctionnalité / Facturation / Compte / Autre) préfixé dans le sujet de l\'email.',
        'Phase 13 complète : support entièrement câblé sans appel auth direct.',
      ],
    },
    {
      version: 'v2.32.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_32_0_title',
      descKey: 'changelog.v2_32_0_desc',
      highlights: [
        'Assistant IA : persistance localStorage des messages (rechargement de page conserve l\'historique).',
        'Bouton "Effacer" (Trash2) affiché dans le header quand une conversation est en cours.',
        'Quick prompts contextuels en français (relance, pipeline, email, analyse hebdo).',
        'TreeMascot : états idle/thinking/writing/searching pilotés par le streaming IA.',
      ],
    },
    {
      version: 'v2.31.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_31_0_title',
      descKey: 'changelog.v2_31_0_desc',
      highlights: [
        'Analytics : 2 nouveaux KPIs réels — "Leads CRM" (total) et "Clients gagnés" (statut Won). 6 KPI cards au total.',
        'Graphique "Pipeline par statut" : barres horizontales colorées par statut (New/Contacted/RDV/Gagné/Perdu) + taux de conversion en bas.',
        'Graphique d\'activité renommé (Leads créés + Tâches complétées au lieu de "Chat/Agent Messages"). Labels précis dans les tooltips.',
        'Import Lead: `Lead` importé depuis mock-data dans analytics-dashboard pour le typage des statuts.',
      ],
    },
    {
      version: 'v2.30.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_30_0_title',
      descKey: 'changelog.v2_30_0_desc',
      highlights: [
        'Table `agent_reviews` ajoutée à SQLite (Electron) — les avis persistent localement et sont écrits dans Supabase en mode web.',
        'agent-detail-root : utilise `useReach().user` au lieu de `auth.getUser()` ; bouton "Publier" avec état de chargement.',
        'creator-profile-root : utilise `useReach().user` au lieu de `auth.getUser()`.',
        'Avis écrits dans Supabase `agent_reviews` (web) ou SQLite `agent_reviews` (Electron) avec fallback localStorage.',
      ],
    },
    {
      version: 'v2.29.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_29_0_title',
      descKey: 'changelog.v2_29_0_desc',
      highlights: [
        'Optimisation Supabase : 7 requêtes séquentielles → Promise.all (1 batch parallèle), 6 appels IPC Electron → Promise.all. Temps de chargement divisé par ~4.',
        'Exposition de `user` dans ReachContext : les composants ne font plus de `auth.getUser()` individuellement — TodayTasksCard, TodayStatsCard, Integrations, Layout utilisent `useReach().user`.',
        'Aujourd\'hui — bouton "Relance rapide" dans le tableau des prospects : génère un brouillon via /api/generate-draft et l\'affiche dans un Sheet éditable avec copie en un clic.',
        'Fix filtre follow-up : les leads sans `nextActionDate` ne remontaient plus dans le tableau des relances (bug chaîne vide <= date).',
      ],
    },
    {
      version: 'v2.28.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_28_0_title',
      descKey: 'changelog.v2_28_0_desc',
      highlights: [
        'Icônes SVG dédiées : TodoistIcon (rouge #DB4035), ApifyIcon (bleu hexagone), NotionIcon (monochrome), SlackIcon (#E01E5A).',
        'Nouvelles intégrations disponibles : Apify scraper Google Places, Notion (bases de données), Slack (notifications canaux).',
        'Panel de détail : étapes "Comment utiliser" spécifiques par intégration (token, config, usage) au lieu de 3 étapes génériques.',
        'Import manifeste JSON : validation authType (whitelist none/key/oauth/bearer/basic) et endpoints (doit être un tableau).',
      ],
    },
    {
      version: 'v2.27.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_27_0_title',
      descKey: 'changelog.v2_27_0_desc',
      highlights: [
        'Scraping multi-source combiné : OSM/Overpass, Yelp, PagesJaunes, 411.ca et Apify tournent en parallèle et leurs résultats sont fusionnés + dédupliqués.',
        'Multi-niche & Multi-ville : sélectionnez plusieurs niches et plusieurs villes — une requête Overpass par niche×ville (Promise.allSettled).',
        '65+ villes du Québec dans la base de coordonnées OSM, 40+ filtres OSM mappés (tatoueur, ostéo, couvreur, notaire, architecte, hôtel, bijouterie, école, etc.).',
        'Rayon configurable 2–50 km, limite 500 résultats, nouvelle source 411.ca, dédup renforcée nom+ville+téléphone.',
        'UI : tri par opportunité/note/avis, export CSV UTF-8 BOM, badge source par ligne, analyse par source/ville, carte MapLibre avec popup.',
      ],
    },
    {
      version: 'v2.26.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_26_0_title',
      descKey: 'changelog.v2_26_0_desc',
      highlights: [
        'Séquences email : page /sequences avec création/gestion de séquences multi-étapes, table email_sequences + email_sequence_steps Supabase.',
        'Cron Vercel : déclenchement quotidien 09h00 des étapes de séquences via /api/cron/email-sequences avec rafraîchissement automatique du token Gmail.',
        'Aujourd\'hui : bouton "Reporter à demain" fonctionnel (updateTask dual-store), "Marquer urgent" préfixe [URGENT], statistiques séquences réelles (envoyés/en attente).',
        'Navigation : entrée "Séquences email" câblée dans la sidebar (icône Mail), traductions FR/EN/DE.',
        'Fix : export map-root — default export ajouté, erreur TypeScript Supabase corrigée dans le cron.',
      ],
    },
    {
      version: 'v2.25.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_25_0_title',
      descKey: 'changelog.v2_25_0_desc',
      highlights: [
        'i18n — Page Welcome : tous les textes (titre, promo code, onglets workspace/chat, pourcentage, labels) passent par t() en FR/EN/DE.',
        'i18n — Page Aujourd\'hui : en-têtes du tableau de relances (Prospect/Canal/Dernier Contact/Action Suivante/Actions) et message vide traduits.',
        'i18n — Sidebar : placeholder "Recherche globale..." et label nav "Leads" harmonisés dans les 3 langues (EN était "Search").',
        'Bibliothèque : assignation réelle des fichiers aux dossiers — hover sur une carte → bouton ⋮ → "Déplacer vers un dossier". Clic sur ligne dossier → filtre les docs affichés avec badge ×.',
        'Bibliothèque : compteur réel de fichiers par dossier + badge folder_name sur les miniatures de prévisualisation. SQL requis : ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_name text;',
      ],
    },
    {
      version: 'v2.24.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_24_0_title',
      descKey: 'changelog.v2_24_0_desc',
      highlights: [
        'Onboarding : panneau noir animé supprimé, formulaire full-screen centré sur fond blanc avec switcher de langue FR/EN en haut à droite.',
        'Avatar sync : sauvegarder une photo de profil dans Paramètres met à jour immédiatement l\'icône topbar sans reload (localStorage + StorageEvent).',
        'Leads — Proposition PDF : bouton "Générer une proposition PDF" dans le détail d\'un lead. Génère une proposition commerciale complète avec services, TVA 15 % (Québec), validité 30 jours.',
        'Audit SEO — Export PDF : bouton "Exporter en PDF" sur la page /audit. Rapport brandé Minerva OS avec score coloré et recommandations.',
        'Vercel Analytics (<Analytics />) et SpeedInsights (<SpeedInsights />) activés dans le root layout. Google OAuth configuré côté Vercel et .env.local.',
      ],
    },
    {
      version: 'v2.23.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_23_0_title',
      descKey: 'changelog.v2_23_0_desc',
      highlights: [
        'Audit SEO technique réel : nouvelle page /audit avec analyse complète du site web d\'un lead (HTTPS, balise viewport, title + description + longueurs, temps de chargement, Google Analytics, Facebook Pixel). Score 0-100 coloré par niveau.',
        'Mode batch : "Auditer mon portefeuille" lance automatiquement l\'audit pour tous les leads ayant un site web, avec tableau de résultats et concurrence limitée à 3 requêtes simultanées.',
        'Carte interactive des leads /map : tous les leads du CRM sont visualisés sur une carte du Québec, avec marqueurs colorés par température (rouge/orange/bleu/gris sans-site), filtres sidebar, recherche et popup de détail.',
        'Score d\'opportunité : colonne "Opportunité" dans le tableau des leads et indicateur dans le panneau de détail. Algorithme pur basé sur l\'absence de site (+30), la note (<3.5 → +20), le nombre d\'avis (<10 → +15) et la température Hot (+5).',
        'Intelligence — synthèses IA réelles : le panneau de synthèse est maintenant câblé sur /api/chat en streaming réel (SSE). Plus de templates statiques — l\'IA génère une analyse stratégique à partir de ton portefeuille réel.',
      ],
    },
    {
      version: 'v2.22.2',
      date: '2026-06-17',
      titleKey: 'changelog.v2_22_2_title',
      descKey: 'changelog.v2_22_2_desc',
      highlights: [
        'Chat IA : OpenRouter est désormais utilisé automatiquement dès que la clé est configurée dans Paramètres — plus besoin que le flag ai_provider soit explicitement positionné sur "openrouter".',
        'Prospection : la source Apify s\'active correctement quand la clé apify_api_... est sauvegardée dans Paramètres > Intégrations (corrige une mauvaise lecture de colonne : apify_api_key → apify_token).',
      ],
    },
    {
      version: 'v2.22.1',
      date: '2026-06-17',
      titleKey: 'changelog.v2_22_1_title',
      descKey: 'changelog.v2_22_1_desc',
      highlights: [
        'Fix canal de présence Supabase Realtime sur la page de détail d\'un lead — erreur "cannot add presence callbacks after subscribe()" corrigée via un suffixe aléatoire par mount (React Strict Mode).',
        'Import CSV remplacé par un vrai glisser-déposer : zone de dépôt, prévisualisation tabulaire des lignes détectées, import en lot avec barre de progression.',
        'Page Nouveau lead : upload de logo de l\'entreprise (base64), champ téléphone, sélecteurs natifs stylisés (température, statut, membre assigné) cohérents avec le design system.',
      ],
    },
    {
      version: 'v2.22.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_22_0_title',
      descKey: 'changelog.v2_22_0_desc',
      highlights: [
        'Agents: cliquer sur GPT-4o affiche une modal "Clé API requise" expliquant qu\'une clé OpenRouter est nécessaire, avec bouton "Configurer la clé" → Paramètres et "Sélectionner quand même".',
        'Bibliothèque: insertion d\'images dans l\'éditeur TipTap — bouton dans la toolbar, upload depuis le disque, stocké en base64 dans le document.',
        'Services: bannière d\'erreur visible lorsque l\'insert/update échoue (ex. table manquante) avec message explicatif et référence à DEPLOYMENT.md.',
        'Invitations équipe: quand l\'utilisateur a déjà un compte Supabase, on retrouve son user_id via l\'API admin et le membre est créé avec status "active" immédiatement.',
        'API team/members: corrigé l\'ordre par "created_at" (était "invited_at" qui n\'existe pas, causant des erreurs silencieuses).',
        'DEPLOYMENT.md: ajout du SQL de création de la table "services" dans le script de setup Supabase.',
      ],
    },
    {
      version: 'v2.21.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_21_0_title',
      descKey: 'changelog.v2_21_0_desc',
      highlights: [
        'Critical fix: removed non-existent image_url column from Supabase leads insert — adding leads no longer crashes.',
        'Get Started: all 8 onboarding tasks translated to French with direct navigation to the relevant page on click.',
        'Welcome page: progress bar now updates in real time using useRef + useEffect instead of a callback ref that only fired on mount.',
        'Sidebar Today section: replaced hardcoded mock files with real leads from ReachContext; shows nothing if no leads exist.',
        'Team chat: profile avatars now displayed in message bubbles; @mention autocomplete with member list filter.',
        'Analytics: GitHub-style activity heatmap (8starlabs component) tracking days with at least one lead created or task completed over the last 12 months.',
        'Library editor: "Partager" button opens a share modal with a copyable link; automatically sets is_shared=true on the document.',
        'DESIGN.md: full design system documentation (colors, typography, spacing, component patterns, animation, i18n rules).',
        'DEPLOYMENT.md: step-by-step deployment guide for a 100% free production stack (Supabase + Vercel + Cloudflare).',
        'README: full rewrite reflecting v2.21.0 feature set, architecture, security model, and roadmap.',
      ],
    },
    {
      version: 'v2.20.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_20_0_title',
      descKey: 'changelog.v2_20_0_desc',
      highlights: [
        'Agent creation flow: "Add input field" now opens a full Langdock-style modal with 8 field types (Text, Multi-line, Number, Select, Email, Checkbox, Date, File), optional description, and required toggle.',
        'Field type badges are color-coded per type (gray/blue/orange/purple/emerald/teal/yellow/red) in the agent creation UI.',
        'Live preview panel updated for all 8 field types including checkbox, date picker (jj/mm/aaaa), select dropdown, and file attach button.',
        'Settings: grouped navigation (Compte / Espace de travail / Gestion des utilisateurs / Outils) matching Langdock architecture.',
        'New settings sections: Instructions personnalisées, Sécurité (active sessions), Vue d\'ensemble workspace, Général workspace (icon upload, danger zone), Facturation (3-plan comparison).',
        'New settings sections: Modèles IA (default chat + image model, providers list), Personnalisations (brand color, bg image, workspace logo toggle, chat disclaimer, info boxes).',
        'New settings sections: API workspace (cost/budget, monthly limit, workspace ID, API key management), Membres (invite + manage members table), Groupes (create/search/delete groups), Rôles (permission matrix for Member/Editor/Admin).',
      ],
    },
    {
      version: 'v2.17.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_17_0_title',
      descKey: 'changelog.v2_17_0_desc',
      highlights: [
        'Chat page: dot pattern background, always-visible input bar at the bottom, backdrop-blur header/footer.',
        'Settings: prominent "Sauvegarder" button in the Profile section header.',
        'Settings: new dedicated API Keys section to manage OpenRouter, Groq, and Together AI keys with masked display and one-click delete.',
        'Agent detail page: custom banner image upload (stored locally) and inline description editing via hover pencil icon.',
        'Library: 4 entrepreneur templates (Business plan, GMB Audit, Prospecting email, Weekly report) in the create grid.',
        'Library document cards now show a content text preview instead of a plain icon.',
        'Library editor: PDF export button (browser print dialog) added alongside the existing Markdown export.'
      ]
    },
    {
      version: 'v2.16.0',
      date: '2026-06-17',
      titleKey: 'changelog.v2_16_0_title',
      descKey: 'changelog.v2_16_0_desc',
      highlights: [
        'Welcome page moved into the (app) layout — inherits the real sidebar and topbar; 10% promo incentive (MINERVA10) unlocked on 100% task completion.',
        'Today page simplified: 6 essential cards (Agenda, Tasks, Follow-ups, Focus, Projects, Stats) with Cult UI dot pattern background.',
        'Sidebar restructured: 5 permanently pinned items + 3 collapsible categories (Intelligence IA, Données & Fichiers, Plateforme).',
        'Prospecting — 25 Montreal niches with multi-select picker and search; result limiter slider (5–100); no-website filter.',
        '4 scraping sources with live availability indicators: Google Maps/OSM, Yelp, PagesJaunes, Apify (requires API key).',
        'Map markers enriched: color-coded by status (red = no website, orange = low rating, green = ok), popup shows address + phone.',
        'Fixed Supabase presence error on lead detail page by calling removeChannel() in the useEffect cleanup.'
      ]
    },
    {
      version: 'v2.15.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_15_0_title',
      descKey: 'changelog.v2_15_0_desc',
      highlights: [
        'New /assistant page: full AI assistant chat with stats dashboard (active leads, pending tasks, projects, weekly leads).',
        'Animated TreeMascot SVG component — idle / thinking / writing / searching states — integrated in /chat and /assistant.',
        'Analytics dashboard now aggregates real lead and task data instead of seeded random mock values.',
        'Contact support form at /help with a dedicated /api/support/contact SMTP route (nodemailer, graceful no-SMTP fallback).'
      ]
    },
    {
      version: 'v2.14.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_14_0_title',
      descKey: 'changelog.v2_14_0_desc',
      highlights: [
        'Integrations detail panel: intermediate view with description and "How to use" steps before opening the full editor.',
        'JSON manifest import for custom integrations — validates name, description, authType, endpoints.',
        'Agent store detail pages (/agents/[id]) with star ratings, written reviews, and creator info.',
        'Creator profile pages (/agents/creator/[userId]) showing bio, role, company, and published agents.'
      ]
    },
    {
      version: 'v2.13.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_13_0_title',
      descKey: 'changelog.v2_13_0_desc',
      highlights: [
        'Unified today agenda card merging tasks due today and leads with nextActionDate = today (done/snooze actions).',
        'Projects card on the Today dashboard showing active projects with direct links.',
        'Apify Google Maps Scraper added as a fourth prospecting source with min-rating and "exclude existing CRM leads" filters.',
        'Agent auto-launch via ?launch=id URL param — navigates directly into the agent workspace.'
      ]
    },
    {
      version: 'v2.12.3',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_3_title',
      descKey: 'changelog.v2_12_3_desc',
      highlights: [
        'Sidebar project items are now clickable links routing to /projects/[id].',
        'Dedicated project detail page listing associated library files and chat threads.'
      ]
    },
    {
      version: 'v2.12.2',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_2_title',
      descKey: 'changelog.v2_12_2_desc',
      highlights: [
        'Real-time team chat powered by Supabase Realtime — messages delivered instantly across sessions.',
        'New messaging tab in /team with per-workspace message history and dual-store SQLite/Supabase persistence.'
      ]
    },
    {
      version: 'v2.12.1',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_1_title',
      descKey: 'changelog.v2_12_1_desc',
      highlights: [
        'Fully functional notification system with a bell icon in the topbar and unread count badge.',
        'Vercel Cron routes for overdue task/lead reminders, daily digest, and weekly performance report.',
        'Notifications delivered in real time via Supabase Realtime subscription filtered by user and workspace.'
      ]
    },
    {
      version: 'v2.12.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_12_0_title',
      descKey: 'changelog.v2_12_0_desc',
      highlights: [
        'System dark theme enabled (enableSystem: true) and full dark-mode token sweep across all pages.',
        'Complete i18n coverage for /integrations and /agents — all visible strings use t() keys in fr/en/de.',
        'User avatar (base64 upload) and bio field in profile settings, stored in SQLite and Supabase.',
        'Leads enriched with website, Google Maps rating, review count, photos, social links, and team member assignment.',
        'Dedicated /leads/new creation page replacing the previous modal sheet.',
        'New /services page: CRUD catalog of offered services/audits, linked from the lead detail view.'
      ]
    },
    {
      version: 'v2.11.1',
      date: '2026-06-16',
      titleKey: 'changelog.v2_11_1_title',
      descKey: 'changelog.v2_11_1_desc',
      highlights: [
        'Fixed all 8 remaining TS7006 implicit-any TypeScript errors flagged after the v2.11.0 audit.',
        'pnpm typecheck now passes with 0 errors.'
      ]
    },
    {
      version: 'v2.11.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_11_0_title',
      descKey: 'changelog.v2_11_0_desc',
      highlights: [
        'AI provider keys (OpenRouter, Groq, Together.ai) are now masked end-to-end — never returned in clear text to the browser or cached in localStorage.',
        'Hardened /api/team/members and /api/team/invite with explicit workspace-membership checks before returning or mutating data.',
        'New dedicated pages: /integrations/import (catalog + JSON import) and /help/guides/[slug] (six real step-by-step guides).',
        'Removed every dead link, inert menu, and placeholder alert across /team, /welcome, /integrations and /billing.',
        'Consolidated duplicated lead-temperature badge logic into lib/lead-badges.ts and removed an unused mock export.'
      ]
    },
    {
      version: 'v2.10.0',
      date: '2026-06-16',
      titleKey: 'changelog.v2_10_0_title',
      descKey: 'changelog.v2_10_0_desc',
      highlights: [
        'Interactive Quebec map for geolocated prospecting.',
        'Custom AI agents marketplace.',
        'TipTap-based rich text editor for the library.'
      ]
    },
    {
      version: 'v2.9.1',
      date: '2026-06-15',
      titleKey: 'changelog.v2_9_1_title',
      descKey: 'changelog.v2_9_1_desc',
      highlights: [
        'New profile step in the onboarding flow.',
        'Dynamically generated user avatar.',
        'AI-generated email signature.'
      ]
    },
    {
      version: 'v2.9.0',
      date: '2026-06-15',
      titleKey: 'changelog.v2_9_0_title',
      descKey: 'changelog.v2_9_0_desc',
      highlights: [
        'Persisted lead scoring.',
        'Generic SMTP configuration beyond Gmail.',
        'New prospecting dashboard.',
        'Groq and Together.ai provider support.',
        'New /billing and /help pages.'
      ]
    },
    {
      version: 'v2.8.0',
      date: '2026-06-15',
      titleKey: 'changelog.v2_8_0_title',
      descKey: 'changelog.v2_8_0_desc',
      highlights: [
        'Upgraded to Electron 43 with macOS 26 Tahoe support.'
      ]
    },
    {
      version: 'v2.7.0',
      date: '2026-06-15',
      titleKey: 'changelog.v2_7_0_title',
      descKey: 'changelog.v2_7_0_desc',
      highlights: [
        'Real-time presence and anti-collision handling for shared data.',
        'JIT-less main-process restart mechanism fixing a recurring macOS Sequoia crash.'
      ]
    },
    {
      version: 'v2.5.x',
      date: '2026-06-14',
      titleKey: 'changelog.v2_5_x_title',
      descKey: 'changelog.v2_5_x_desc',
      highlights: [
        'Replaced orange with green across the whole UI; Welcome is now the home screen, Today remains in the sidebar.',
        'Disabled concurrent V8 JIT (--jitless) to eliminate a recurring EXC_BREAKPOINT crash on macOS 26.',
        'Disabled Chromium background networking to mitigate a DCHECK crash.',
        'Auto-recovery from renderer crashes during navigation; removed an OOM-causing heap cap.'
      ]
    },
    {
      version: 'v2.4.0',
      date: '2026-06-14',
      titleKey: 'changelog.v2_4_0_title',
      descKey: 'changelog.v2_4_0_desc',
      highlights: [
        'Landing page extracted to the root route.',
        'Fixed onboarding flow and startup theme flash.'
      ]
    },
    {
      version: 'v2.3.0',
      date: '2026-06-14',
      titleKey: 'changelog.v2_3_0_title',
      descKey: 'changelog.v2_3_0_desc',
      highlights: [
        'New system tray popover widget with glassmorphism design.',
        'On-demand scraping trigger and SQLite task check from the tray.'
      ]
    },
    {
      version: 'v2.1.0',
      date: '2026-06-13',
      titleKey: 'changelog.v2_1_0_title',
      descKey: 'changelog.v2_1_0_desc',
      highlights: [
        'Capacitor native-bridge for iOS/Android.',
        'Android platform configuration and Fastlane CI/CD workflows.'
      ]
    },
    {
      version: 'v2.0.0',
      date: '2026-06-13',
      titleKey: 'changelog.v2_0_0_title',
      descKey: 'changelog.v2_0_0_desc',
      highlights: [
        'Electron system tray icon and window close-to-tray behavior.',
        'Native application menu shortcuts and auto-updater.'
      ]
    },
    {
      version: 'v1.4.0',
      date: '2026-06-12',
      titleKey: 'changelog.v1_4_0_title',
      descKey: 'changelog.v1_4_0_desc',
      highlights: [
        'Announcements & Version Timeline page (/changelog) integrated in the sidebar footer.',
        'Lucide Megaphone action button with dynamic pathname focus state.',
        'Fully localized product updates catalog in French, English, and German.'
      ]
    },
    {
      version: 'v1.3.0',
      date: '2026-06-12',
      titleKey: 'changelog.v1_3_0_title',
      descKey: 'changelog.v1_3_0_desc',
      highlights: [
        'Rebuilt the Members list table to match the premium Langdock layout exactly.',
        'Added real plan text column and usage_count integer column to Supabase database schema.',
        'Interactive inline selectors to toggle user roles (Admin, Editor, Viewer) and plans (Business, Pro, Free).',
        'Search bar filter, filter icon triggers, and CSV data spreadsheet exporter.',
        'Circular envelope avatar shapes for pending members and custom Invited badges.',
        'Floating success toast alert notification popups dismissing automatically after invite events.'
      ]
    },
    {
      version: 'v1.2.0',
      date: '2026-06-11',
      titleKey: 'changelog.v1_2_0_title',
      descKey: 'changelog.v1_2_0_desc',
      highlights: [
        'Interactive date range popover calendar widget supporting ranges and single selections.',
        'KPI report metrics cards displaying active users, total agents, total workflows, and groups.',
        'Responsive ApexCharts showing active users logs and stacked column graphs for chat messages vs. agent calls.',
        'One-click download button for analytics datasets in CSV format.'
      ]
    },
    {
      version: 'v1.1.0',
      date: '2026-06-11',
      titleKey: 'changelog.v1_1_0_title',
      descKey: 'changelog.v1_1_0_desc',
      highlights: [
        'Interactive side-by-side Canvas panel to draft, preview, format, and edit rich documents dynamically.',
        'Starting greeting assistant layout displaying suggestion cards and files attachment previews.',
        'Model selection popovers and active tool selectors (Canvas, web search, search tools).'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2026-06-10',
      titleKey: 'changelog.v1_0_0_title',
      descKey: 'changelog.v1_0_0_desc',
      highlights: [
        'Refactored the core application settings (AI section, notifications) to use native Shadcn UI Switch elements.',
        'Language context provider translation maps supporting English, French, and German locales.',
        'Expandable onboarding progress checklist tracking workspace setup completion scores.'
      ]
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-neutral-50/40 text-neutral-800 font-sans selection:bg-blue-500/10">
      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              {t('changelog.title')}
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              {t('changelog.subtitle')}
            </p>
          </div>
        </div>

        {/* ── Timeline Timeline ── */}
        <div className="relative border-l border-neutral-200/80 ml-5 pl-8 space-y-8 py-2">
          {versions.map((ver) => {
            const formattedDate = new Date(ver.date).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div key={ver.version} className="relative group">

                {/* Timeline node dot */}
                <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-neutral-300 flex items-center justify-center transition-colors group-hover:border-neutral-900 z-10">
                  <div className="w-2 h-2 rounded-full bg-neutral-300 group-hover:bg-neutral-900 transition-colors" />
                </div>

                {/* Content Card */}
                <div className="bg-white border border-neutral-200/60 rounded-xl p-6 shadow-2xs hover:border-neutral-300 transition-all space-y-4">

                  {/* Card Header metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-neutral-900 text-white text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full select-none tracking-wider">
                        {ver.version}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                        {t('changelog.version')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t('changelog.released')} {formattedDate}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1.5 text-left">
                    <h3 className="text-sm font-extrabold text-neutral-950 tracking-tight leading-snug">
                      {t(ver.titleKey, ver.version)}
                    </h3>
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      {t(ver.descKey)}
                    </p>
                  </div>

                  {/* Highlights Bullet List */}
                  <ul className="space-y-2 pt-1 border-t border-neutral-50">
                    {ver.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-500 font-semibold leading-normal">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
