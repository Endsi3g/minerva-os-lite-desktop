'use client';

import React, { useEffect, useState } from 'react';
import { Bug, Sparkles, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

type HighlightTag = 'fix' | 'feature' | 'design';
type Lang = 'fr' | 'en' | 'de';

interface HighlightItem {
  tag: HighlightTag;
  text: string;
}

interface ChangelogVersion {
  version: string;
  date: string;       // pre-formatted French date, e.g. "2 juillet 2026 à 14h30"
  title: string;      // descriptive title, no version number
  highlights: HighlightItem[];
}

const TAG_CONFIG: Record<HighlightTag, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  fix:     { label: 'Correctif',  bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: Bug      },
  feature: { label: 'Nouveauté',  bg: '#f0fdf4', text: '#059669', border: '#bbf7d0', icon: Sparkles },
  design:  { label: 'Design',     bg: '#eef2ff', text: '#6366f1', border: '#c7d2fe', icon: Palette  },
};

function TagBadge({ tag }: { tag: HighlightTag }) {
  const { bg, border, text, icon: Icon, label } = TAG_CONFIG[tag];
  return (
    <span
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center shrink-0 w-[18px] h-[18px] rounded-full border mt-0.5"
      style={{ background: bg, borderColor: border }}
    >
      <Icon className="w-2.5 h-2.5" style={{ color: text }} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

function TagLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 rounded-xl border border-neutral-200/80 bg-white shadow-2xs w-fit">
      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0">Légende</span>
      {(Object.entries(TAG_CONFIG) as [HighlightTag, typeof TAG_CONFIG[HighlightTag]][]).map(([, cfg]) => (
        <span key={cfg.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border shrink-0"
            style={{ background: cfg.bg, borderColor: cfg.border }}
          >
            <cfg.icon className="w-2.5 h-2.5" style={{ color: cfg.text }} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="text-[11px] font-bold text-neutral-700">{cfg.label}</span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">— {
            cfg.label === 'Correctif' ? 'bug ou problème résolu' :
            cfg.label === 'Nouveauté' ? 'nouvelle fonctionnalité' : 'amélioration visuelle ou UX'
          }</span>
        </span>
      ))}
    </div>
  );
}

// ─── Versions data ─────────────────────────────────────────────────────────────

const versions: ChangelogVersion[] = [
  {
    version: 'v3.53.0',
    date: '4 juillet 2026 · 08:30',
    title: 'Kimi K2 — IA primaire, Carte intelligente & Sidebar repensée',
    highlights: [
      { tag: 'feature', text: 'IA Primaire — Kimi K2 : Le modèle @cf/moonshotai/kimi-k2.7-code (Moonshot AI via Cloudflare Workers AI) est maintenant le modèle principal de toute l\'application — assistant, agents, analyses, génération d\'emails, intelligence comportementale. Aucune dépendance externe requise.' },
      { tag: 'fix', text: 'Agents IA fonctionnels : La boucle agent, Hermès ReAct, l\'intelligence comportementale et les analyses NBA fonctionnent maintenant end-to-end — le bug de priorité de provider (Cloudflare était sauté en faveur d\'un modèle cassé) est corrigé.' },
      { tag: 'fix', text: 'JSON stripping : Les modèles raisonnants (Kimi K2) encapsulent leur réponse dans ```json ... ``` — ces backticks sont maintenant automatiquement supprimés avant le parsing, ce qui garantit que l\'agent Hermès reçoit du JSON valide.' },
      { tag: 'fix', text: 'Propagation d\'erreur IA : Les erreurs réelles du provider sont maintenant remontées jusqu\'à l\'interface au lieu d\'être swallowées sous "modèle temporairement indisponible".' },
      { tag: 'feature', text: 'Carte — FlyTo : Cliquer sur un lead dans la sidebar gauche ou sur un point sur la carte déplace maintenant la map directement vers ce lead (map.flyTo zoom 15, durée 900ms).' },
      { tag: 'feature', text: 'Carte — Popup inline : Au clic sur un lead, les infos apparaissent maintenant en popup ancré au point sur la carte (nom, ville, statut, email, score, distance GPS) plutôt qu\'une sidebar droite. Le panneau détail complet s\'ouvre via "Voir détails" dans le popup.' },
      { tag: 'feature', text: 'Carte — GPS nearby leads : Quand le tracking GPS est actif, les leads sont triés par distance et chaque lead affiche sa distance en temps réel (mètres si < 1km, kilomètres sinon). Le popup affiche aussi la distance.' },
      { tag: 'feature', text: 'Sidebar — Minerva AI repositionnée : La section "Minerva AI" (Assistant IA, Agents, Intelligence, Skills) est maintenant au-dessus de "Marketing" dans la navigation — plus de valeur, plus de visibilité.' },
      { tag: 'feature', text: 'Paramètres — Groupes collapsibles : Les 3 sections (Compte, Espace de travail, Outils) dans la sidebar des paramètres peuvent maintenant être repliées/dépliées via un bouton chevron. Les sections avec un élément actif restent visuellement distinguées.' },
      { tag: 'fix', text: 'Production API 404 : Les routes API (/api/chat, /api/agent/hermes, etc.) retournaient 404 sur le domaine principal Vercel à cause d\'un cache CDN périmé. Corrigé via réassignation d\'alias et fix du provider IA.' },
    ],
  },
  {
    version: 'v3.52.0',
    date: '3 juillet 2026',
    title: 'Map IA, Onboarding cult-ui, Chat Claude-style & Outils IA avancés',
    highlights: [
      { tag: 'feature', text: 'Carte — Bâtiments 3D : Toggle d\'extrusion 3D des bâtiments (fill-extrusion MapLibre) avec basculement automatique du pitch à 52° et bearing à -17°.' },
      { tag: 'feature', text: 'Carte — Vue satellite : Couche raster Esri World Imagery superposée aux tuiles CartoDB Positron via toggle dans la topbar.' },
      { tag: 'feature', text: 'Carte — Requêtes IA en langage naturel : Barre de filtrage intelligente (Brain icon) — tapez "prospects non contactés depuis 30 jours" et Claude génère les filtres automatiquement.' },
      { tag: 'feature', text: 'Carte — Survol cinématique : Bouton Play dans la tournée qui anime la caméra de waypoint en waypoint avec pitch 55°, bearing rotatif et transitions fluides.' },
      { tag: 'feature', text: 'Onboarding repensé : Nouveau flow 3 étapes avec cult-ui — Feature Carousel (3 slides Minerva), ChoiceGroup rôle/secteur, formulaire profil avec ShiftCard d\'aide.' },
      { tag: 'feature', text: 'Assistant — Claude Composer : Redesign de l\'input landing en style Claude.ai — grande zone de texte arrondie, sélecteur de modèle, bouton + attachements, chips catégories en dessous.' },
      { tag: 'feature', text: 'Email Tool IA : Composant AiEmailTool — brouillon email avec variantes Warm/Formal, sujet, corps, bouton Gmail compose, copie en un clic.' },
      { tag: 'feature', text: 'Image Search IA : Composant AiImageSearch — grille collage 2 colonnes avec badges domaine, favicons Google S2, lightbox carousel avec navigation prev/next.' },
      { tag: 'feature', text: 'Image Loader IA : Composant AiImageLoader — animation canvas pixel-mosaic pendant la génération d\'image, labels de statut cycliques, transition fondu vers l\'image finale.' },
      { tag: 'feature', text: 'Cursor Questions : Composant CursorQuestions — wizard de questions clavier-friendly avec options A/B/C/D, multi-sélection, champ "Autre", navigation par flèches.' },
      { tag: 'feature', text: 'Link Preview : Composant LinkPreview — carte survol avec titre, description, favicon, OG image — route /api/link-preview pour extraction de métadonnées.' },
      { tag: 'feature', text: 'Firecrawl Web Research : Route /api/tools/tool-search-firecrawl — recherche web, scraping URL, crawl de site via Firecrawl + synthèse Claude Haiku en streaming.' },
    ],
  },
  {
    version: 'v9.1.0',
    date: '2 juillet 2026',
    title: 'Fix — Carte, Notifications, Vocal AI & Nettoyage',
    highlights: [
      { tag: 'fix', text: 'Carte MapLibre : Les tuiles raster s\'affichent maintenant correctement — fix du reset Tailwind CSS qui bloquait le rendu des images de tiles (max-width: none).' },
      { tag: 'fix', text: 'Canvas MapLibre : Suppression des bordures et outlines parasites sur l\'élément <canvas> causées par le reset global Tailwind.' },
      { tag: 'fix', text: 'Notifications natives : La demande de permission s\'affiche maintenant proactivement au démarrage (toast interactif après 5s) au lieu d\'attendre que l\'utilisateur ouvre la cloche.' },
      { tag: 'fix', text: 'Son de confirmation : L\'AudioContext est maintenant créé depuis un geste utilisateur valide (clic sur "Activer" dans la toast), ce qui déverrouille le son dans tous les navigateurs.' },
      { tag: 'feature', text: 'Voix → Assistant AI : Le dictaphone global redirige maintenant vers /assistant avec le transcript envoyé automatiquement comme message, au lieu de rester dans un panneau flottant.' },
      { tag: 'design', text: 'Panneau vocal simplifié : Interface épurée montrant uniquement le transcript en direct et un champ texte de secours.' },
    ],
  },
  {
    version: 'v9.0.0',
    date: '2 juillet 2026 à 07h36',
    title: 'Minerva v8 — Revenue OS orchestré (Consolidation)',
    highlights: [
      { tag: 'feature', text: 'Consolidation du Cockpit : Fusion complète de Today, Cockpit, Command Center et Agent Feed sous un écran unique (/today).' },
      { tag: 'feature', text: 'Onglets Opérations, Inbox, et Pilotage stratégique : Regroupe agenda, tâches, boîte mail et rapports stratégiques/mémoire IA au même endroit.' },
      { tag: 'feature', text: 'Tunnel 7 Phases : Visualisez la répartition visuelle de vos prospects le long du parcours commercial canonique.' },
      { tag: 'feature', text: "Outreach Control Center : File d'approbations de l'agent directement dans le cockpit pour valider les brouillons d'un clic." },
      { tag: 'feature', text: 'Redirections automatiques : Les routes /cockpit et /command redirigent maintenant proprement vers /today.' },
    ],
  },
  {
    version: 'v8.9.0',
    date: '2 juillet 2026 à 07h33',
    title: 'Modèle Google Gemma 4 & Tolérance think',
    highlights: [
      { tag: 'feature', text: 'Google Gemma 4 : Configuration du modèle @cf/google/gemma-4-26b-a4b-it par défaut pour des réponses et un format JSON rapides et respectés.' },
      { tag: 'fix',     text: 'Filtre think : Nettoyage automatique des balises <think>...</think> pour éviter les plantages de format JSON avec les modèles de raisonnement.' },
    ],
  },
  {
    version: 'v8.8.0',
    date: '2 juillet 2026 à 07h07',
    title: 'Hébergement Cloudflare Workers AI',
    highlights: [
      { tag: 'feature', text: 'Cloudflare Workers AI : Support complet de la plateforme Workers AI native pour exécuter les requêtes et les flux de streaming.' },
      { tag: 'feature', text: 'Modèle DeepSeek : Intégration du modèle deepseek/deepseek-v4-pro par défaut avec token de sécurisation cloud.' },
    ],
  },
  {
    version: 'v8.6.0',
    date: '1 juillet 2026 à 09h00',
    title: 'Rapport hebdomadaire automatique',
    highlights: [
      { tag: 'feature', text: 'Rapport hebdomadaire automatique : chaque lundi, recevez un résumé de vos actions de la semaine — emails envoyés, réponses reçues, rendez-vous bookés, et vos meilleures opportunités du moment.' },
      { tag: 'feature', text: 'Livré chaque lundi à 8h : votre rapport est généré automatiquement et apparaît dans vos notifications en tant que résumé cliquable.' },
      { tag: 'feature', text: 'Taux d\'acceptation NBA : dans votre centre de pilotage, suivez combien de recommandations IA vous avez appliquées cette semaine.' },
      { tag: 'design',  text: 'Carte de rapport dans Revenue OS : 4 indicateurs clés (score IA, bookings, réponses positives, leads avancés) avec rapport détaillé en un clic.' },
    ],
  },
  {
    version: 'v8.5.0',
    date: '1 juillet 2026 à 08h00',
    title: 'Gestion de la charge d\'équipe',
    highlights: [
      { tag: 'feature', text: 'Tableau de charge d\'équipe : voyez en un coup d\'œil qui est surchargé, qui a de la disponibilité, et combien de leads sont assignés à chaque membre.' },
      { tag: 'feature', text: 'Alertes de délai dépassé : Minerva vous avertit automatiquement quand une action importante dépasse son délai (ex: relance non envoyée depuis 3 jours).' },
      { tag: 'feature', text: 'Feed revenus équipe : un onglet dédié dans la page Équipe affiche toutes les victoires commerciales — réponses positives, rendez-vous bookés — avec horodatage.' },
      { tag: 'feature', text: 'Bouton d\'assignation intelligente : assignez une action NBA à un membre en un clic — il reçoit une notification automatique.' },
      { tag: 'design',  text: 'Page Équipe enrichie : 3 onglets — Membres, Charge de travail, Feed revenus.' },
    ],
  },
  {
    version: 'v8.4.0',
    date: '1 juillet 2026 à 07h00',
    title: 'Détection automatique des réponses positives',
    highlights: [
      { tag: 'feature', text: 'Quand un prospect répond positivement, Minerva le détecte automatiquement et met à jour son statut, crée une tâche de booking, et notifie votre équipe — sans aucune action de votre part.' },
      { tag: 'feature', text: 'Détection d\'intention enrichie : les réponses signalant un intérêt ou une demande de rendez-vous déclenchent toutes les actions commerciales appropriées en boucle fermée.' },
    ],
  },
  {
    version: 'v8.3.0',
    date: '1 juillet 2026 à 06h00',
    title: 'Mémoire stratégique de l\'agent',
    highlights: [
      { tag: 'feature', text: 'Mémoire stratégique : Minerva apprend de vos résultats — quelles niches répondent le mieux, quel jour envoyer vos emails, quel canal utiliser pour chaque type de client.' },
      { tag: 'feature', text: 'Recommandations actionnables : 3 conseils stratégiques générés par l\'IA à partir de vos vrais résultats, visibles dans votre cockpit.' },
      { tag: 'design',  text: 'Carte Mémoire stratégique dans Revenue OS : top 5 apprentissages avec niveau de confiance et taille d\'échantillon.' },
    ],
  },
  {
    version: 'v8.2.0',
    date: '1 juillet 2026 à 05h00',
    title: 'Parcours client en 7 phases',
    highlights: [
      { tag: 'feature', text: 'Chaque lead suit maintenant un parcours en 7 étapes claires : Email initial → Relance → Appel → Visite terrain → Booking → Proposition → Suivi. Minerva calcule la phase de chaque prospect automatiquement.' },
      { tag: 'feature', text: 'Timeline de progression dans chaque fiche lead : visualisez où en est chaque prospect dans son parcours, avec un bouton "Exécuter maintenant" pour passer à l\'étape suivante.' },
      { tag: 'feature', text: 'Changement de canal automatique : si un prospect a ouvert 3 emails sans répondre, Minerva suggère de passer à l\'appel ou au terrain.' },
    ],
  },
  {
    version: 'v8.1.0',
    date: '1 juillet 2026 à 04h00',
    title: 'Revenue OS — Centre de pilotage',
    highlights: [
      { tag: 'feature', text: 'Command Center (/command) : nouvelle page de pilotage avec 4 blocs en temps réel — File de priorités, Prochaines meilleures actions, Performance, État opératoire.' },
      { tag: 'feature', text: 'File de priorités intelligente : 4 catégories (Urgent, Opportunité, Bloqué, À approuver) avec les 5 leads les plus importants de chaque catégorie.' },
      { tag: 'feature', text: 'Filtres niche + canal : filtrez instantanément votre pipeline par secteur ou type de contact.' },
      { tag: 'design',  text: 'Panneau droite : KPIs temps réel, fil des dernières actions IA, alertes de signaux, taux d\'acceptation des recommandations.' },
    ],
  },
  {
    version: 'v8.0.0',
    date: '30 juin 2026 à 20h00',
    title: 'Agent Minerva autonome',
    highlights: [
      { tag: 'feature', text: 'Agent autonome toutes les 4h — l\'agent analyse votre pipeline, choisit les meilleures actions et les exécute automatiquement. Toutes les actions sont tracées avec explication.' },
      { tag: 'feature', text: 'Digest du soir (18h) — résumé quotidien enrichi : emails envoyés, réponses reçues, RDV créés, actions agent, leads ajoutés. Visible dans les notifications + email si SMTP configuré.' },
      { tag: 'feature', text: 'Carte "Résumé d\'aujourd\'hui" dans Today — 4 KPIs (emails, réponses, RDV, actions agent) et les 3 dernières actions avec leur raisonnement.' },
      { tag: 'feature', text: 'RDV Google Calendar automatique — quand une réponse positive est détectée dans Gmail, un RDV est créé automatiquement dans votre agenda pour le lendemain à 10h.' },
      { tag: 'feature', text: 'Vérification Gmail toutes les 2h — détection quasi temps réel des nouvelles réponses.' },
      { tag: 'fix',     text: 'Mode Terrain — badge "(approx.)" pour les leads sans coordonnées GPS exactes.' },
      { tag: 'fix',     text: 'Automations — l\'action "Envoyer un email" crée désormais un brouillon dans la file d\'approbation Outreach.' },
    ],
  },
  {
    version: 'v7.1.0',
    date: '30 juin 2026 à 18h00',
    title: 'Moteur NBA & Cockpit',
    highlights: [
      { tag: 'feature', text: 'Moteur NBA hybride — score 0-100 calculé sur 3 signaux : délai sans contact, engagement email, performance de la niche. Actions recommandées : relance email, changement de canal, booking, nurture, pause.' },
      { tag: 'feature', text: 'Apprentissage par niche — Minerva analyse vos taux de réponse et booking par secteur pour recommander le canal et le timing optimal.' },
      { tag: 'feature', text: 'Score et explication NBA — 3 endpoints : scoring batch, calcul à la demande, explication IA par lead (bouton "Pourquoi ?" dans chaque fiche).' },
      { tag: 'feature', text: 'Carte NBA dans chaque fiche lead — score coloré, action recommandée, raisonnement de l\'agent, recalcul en temps réel.' },
      { tag: 'feature', text: 'Cockpit Revenue OS (/cockpit) — 4 KPIs, séquences performantes, alertes de signaux, top 5 leads NBA.' },
      { tag: 'feature', text: 'Onboarding stratégique — modal de démarrage 2 étapes (niche + objectif) pour initialiser les recommandations dès la première connexion.' },
    ],
  },
  {
    version: 'v7.0.0',
    date: '30 juin 2026 à 16h00',
    title: 'Prochaine Meilleure Action',
    highlights: [
      { tag: 'feature', text: 'Prochaine Meilleure Action (NBA) — carte en haut de l\'Accueil : Minerva identifie l\'action la plus urgente du moment et vous la présente avec son raisonnement et les signaux justificatifs.' },
      { tag: 'feature', text: 'Exécution en 1 clic — générez un brouillon de relance, planifiez un rappel ou redirigez vers le bon écran selon l\'action recommandée.' },
      { tag: 'feature', text: 'Bouton "Passer" — marquez une action comme rejetée et chargez automatiquement la suivante dans la file.' },
      { tag: 'design',  text: 'Carte NBA — bordure verte distinctive, label d\'action avec icône typée, raisonnement en italique, signaux en petite typo.' },
    ],
  },
  {
    version: 'v6.2.0',
    date: '29 juin 2026 à 22h00',
    title: 'Profils d\'autonomie agent',
    highlights: [
      { tag: 'design',  text: '3 profils d\'autonomie — Manuel / Contrôlé / Mains libres remplacent les 11 réglages individuels dans Paramètres → Intelligence. Un clic suffit pour configurer l\'agent.' },
      { tag: 'feature', text: 'Profil Contrôlé (recommandé) — brouillons et relances générés automatiquement, mis en file d\'approbation. Validez avant l\'envoi.' },
      { tag: 'feature', text: 'Profil Mains libres — l\'agent agit sans confirmation sur tous les domaines.' },
      { tag: 'feature', text: 'Réglages avancés toujours accessibles via "Réglages avancés" pour les configurations personnalisées.' },
      { tag: 'design',  text: 'Indicateur "Configuration personnalisée" si aucun profil preset ne correspond.' },
    ],
  },
  {
    version: 'v6.1.0',
    date: '29 juin 2026 à 20h00',
    title: 'Relances automatiques & Intent IA',
    highlights: [
      { tag: 'feature', text: 'Relance automatique des leads tièdes — bouton "Générer les relances" dans Today : l\'agent détecte les top 3 leads inactifs depuis 7j+ et génère un brouillon pour chacun dans Outreach → Approbations.' },
      { tag: 'feature', text: 'Carte Priorités agent dans Today — top 5 leads tièdes/froids triés par score avec badge température et jours d\'inactivité.' },
      { tag: 'feature', text: 'Badge intent IA sur chaque thread Inbox — classification automatique : Intéressé, RDV, Infos demandées, Objection, Pas intéressé.' },
      { tag: 'feature', text: 'Auto-classification à l\'ouverture d\'un thread — premier clic → classification silencieuse, badge mis à jour en temps réel.' },
      { tag: 'feature', text: 'Endpoint /api/agent/relance — génère 3 brouillons de relance en un appel, visibles immédiatement dans Approbations.' },
      { tag: 'feature', text: 'Endpoint /api/inbox/classify — classification IA + sauvegarde intent + log dans timeline lead.' },
    ],
  },
  {
    version: 'v6.0.0',
    date: '29 juin 2026 à 18h00',
    title: 'Plateforme Minerva AI dédiée',
    highlights: [
      { tag: 'feature', text: 'Minerva AI — plateforme dédiée aux fonctionnalités IA : Assistant, Intelligence, Agents, Skills. Accessible via icône dans la topbar.' },
      { tag: 'feature', text: 'Navigation duale — layout AI épuré avec 4 entrées, historique de sessions dans la sidebar, switch Reach ↔ AI en un clic.' },
      { tag: 'feature', text: 'Switch de plateforme dans la topbar — bouton "Minerva AI" sur Reach, bouton "Minerva Reach" sur AI. Prêt pour subdomains.' },
      { tag: 'design',  text: 'Nav Reach simplifiée — 6 entrées : Accueil, Leads, Outreach, Carte, Agenda, Équipe.' },
      { tag: 'fix',     text: 'Bug Scrape → Email en mode Electron : websiteDescription transmise directement dans le body POST.' },
      { tag: 'fix',     text: 'Sidebar Reach : bloc session assistant retiré (code mort). Import nettoyé.' },
    ],
  },
  {
    version: 'v5.3.0',
    date: '29 juin 2026 à 16h00',
    title: 'Outreach Control Center',
    highlights: [
      { tag: 'feature', text: 'Outreach Control Center — Campagnes et Approbations sont désormais des écrans complets.' },
      { tag: 'feature', text: 'Écran Campagnes — liste avec KPIs (envoyés, ouvertures, réponses, positifs, RDV), toggle pause/relance, alertes de performance.' },
      { tag: 'feature', text: 'Écran Approbations — file unifiée brouillons IA + actions agent. Approuver ou Rejeter chaque item avec son raisonnement.' },
      { tag: 'feature', text: 'Autonomie Outreach granulaire — 6 niveaux indépendants : création brouillons, premier envoi, relances auto, réponse, pause séquence, mise à jour pipeline.' },
      { tag: 'feature', text: 'Nouveaux outils Agent Minerva — pause/resume séquence, tag lead, classify reply, résumé inbox, suggestion de follow-up.' },
      { tag: 'feature', text: 'Routes API outreach — enrollments pause/resume, approbations, campagnes, enrollments avec join lead+séquence.' },
      { tag: 'feature', text: 'Migration Supabase v5_outreach — colonnes source/intent_type/approved sur drafts, current_step/next_send_at/paused_at sur enrollments.' },
    ],
  },
  {
    version: 'v5.2.0',
    date: '29 juin 2026 à 14h00',
    title: 'Agent Minerva & Mémoire IA',
    highlights: [
      { tag: 'feature', text: 'Agent Minerva — boucle autonome perceive → plan → act → log. L\'agent analyse le pipeline, choisit les meilleures actions et les exécute selon votre niveau d\'autonomie.' },
      { tag: 'feature', text: 'Niveaux d\'autonomie par domaine — 5 niveaux (Désactivé → Automatique) configurables pour Tâches, Pipeline, Séquences, Emails et Terrain.' },
      { tag: 'feature', text: 'Mémoire d\'agent — table agent_memory par workspace. L\'agent mémorise ses apprentissages et les réinjecte à chaque cycle.' },
      { tag: 'feature', text: 'Journal des actions agent — chaque action tracée avec reasoning et signaux. Approuver ou rejeter depuis l\'interface.' },
      { tag: 'feature', text: 'AI Gateway unifié — lib/ai.ts unique source de vérité pour tous les appels IA. Fallback automatique Anthropic ↔ OpenRouter.' },
      { tag: 'fix',     text: 'Suppression de Groq et Together AI — stack IA simplifié : Claude (Anthropic) + OpenRouter.' },
      { tag: 'feature', text: 'Migration Supabase v5_agent — tables agent_memory, agent_actions, ai_gateway_logs ; colonnes agent_autonomy + agent_enabled.' },
    ],
  },
  {
    version: 'v5.1.0',
    date: '29 juin 2026 à 12h00',
    title: 'Inbox Google & Timeline unifiée',
    highlights: [
      { tag: 'fix',     text: 'Sidebar v5 — "Paramètres" retiré des entrées principales. Terrain renommé "Carte".' },
      { tag: 'feature', text: 'Rôles — page dédiée /settings/roles/new et /team/roles/new pour créer des rôles d\'accès.' },
      { tag: 'fix',     text: 'Google Inbox — correction critique : getFreshAccessToken utilisait maybeSingle() qui cassait avec plusieurs comptes. Correction avec limit(1).' },
      { tag: 'fix',     text: 'Breadcrumb Leads — sous-navigation (Liste | Pipeline | Comptes | Prospection | Timeline) affichée sur les pages de la famille Leads.' },
      { tag: 'feature', text: 'Timeline unifiée — page /leads/timeline avec notifications, tâches, visites terrain, chronologie par date.' },
      { tag: 'fix',     text: 'Bannière de mise à jour — version mise à jour.' },
    ],
  },
  {
    version: 'v5.0.0',
    date: '29 juin 2026 à 10h00',
    title: 'Navigation v5 & AI Gateway',
    highlights: [
      { tag: 'feature', text: 'Navigation v5 — 7 entrées épurées : Accueil, Leads, Outreach, Terrain, Agenda, Équipe, Paramètres.' },
      { tag: 'feature', text: 'AI Gateway interne — centralise tous les appels IA. Logs persistés dans ai_gateway_logs.' },
      { tag: 'feature', text: 'Agent Feed sur l\'Accueil — timeline temps réel des actions IA. Polling 30s, liens cliquables vers les leads concernés.' },
      { tag: 'feature', text: 'Outreach unifié — 5 onglets : Inbox, Séquences, Campagnes, Templates, Approbations.' },
      { tag: 'feature', text: 'Famille Leads — sous-navigation Liste | Pipeline | Comptes | Prospection | Timeline.' },
      { tag: 'feature', text: 'Diagnostics IA dans Paramètres — latence par provider, taux succès/fallback, test ping, historique des requêtes.' },
    ],
  },
  {
    version: 'v4.5.0',
    date: '28 juin 2026 à 22h00',
    title: 'Automations & Changelog redesigné',
    highlights: [
      { tag: 'design',  text: 'Changelog — badges de type : les étiquettes texte deviennent des icônes circulaires 18px (Bug rouge, Sparkles vert, Palette indigo).' },
      { tag: 'fix',     text: 'Leads — restauration de l\'arrière-plan crème chaud (#fafaf8) avec superposition de grille.' },
      { tag: 'feature', text: 'Centre d\'automations (/automations) — 4 cartes avec toggle on/off, bouton "Run maintenant", historique 7 jours.' },
      { tag: 'feature', text: 'Trigger manuel /api/automations/trigger — déclenche n\'importe quel cron depuis la page Automations.' },
    ],
  },
  {
    version: 'v4.4.0',
    date: '28 juin 2026 à 20h00',
    title: 'Performance & Iconographie',
    highlights: [
      { tag: 'design',  text: 'Charts analytics — polish visuel : axes, grilles, tooltips alignés avec la charte graphique (#059669 vert Minerva).' },
      { tag: 'feature', text: 'Mémoïsation — useMemo et React.memo sur les composants lourds (graphiques, tableaux) pour éliminer les re-renders inutiles.' },
      { tag: 'design',  text: 'Iconographie unifiée : remplacement des icônes génériques par des variantes Lucide cohérentes.' },
      { tag: 'feature', text: 'Toasts améliorés : description contextuelle, durée 5s, icône de statut colorée.' },
      { tag: 'feature', text: 'Titres de page : chaque vue met à jour document.title avec le nom de l\'entité.' },
    ],
  },
  {
    version: 'v4.3.0',
    date: '28 juin 2026 à 18h00',
    title: 'Pipeline enrichi & Propositions',
    highlights: [
      { tag: 'feature', text: 'Nouvelles étapes pipeline : "Proposition envoyée" et "Négociation" avec codes couleur (violet + ambre).' },
      { tag: 'feature', text: 'Onglet Prévisions dans le pipeline : KPIs, graphique barres par mois pondéré, deals à clôturer.' },
      { tag: 'feature', text: 'Builder de propositions 5 sections avec génération IA par section et calcul taxes QC (TPS 5% + TVQ 9.975%).' },
      { tag: 'feature', text: 'Export PDF proposition — Electron natif. Web : impression navigateur. Format A4 professionnel.' },
      { tag: 'feature', text: 'Persistance propositions dans table "proposals". Bouton "Marquer envoyée" automatique.' },
      { tag: 'feature', text: 'IA par section : génère Présentation, Problème, Solution ou Modalités selon le contexte du lead.' },
    ],
  },
  {
    version: 'v4.2.0',
    date: '28 juin 2026 à 16h00',
    title: 'Performances serveur optimisées',
    highlights: [
      { tag: 'design',  text: 'SVG inline — icônes Instagram et Facebook en JSX inline. Zéro requête réseau, rendu immédiat.' },
      { tag: 'feature', text: 'Singleton admin Supabase — client service-role partagé. Élimine la réinstanciation par requête.' },
      { tag: 'feature', text: 'Correction N+1 team/members — profils chargés en une seule requête IN au lieu de N requêtes.' },
      { tag: 'feature', text: 'Cache serveur + client — TTL 30-60s pour /api/team/members et permissions. Invalidation automatique.' },
    ],
  },
  {
    version: 'v4.1.0',
    date: '27 juin 2026 à 20h00',
    title: 'UX fluide & Recherche améliorée',
    highlights: [
      { tag: 'design',  text: 'Transitions de page — barre de progression verte fine en haut + fade-in 180ms. Respect prefers-reduced-motion.' },
      { tag: 'feature', text: 'Skeleton chargement — tableau Leads affiche 8 lignes animées pendant le chargement initial.' },
      { tag: 'design',  text: 'Polices — correction subset Inter + display: swap pour éliminer les décalages CLS.' },
      { tag: 'feature', text: 'Recherche leads — debounce 220ms + historique 5 dernières recherches + touche Escape pour effacer.' },
      { tag: 'feature', text: 'AlertDialog — remplace les window.confirm() natifs. Suppression en masse avec dialog contextuel.' },
      { tag: 'design',  text: 'Fil d\'Ariane — affiche le vrai nom du business dans la fiche lead (ex: "Cabinet Dentaire Dr. Laurent").' },
    ],
  },
  {
    version: 'v4.0.0',
    date: '27 juin 2026 à 18h00',
    title: 'Automatisation complète',
    highlights: [
      { tag: 'feature', text: 'Automatisation complète — enrichissement batch, cron nocturne à 2h, auto-email après enrichissement. L\'app peut prospecter et contacter sans intervention.' },
      { tag: 'feature', text: 'Tags leads — auto-tags depuis statut CRM et réponses email. Tags libres manuels depuis la fiche lead.' },
      { tag: 'feature', text: 'Paramètres Automations — 4 toggles : Enrichir à l\'import, Enrichissement nocturne, Email auto, Tagger les réponses.' },
      { tag: 'feature', text: 'Cron nocturne — /api/cron/enrich-leads tourne à 2h, traite 50 leads non enrichis par workspace.' },
      { tag: 'fix',     text: 'AI 429 rate limit — retry automatique après 60s pour les appels non-streaming et streaming.' },
      { tag: 'design',  text: 'Page Prospection responsive — grille xl:grid-cols-[1fr_300px], s\'adapte à la largeur disponible.' },
    ],
  },
  {
    version: 'v3.47.0',
    date: '27 juin 2026 à 14h00',
    title: 'Corrections Google & Interface',
    highlights: [
      { tag: 'fix',     text: 'Google auth — getAuthStatus renforcé : si des tokens valides existent, auto-réparation. Plus jamais de demande de reconnexion inutile.' },
      { tag: 'fix',     text: 'google_tokens upsert — évite les doublons lors d\'une reconnexion.' },
      { tag: 'fix',     text: 'Intégrations Google — si déjà connecté dans /integrations, toutes les pages le détectent.' },
      { tag: 'design',  text: 'Fiche lead — layout responsive corrigé : 2 colonnes à xl (≥1280px), padding réduit.' },
      { tag: 'design',  text: 'Google Calendar (Today) + Gmail/Agenda — GoogleConnectModal centralisé.' },
      { tag: 'fix',     text: 'AI 429 — message explicite "modèle temporairement saturé, réessaie dans 30-60s".' },
      { tag: 'design',  text: 'Widget Intelligence — rapport IA rendu en JSX structuré via MarkdownRenderer.' },
      { tag: 'feature', text: 'Changelog — tags (Fix / Nouveauté / Design) sur tous les highlights. Versions v3.43–v3.46 rétroactivement taguées.' },
    ],
  },
  {
    version: 'v3.46.0',
    date: '26 juin 2026 à 22h00',
    title: 'Inbox & Statistiques',
    highlights: [
      { tag: 'fix',     text: 'Inbox Gmail — resolveAccessToken renforcé : auto-réinitialise le statut à "connected" si tokens valides.' },
      { tag: 'fix',     text: 'Google Maps — bouton converti en electron-safe (shell.openExternal dans Electron).' },
      { tag: 'fix',     text: 'Couleurs profil agence — bouton "Réinitialiser" pour revenir au vert Minerva (#059669).' },
      { tag: 'fix',     text: 'Attribution leads projets — picker de projet dans la fiche lead fonctionnel (project_id FK).' },
      { tag: 'feature', text: 'Templates Email — accessible depuis la sidebar sous "Templates Email" (/email-templates).' },
      { tag: 'feature', text: 'Notifications — 4 nouveaux types : email_sent, email_received, lead_aging, scraping_done.' },
      { tag: 'feature', text: 'Page Statistiques (/analytics) — 3 onglets : Vue globale, Prospection, Activité équipe.' },
    ],
  },
  {
    version: 'v3.45.0',
    date: '26 juin 2026 à 20h00',
    title: 'Responsive global',
    highlights: [
      { tag: 'design',  text: 'Refonte responsive globale — suppression de toutes les contraintes de largeur fixes sur toutes les pages. Contenu fluide sur tout l\'écran.' },
      { tag: 'design',  text: 'Padding adaptatif appliqué sur 25+ pages : Today, Leads, Pipeline, Analytics, Prospecting, Settings, etc.' },
      { tag: 'fix',     text: 'BottomBlur Messages — n\'apparaît plus sur /messages (couvrait l\'input bar).' },
      { tag: 'design',  text: 'globals.css — overflow-x: hidden sur html/body + classes .page-container et .table-responsive.' },
    ],
  },
  {
    version: 'v3.44.0',
    date: '26 juin 2026 à 18h00',
    title: 'Projets & Leads',
    highlights: [
      { tag: 'feature', text: 'Projets — association leads ↔ projets via colonne project_id. Sélecteur dans la fiche lead.' },
      { tag: 'feature', text: 'Fiche lead — sélecteur "Projet" dans la sidebar droite. Lien direct vers le projet si assigné.' },
      { tag: 'fix',     text: 'Page projet — compteur et filtre utilisent project_id explicite.' },
      { tag: 'fix',     text: 'updateLead : projectId → project_id mappé dans les deux chemins (Electron + Supabase).' },
    ],
  },
  {
    version: 'v3.43.0',
    date: '25 juin 2026 à 14h00',
    title: 'Email & OpenRouter',
    highlights: [
      { tag: 'fix',     text: 'OpenRouter — modèles Anthropic remappés automatiquement vers meta-llama/llama-3.3-70b-instruct:free.' },
      { tag: 'feature', text: 'Email — bannière de confirmation après envoi (sujet + destinataire) + notification macOS via Electron.' },
      { tag: 'fix',     text: 'Panneau outreach — Score V2 (ICP/Engagement) retiré. Voicemail activée dès qu\'un numéro est présent.' },
      { tag: 'fix',     text: 'Bouton Google Maps — shell.openExternal() dans Electron. Ouvre dans le navigateur système.' },
      { tag: 'feature', text: 'Inbox — onglet "Envoyés" : fils du label SENT Gmail, liés automatiquement aux leads par email.' },
      { tag: 'fix',     text: 'Inbox OAuth — resolveAccessToken maybeSingle() + fallback legacy settings + google_accounts.' },
    ],
  },
  {
    version: 'v3.42.0',
    date: '24 juin 2026 à 14h00',
    title: 'Google Places & Animations',
    highlights: [
      { tag: 'feature', text: 'Google Places auto-enrichissement : note, avis, résumé IA et top 2 avis récupérés automatiquement (cache 7j). Clé GOOGLE_PLACES_API_KEY requise.' },
      { tag: 'feature', text: 'Section "Google Insights" dans la fiche lead : rating étoiles, résumé IA, extraits d\'avis.' },
      { tag: 'feature', text: 'Email IA refondu : 1ère phrase spécifique issue de Google. Sans "J\'espère que tu vas bien" ni "leader".' },
      { tag: 'design',  text: 'Fiche lead mobile : 8 onglets scrollables horizontalement (overflow-x-auto).' },
      { tag: 'design',  text: 'Transition fluide entre onglets (AnimatePresence fade + slide 6px, 160ms).' },
      { tag: 'design',  text: 'Sidebar — slide depuis la gauche : drawer sur mobile, width spring + inner slide sur desktop.' },
      { tag: 'design',  text: 'Transitions de page globales : AnimatePresence mode=\'wait\' (opacity + y:8→0, 180ms).' },
      { tag: 'feature', text: 'Migration SQL v4.9 : colonnes google_place_id, google_place_data, google_enriched_at sur leads.' },
    ],
  },
  {
    version: 'v3.41.0',
    date: '24 juin 2026 à 10h00',
    title: 'Navigation & Animations spring',
    highlights: [
      { tag: 'design',  text: 'Bottom nav mobile : 4 destinations + sheet "Plus" pour 6 destinations secondaires. Retour tactile spring (scale: 0.88).' },
      { tag: 'design',  text: 'Icônes sidebar : strokeWidth 1.5 inactif / 2 actif, opacity 60% inactif.' },
      { tag: 'design',  text: 'Sidebar — accordion "Paramètres & Plus" collapsable AnimatePresence (height: 0→auto, 180ms).' },
      { tag: 'design',  text: 'Workspace switcher animé : AnimatePresence mode=\'wait\' key={activeWorkspace.id}.' },
      { tag: 'design',  text: 'Barre de filtres leads plus aérée : gap-3, hauteurs h-8, hover vert #047857.' },
      { tag: 'design',  text: 'Toutes les animations Framer Motion spring (stiffness 300–400, damping 30, mass 1).' },
    ],
  },
  {
    version: 'v3.40.0',
    date: '23 juin 2026 à 22h00',
    title: 'Smartlead, Voicemail & Bibliothèque',
    highlights: [
      { tag: 'feature', text: 'Smartlead sequences : enrôler un lead dans une campagne Smartlead depuis la fiche lead. Score ICP + canaux recommandés.' },
      { tag: 'feature', text: 'Voicemail Drop Cowboy : script IA ≤80 mots + envoi Ringless Voicemail via API Drop Cowboy.' },
      { tag: 'feature', text: 'Bibliothèque de preuves (/leverage-library) : CRUD études de cas. L\'IA sélectionne la plus pertinente lors de la génération d\'email.' },
      { tag: 'feature', text: 'Paramètres → Intégrations : clés Smartlead, Drop Cowboy, IA Inbox (toggle auto-réponse + seuil confiance).' },
      { tag: 'feature', text: 'Migration SQL v4.8 : tables leverage_library et voicemail_queue + colonnes settings.' },
    ],
  },
  {
    version: 'v3.39.0',
    date: '23 juin 2026 à 20h00',
    title: 'Composer Gmail & DM',
    highlights: [
      { tag: 'feature', text: 'Email → Brouillon Gmail : l\'envoi crée un brouillon dans Gmail. Bouton "Sauvegarder" conserve dans la table drafts.' },
      { tag: 'feature', text: 'Onglet DM (Instagram/Facebook) : composer un message direct, générer un template IA, copier en 1 clic.' },
      { tag: 'feature', text: 'Description du lead éditable : Textarea avec bouton "Enregistrer" via updateLead.' },
      { tag: 'feature', text: 'Filtre "Avis minimum" dans le scraper : slider 0–500 avis, filtrage en temps réel.' },
      { tag: 'feature', text: 'Dernier lead visité en tête de liste avec badge "Récemment visité".' },
    ],
  },
  {
    version: 'v3.38.0',
    date: '23 juin 2026 à 18h00',
    title: 'Réseaux sociaux & Instagram',
    highlights: [
      { tag: 'feature', text: 'Réseaux sociaux sur les fiches leads : section Instagram/Facebook/LinkedIn + site web avec icônes SVG natifs.' },
      { tag: 'feature', text: 'Galerie Instagram : bouton "Voir les posts" scrape le profil, affiche une grille 3×3 des derniers posts.' },
      { tag: 'feature', text: 'Bibliothèque → Images : upload vers Supabase Storage, galerie avec prévisualisation, copie d\'URL, suppression.' },
      { tag: 'feature', text: 'Setup agence : le logo importé est sauvegardé dans la bibliothèque. Couleur d\'accent workspace avec aperçu live.' },
      { tag: 'feature', text: 'Migration SQL v4.7 : colonnes agency_website, agency_logo_url, social_links, table services.' },
    ],
  },
  {
    version: 'v3.37.0',
    date: '23 juin 2026 à 16h00',
    title: 'Composer unifié & Enrichissement',
    highlights: [
      { tag: 'feature', text: 'Composer unifié dans la fiche lead : 4 actions — Email (Gmail), Appel (script IA + résultats), Tâche rapide, RDV (booking).' },
      { tag: 'feature', text: 'Enrichissement v2 : logo (Google Favicons), taille estimée (Claude AI), stack tech (19 technos), score présence web 0-100.' },
      { tag: 'feature', text: 'Page /ads : 3 onglets — Facebook Lead Ads (OAuth Meta), Google Ads (guide UTM), Attribution marketing.' },
      { tag: 'feature', text: 'Dashboard Attribution : 4 KPIs + tableau par source (CPL, taux RDV, délai, pipeline).' },
      { tag: 'feature', text: 'Alerte Speed-to-Lead dynamique : rouge si délai > 5 min, vert si optimal.' },
    ],
  },
  {
    version: 'v3.36.0',
    date: '23 juin 2026 à 14h00',
    title: 'Déduplication & Speed-to-Lead',
    highlights: [
      { tag: 'feature', text: 'Déduplication multi-source : détection automatique par domaine, téléphone et nom (algorithme Levenshtein). Tab "Doublons" dans /acquisition.' },
      { tag: 'feature', text: 'Fusion intelligente : le lead avec le plus de champs remplis devient le principal, les doublons sont archivés.' },
      { tag: 'feature', text: 'Widget Speed-to-Lead dans /acquisition : timer SLA par lead entrant (vert < 2h, ambre < 24h, rouge > 24h).' },
      { tag: 'feature', text: 'Nouveaux types séquences multicanales : call, sms, ab_test avec scripts et variantes.' },
      { tag: 'feature', text: '150+ nouvelles clés i18n (FR/EN/DE) pour les modules v4.5.' },
    ],
  },
  {
    version: 'v3.35.1',
    date: '23 juin 2026 à 12h30',
    title: 'Icônes officielles',
    highlights: [
      { tag: 'fix',    text: 'Résolution des bugs d\'icônes géantes (ex: Teams) qui brisaient la mise en page.' },
      { tag: 'design', text: 'Migration vers les logos officiels @thesvg/react (Gmail, Drive, Maps, Zoom, SharePoint, Teams, Todoist, Notion, Slack, Tasks, Meet).' },
      { tag: 'design', text: 'Composant Google Contacts haute fidélité.' },
    ],
  },
  {
    version: 'v3.35.0',
    date: '23 juin 2026 à 12h00',
    title: 'Bibliothèque d\'icônes premium',
    highlights: [
      { tag: 'design', text: 'Intégration globale de @thesvg/react — icônes officielles hautes fidélité pour tous les services connectés.' },
      { tag: 'design', text: 'Icônes personnalisées pour Gmail, Google Maps, Google Chat, Drive, Calendar, Slack, GitHub, Todoist, Teams.' },
      { tag: 'design', text: 'Cartes de configuration dans Paramètres : suppression des arrière-plans colorés au profit de boîtes neutres.' },
      { tag: 'design', text: 'Fiches lead : logos Gmail, Google Maps, Google Calendar sur les onglets et actions.' },
    ],
  },
  {
    version: 'v3.34.0',
    date: '23 juin 2026 à 10h00',
    title: 'Dashboard premium',
    highlights: [
      { tag: 'design', text: 'Alignement esthétique du Dashboard sur la charte graphique premium.' },
      { tag: 'design', text: 'Suppression des ombres surélevées au profit du design plat et bordures hairline #e5e5e0.' },
      { tag: 'design', text: 'Arrière-plan grille Cult UI (bg-grid-pattern-20).' },
      { tag: 'design', text: 'Couleurs accentuation uniformisées en vert émeraude (#059669) sur tous les widgets.' },
      { tag: 'design', text: 'Mise à jour des 17 widgets du cockpit (objectifs, agenda, séquences, tâches, suggestions IA, stats…).' },
    ],
  },
  {
    version: 'v3.33.0',
    date: '23 juin 2026 à 08h00',
    title: 'Refonte 5 pages clés',
    highlights: [
      { tag: 'design', text: 'Refonte Premium : Agenda, Acquisition, Comptes, Skills IA, Automations — conformes à la charte Cult UI.' },
      { tag: 'design', text: 'Grille bg-grid-pattern-20 harmonisée sur toutes ces pages.' },
      { tag: 'design', text: 'Suppression des ombres, typographie dense, accents vert #059669 uniformes.' },
      { tag: 'feature', text: 'i18n complète : textes en dur remplacés par des clés dynamiques (FR/EN/DE).' },
      { tag: 'feature', text: 'Agenda : calendrier mensuel localisé + vues Semaine/Jour horaires.' },
    ],
  },
  {
    version: 'v3.32.0',
    date: '23 juin 2026 à 06h00',
    title: 'Partage lead & Export Drive',
    highlights: [
      { tag: 'fix',     text: 'Lien de partage lead corrigé — share-preview réécrit avec 2 requêtes Supabase séparées. Fonctionne maintenant.' },
      { tag: 'design',  text: 'Aperçu partagé : note Google (étoiles), badges ville/catégorie, score en vert Minerva.' },
      { tag: 'feature', text: 'Export Google Drive — documents exportés en Google Docs (HTML→Docs) avec mise en forme complète.' },
      { tag: 'feature', text: 'Intégrations Google — Google Contacts et Google Tasks ajoutés. Panneau Google Workspace unifié.' },
      { tag: 'fix',     text: 'Génération de messages — fallback Anthropic Haiku si le modèle configuré échoue.' },
      { tag: 'feature', text: 'Migration SQL v4.5 — colonnes enrichissement leads + correction RLS table lead_shares.' },
    ],
  },
  {
    version: 'v3.31.0',
    date: '22 juin 2026 à 23h55',
    title: 'Chat images & Nettoyage codebase',
    highlights: [
      { tag: 'feature', text: 'Lightbox plein écran dans Messages — cliquer une image ouvre un overlay plein écran.' },
      { tag: 'feature', text: 'Score v2 auto-persisté — calculé et sauvegardé à l\'ouverture d\'une fiche lead.' },
      { tag: 'fix',     text: 'Nettoyage codebase — 71 fichiers supprimés (scratch-*.cjs, screenshots, 13 composants démo). Migrations SQL déplacées.' },
      { tag: 'fix',     text: 'RLS fix documenté — Policies leads_workspace / tasks_workspace identifiées et supprimées. Données restaurées.' },
    ],
  },
  {
    version: 'v3.30.0',
    date: '22 juin 2026 à 23h10',
    title: 'Scoring v2 multidimensionnel',
    highlights: [
      { tag: 'feature', text: 'Scoring v2 — Score 0-100 sur 4 axes : ICP Fit, Engagement (pipeline + température), Urgence, Revenu.' },
      { tag: 'feature', text: 'Carte score dans la fiche lead — 4 barres de progression colorées avec valeurs individuelles /25.' },
      { tag: 'feature', text: 'API /api/leads/score — calcule et sauvegarde les 4 sous-scores + log score_updated dans lead_events.' },
      { tag: 'feature', text: 'Migration SQL — 4 nouvelles colonnes : score_icp, score_engagement, score_urgency, score_revenue.' },
    ],
  },
  {
    version: 'v3.29.0',
    date: '22 juin 2026 à 22h55',
    title: 'Images & Emoji dans le chat',
    highlights: [
      { tag: 'feature', text: 'Rendu natif des images et GIFs — s\'affichent correctement, clic pour plein écran.' },
      { tag: 'feature', text: 'Emoji picker — 45 emojis en 3 catégories (Smileys, Gestes, Symboles).' },
      { tag: 'feature', text: 'Upload image/GIF avec compression auto (max 800px, qualité 70%). Aperçu avant envoi.' },
      { tag: 'feature', text: 'Queue Processor Outreach — vérifie fenêtre d\'envoi et quota, envoie 1 email HTML par workspace par run.' },
    ],
  },
  {
    version: 'v3.28.0',
    date: '23 juin 2026 à 00h05',
    title: 'Générateur de propositions',
    highlights: [
      { tag: 'feature', text: 'Générateur de proposition interactif — sélecteur de services, ajustement de prix en direct, lignes personnalisées.' },
      { tag: 'feature', text: 'Calculateur financier — Total HT, taxes (14.975% défaut QC) et TTC en temps réel.' },
      { tag: 'feature', text: 'Aperçu A4 format papier — rendu en direct style impression professionnel.' },
      { tag: 'feature', text: 'Export PDF natif Desktop via printToPdf Electron.' },
      { tag: 'feature', text: 'Enrichissement B2B — scraping site, identification du décideur, pitch d\'appel québécois.' },
    ],
  },
  {
    version: 'v3.27.4',
    date: '22 juin 2026 à 19h45',
    title: 'Correctifs OpenRouter & Scraping',
    highlights: [
      { tag: 'fix', text: 'Modèles retirés d\'OpenRouter — redirection automatique vers openrouter/free pour éviter les 404.' },
      { tag: 'fix', text: 'Scraping site web — élimination automatique des balises Markdown brutes en cas de fallback.' },
      { tag: 'fix', text: 'Paramètres IA — routeur automatique libre d\'OpenRouter proposé par défaut.' },
    ],
  },
  {
    version: 'v3.27.3',
    date: '22 juin 2026 à 19h30',
    title: 'Runtime API Chat',
    highlights: [
      { tag: 'fix', text: 'Runtime API Chat — changement de Edge vers Node.js pour résoudre les erreurs de bundle Anthropic SDK.' },
      { tag: 'fix', text: 'Streaming SSE maintenu sans interruption pour les utilisateurs.' },
    ],
  },
  {
    version: 'v3.27.2',
    date: '22 juin 2026 à 19h15',
    title: 'Migration Next.js 16 Proxy',
    highlights: [
      { tag: 'fix', text: 'Migration middleware.ts vers proxy.ts (Next.js 16) — résout les erreurs de bundle Vercel.' },
      { tag: 'fix', text: 'Bascule vers Node.js natif pour la compatibilité avec toutes les dépendances.' },
      { tag: 'fix', text: 'Nettoyage config Webpack obsolète dans next.config.ts.' },
    ],
  },
  {
    version: 'v3.27.1',
    date: '22 juin 2026 à 18h50',
    title: 'Configuration Vercel & OpenRouter',
    highlights: [
      { tag: 'fix', text: 'OPENROUTER_API_KEY enregistrée sur Vercel (Production, Preview, Development).' },
      { tag: 'fix', text: 'Clé OpenRouter ajoutée dans .env.production.local pour les tests locaux.' },
      { tag: 'fix', text: 'Liaison IA opérationnelle et validée.' },
    ],
  },
  {
    version: 'v3.27.0',
    date: '22 juin 2026 à 22h45',
    title: 'Moteur IA unifié',
    highlights: [
      { tag: 'feature', text: 'lib/ai.ts — moteur IA prenant en charge OpenRouter, Anthropic avec cascade intelligente des clés API.' },
      { tag: 'feature', text: 'Streaming SSE standardisé — format delta OpenAI pour compatibilité client.' },
      { tag: 'feature', text: 'Refactoring 10 routes d\'API vers le helper unifié.' },
      { tag: 'feature', text: 'SQLite Electron — colonnes openrouter_key, ai_provider, ai_model avec sync bidirectionnel Supabase.' },
      { tag: 'fix',     text: 'Correctifs TypeScript — déstructuration contextUser + typage index traductions. Compilation réussie.' },
    ],
  },
  {
    version: 'v3.26.0',
    date: '22 juin 2026 à 20h00',
    title: 'Centre d\'acquisition',
    highlights: [
      { tag: 'feature', text: 'Centre d\'Acquisition (/acquisition) — tour de contrôle des leads entrants, filtrables par source. Badge SLA coloré.' },
      { tag: 'feature', text: 'Actions rapides — "Qualifier" passe un lead de New → Contacted sans ouvrir la fiche.' },
      { tag: 'feature', text: 'Timeline unifiée par lead — historique chronologique dans la fiche lead (lead_events + événements synthétiques).' },
      { tag: 'feature', text: 'Colonnes DB : lead_source_type, utm_*, Table lead_events. Migration SQL v4.1 incluse.' },
    ],
  },
  {
    version: 'v3.25.0',
    date: '22 juin 2026 à 18h00',
    title: 'Temps réel & Présence en ligne',
    highlights: [
      { tag: 'feature', text: 'Leads & Tâches en temps réel — Supabase Realtime déclenche des mises à jour immédiates sans rechargement.' },
      { tag: 'feature', text: 'Présence en ligne — détection des membres connectés avec page active et avatar.' },
      { tag: 'feature', text: 'Edge Runtime — /api/chat, /api/integrations/slack et notion en Edge Runtime Vercel.' },
      { tag: 'feature', text: 'Web Push (Service Worker) — gestion push + notificationclick. Endpoint /api/push/subscribe.' },
    ],
  },
  {
    version: 'v3.24.0',
    date: '22 juin 2026 à 16h00',
    title: 'Canvas WYSIWYG & Fenêtre flottante',
    highlights: [
      { tag: 'feature', text: 'Canvas TipTap — éditeur de texte riche style Word/Notion. Gras, Italique, Titres sans écrire du Markdown.' },
      { tag: 'feature', text: 'Fenêtre flottante — bouton "Détacher" : canvas déplaçable par glisser-déposer. "Ancrer" le ramène.' },
      { tag: 'feature', text: 'Sauvegarde directe dans la Bibliothèque — bouton "Bibliothèque" dans l\'en-tête.' },
      { tag: 'design',  text: 'Indicateur de réflexion — icône Minerva pulse pendant la génération IA.' },
      { tag: 'feature', text: 'Points de contrôle — marque-page sur chaque message pour restaurer la conversation.' },
    ],
  },
  {
    version: 'v3.23.0',
    date: '22 juin 2026 à 14h30',
    title: 'Slack & Notion connecteurs',
    highlights: [
      { tag: 'feature', text: 'Slack connector — webhook entrant dans Paramètres. Toutes les notifications poussées dans votre canal.' },
      { tag: 'feature', text: 'Notion connector — token + ID de base pour exporter les documents Canvas vers Notion.' },
      { tag: 'feature', text: 'Claude Sonnet par défaut — modèle assistant mis à jour. Plus de réponses simulées.' },
      { tag: 'fix',     text: 'Boutons Services — derniers boutons oranges corrigés en vert (#047857).' },
    ],
  },
  {
    version: 'v3.22.0',
    date: '22 juin 2026 à 12h56',
    title: 'Comptes / Entreprises vue 360°',
    highlights: [
      { tag: 'feature', text: 'Comptes / Entreprises (/accounts) — leads groupés par entreprise. Vue détaillée par compte : contacts, pipeline cumulé, visites terrain et notes.' },
      { tag: 'feature', text: 'Accès rapide depuis la sidebar dans la section CRM.' },
    ],
  },
  {
    version: 'v3.21.0',
    date: '22 juin 2026 à 12h52',
    title: 'Galerie de preuves de visite',
    highlights: [
      { tag: 'feature', text: 'Galerie des preuves (/field/gallery) — photos terrain regroupées par mois, avec résultat, contact, niveau d\'intérêt et aperçu plein écran.' },
      { tag: 'feature', text: 'Accessible depuis Mode Terrain — bouton "Preuves" dans l\'en-tête de tournée.' },
    ],
  },
  {
    version: 'v3.20.0',
    date: '22 juin 2026 à 12h48',
    title: 'Agenda : vues Semaine & Jour',
    highlights: [
      { tag: 'feature', text: 'Vues Semaine et Jour — grille horaire 7h–20h avec rendez-vous placés à leur heure.' },
      { tag: 'feature', text: 'Création rapide — cliquez sur un créneau horaire pour planifier un RDV à cette heure.' },
    ],
  },
  {
    version: 'v3.19.0',
    date: '22 juin 2026 à 12h45',
    title: 'Skills partagées & Contexte CRM',
    highlights: [
      { tag: 'feature', text: 'Skills partagées par équipe — compétences activées partagées au niveau du workspace.' },
      { tag: 'feature', text: '@ contexte CRM dans le chat — tapez @ pour injecter vos vrais leads, pipeline, tâches.' },
    ],
  },
  {
    version: 'v3.18.0',
    date: '22 juin 2026 à 12h37',
    title: 'Roadmap mise à jour',
    highlights: [
      { tag: 'feature', text: 'Roadmap — tout ce qui a été livré (v3.0→v3.17) marqué "Disponible".' },
      { tag: 'feature', text: 'Onglet "Prévu" : intégrations Slack/Notion/SharePoint, Comptes/Entreprises, timeline unifiée.' },
    ],
  },
  {
    version: 'v3.17.0',
    date: '22 juin 2026 à 12h25',
    title: 'Vision & Qualité du code',
    highlights: [
      { tag: 'feature', text: 'Modèle Vision — joindre une image dans l\'Assistant ; envoyée à un modèle vision, aperçu dans la conversation.' },
      { tag: 'feature', text: 'Google Connect dans Intégrations — design soigné deux volets depuis la page Intégrations.' },
      { tag: 'fix',     text: 'Qualité — résolution des 262 erreurs ESLint. Lint : 0 erreur.' },
    ],
  },
  {
    version: 'v3.16.0',
    date: '22 juin 2026 à 11h51',
    title: 'Vert partout — Zéro orange',
    highlights: [
      { tag: 'design', text: 'Balayage global — tout l\'orange de l\'application (28 fichiers) remplacé par le vert de marque.' },
      { tag: 'design', text: 'DESIGN.md et CLAUDE.md — vert #059669 défini comme unique accent par défaut.' },
    ],
  },
  {
    version: 'v3.15.0',
    date: '22 juin 2026 à 11h44',
    title: 'Accent vert harmonisé',
    highlights: [
      { tag: 'design', text: 'Pages Aujourd\'hui, Agenda, Services, Configuration, Automations — orange → vert de marque.' },
    ],
  },
  {
    version: 'v3.14.0',
    date: '22 juin 2026 à 11h41',
    title: 'Page Skills en vert',
    highlights: [
      { tag: 'design', text: 'Page Skills — accent orange → vert de marque.' },
      { tag: 'design', text: 'Puces de compétences @ dans le chat — accent vert.' },
    ],
  },
  {
    version: 'v3.13.0',
    date: '22 juin 2026 à 11h35',
    title: 'Skills cloud',
    highlights: [
      { tag: 'feature', text: 'Skills synchronisées dans Supabase — disponibles sur tous vos appareils.' },
      { tag: 'feature', text: 'Compétences par défaut auto-initialisées à la première utilisation.' },
    ],
  },
  {
    version: 'v3.12.0',
    date: '22 juin 2026 à 11h23',
    title: 'Nouvelle page Skills',
    highlights: [
      { tag: 'feature', text: 'Page Skills — activez des compétences IA par packs (Ventes, Marketing, Produit, Données, Opérations, Support).' },
      { tag: 'feature', text: 'Créateur de compétences — créez vos propres compétences avec instructions sur mesure.' },
      { tag: 'feature', text: '@ dans le chat — insérez une compétence pour injecter ses instructions dans la requête.' },
    ],
  },
  {
    version: 'v3.11.0',
    date: '22 juin 2026 à 11h16',
    title: 'Titres IA & Modèle confirmé',
    highlights: [
      { tag: 'feature', text: 'Titres de discussion générés par l\'IA à partir du premier échange.' },
      { tag: 'feature', text: 'Modèle IA confirmé — "Minerva AI (Llama 3.3 70B)" via OpenRouter, provider transmis explicitement.' },
    ],
  },
  {
    version: 'v3.10.0',
    date: '22 juin 2026 à 11h11',
    title: 'Connexion Google fiabilisée',
    highlights: [
      { tag: 'feature', text: 'Nouvelle fenêtre de connexion Google — design soigné en deux volets, réutilisable depuis l\'inbox.' },
      { tag: 'fix',     text: 'URI de redirection OAuth canonique — évite les erreurs "redirect_uri_mismatch".' },
    ],
  },
  {
    version: 'v3.9.0',
    date: '22 juin 2026 à 01h23',
    title: 'Page de prise de RDV',
    highlights: [
      { tag: 'feature', text: 'Page dédiée /agenda/new — titre, date, heure, durée, lead associé, notes, synchronisation Google.' },
      { tag: 'design',  text: 'Agenda — charte graphique respectée (tokens couleurs, rayons, typographie).' },
    ],
  },
  {
    version: 'v3.8.0',
    date: '22 juin 2026 à 01h19',
    title: 'Roadmap cochable & Notifications',
    highlights: [
      { tag: 'feature', text: 'Vérifications cochables dans la Roadmap — compteur d\'avancement par phase (état sauvegardé).' },
      { tag: 'feature', text: 'Notification quotidienne des relances suggérées par l\'intelligence comportementale.' },
    ],
  },
  {
    version: 'v3.7.0',
    date: '22 juin 2026 à 01h14',
    title: 'Notifications de mention & Plein écran',
    highlights: [
      { tag: 'feature', text: 'Notifications de mention — @mention dans le chat d\'équipe → notification automatique.' },
      { tag: 'feature', text: 'Images en plein écran dans le chat d\'équipe.' },
    ],
  },
  {
    version: 'v3.6.0',
    date: '22 juin 2026 à 00h46',
    title: 'Intelligence comportementale activée',
    highlights: [
      { tag: 'feature', text: 'Intelligence comportementale — bilans hebdomadaires + relances suggérées désormais pleinement fonctionnels.' },
      { tag: 'feature', text: 'Bilans hebdomadaires — IA génère un résumé d\'opportunités (leads à relancer) le week-end.' },
      { tag: 'feature', text: 'Relances suggérées dans Today — email de réactivation, appel, audit de site avec création de tâche en 1 clic.' },
    ],
  },
  {
    version: 'v3.5.0',
    date: '22 juin 2026 à 00h41',
    title: 'Activité équipe & Services',
    highlights: [
      { tag: 'feature', text: 'Activité de l\'équipe — widget temps réel des événements workspace (nouveaux leads, deals, tâches terminées).' },
      { tag: 'design',  text: 'Services & Tarifs — conformité charte (typographie unifiée).' },
      { tag: 'design',  text: 'Automations — icônes propres (plus d\'emojis), couleurs alignées.' },
    ],
  },
  {
    version: 'v3.4.0',
    date: '22 juin 2026 à 00h35',
    title: 'Canvas automatique & OpenRouter',
    highlights: [
      { tag: 'feature', text: 'Canvas automatique — l\'assistant ouvre le Canvas seul quand il rédige un document substantiel.' },
      { tag: 'feature', text: 'OpenRouter intégré — clé configurée, modèles accessibles de façon fiable.' },
      { tag: 'feature', text: 'Modèle Vision (texte + image) — nouveau modèle sélectionnable dans l\'assistant.' },
    ],
  },
  {
    version: 'v3.3.0',
    date: '22 juin 2026 à 00h29',
    title: 'Boîte de réception réparée',
    highlights: [
      { tag: 'fix',     text: 'Inbox — détection Google corrigée : reconnue quelle que soit la méthode de connexion. Fils Gmail affichés.' },
      { tag: 'fix',     text: 'Lecture des fils — détail et suggestions IA fonctionnent quelle que soit la connexion.' },
      { tag: 'design',  text: 'Conformité design — écran de connexion inbox conforme à DESIGN.md.' },
    ],
  },
  {
    version: 'v3.2.0',
    date: '22 juin 2026 à 00h22',
    title: 'Nouveau Agenda',
    highlights: [
      { tag: 'feature', text: 'Calendrier mensuel complet accessible en permanence depuis la sidebar.' },
      { tag: 'feature', text: 'Prise de rendez-vous — cliquez sur une date pour créer un RDV (titre, heure, durée, lead associé).' },
      { tag: 'feature', text: 'Notification automatique de l\'équipe à chaque nouveau RDV.' },
      { tag: 'feature', text: 'Synchronisation Google Agenda — ajout direct si Google est connecté.' },
      { tag: 'feature', text: 'Tâche Todoist automatique — création à l\'heure du rendez-vous si configuré.' },
    ],
  },
  {
    version: 'v3.1.0',
    date: '22 juin 2026 à 00h16',
    title: 'Mode Terrain amélioré',
    highlights: [
      { tag: 'fix',     text: 'Compte-rendu de visite — page "Enregistrer le passage" scrollable. Bouton Confirmer toujours atteignable.' },
      { tag: 'feature', text: 'Champs Contact rencontré + Niveau d\'intérêt (Chaud / Tiède / Froid).' },
      { tag: 'feature', text: 'Photo preuve — joindre une photo de la visite comme preuve.' },
      { tag: 'feature', text: 'Notification automatique de l\'équipe à la confirmation d\'un passage.' },
    ],
  },
  {
    version: 'v3.0.0',
    date: '22 juin 2026 à 00h08',
    title: 'Base solide v3.0',
    highlights: [
      { tag: 'fix',     text: 'Correctif date changelog — "Invalid Date" résolu.' },
      { tag: 'design',  text: 'Page Gérer le rôle refondue — look premium : carte membre, 3 niveaux d\'accès, aperçu des modules.' },
      { tag: 'feature', text: 'Mode Terrain — "Prochain arrêt", lien Google Maps, bouton "Prévenir l\'équipe", conformité DESIGN.md.' },
      { tag: 'feature', text: 'Website Scraper IA — extraction + description commerciale par IA, réinjectée dans scripts et emails.' },
      { tag: 'feature', text: 'Notifications équipe fonctionnelles — /api/notifications/team diffuse à tous les membres actifs.' },
      { tag: 'fix',     text: 'Membres en double corrigés — déduplication par utilisateur, propriétaire n\'apparaît plus deux fois.' },
      { tag: 'feature', text: 'Chat équipe enrichi — emoji picker, images/GIF, avatars réels des membres.' },
    ],
  },
  {
    version: 'v2.99.0',
    date: '21 juin 2026 à 23h59',
    title: 'Statuts membres & Présence',
    highlights: [
      { tag: 'feature', text: 'Statuts membres — Invité (en attente), A rejoint, Accès app. Badge "En attente" ambré.' },
      { tag: 'feature', text: 'Présence en ligne — point vert + label "● En ligne" pour les membres actifs.' },
      { tag: 'feature', text: 'Toast de bienvenue — notification temps réel quand un membre rejoint le workspace.' },
    ],
  },
  {
    version: 'v2.98.0',
    date: '21 juin 2026 à 23h40',
    title: 'Carte, Automations & Notifications',
    highlights: [
      { tag: 'fix',     text: 'Carte — clic lead dans la sidebar → flyTo immédiat sans double-clic.' },
      { tag: 'fix',     text: 'Automation — "Nouvelle Règle" redirige vers builder 4 étapes.' },
      { tag: 'feature', text: 'Notifications desktop — rappels quotidiens (tâches en retard, pipeline vide). Electron + Web.' },
      { tag: 'feature', text: 'Mode Terrain /field/[plan]/prepare/[lead] — script IA, notes précédentes, formulaire pré-notes.' },
      { tag: 'feature', text: 'Templates email — CRUD complet, A/B test, tags, tokens variables, stats.' },
    ],
  },
  {
    version: 'v2.97.0',
    date: '21 juin 2026 à 18h00',
    title: 'Booking public & Rôles équipe',
    highlights: [
      { tag: 'feature', text: 'Page publique /book/[username] — calendrier, créneaux freebusy Google, formulaire, confirmation animée.' },
      { tag: 'feature', text: '/team/member/[id] — assigner rôle défaut ou rôle custom avec 19 toggles, prévisualisation des accès.' },
      { tag: 'fix',     text: 'Fixes Supabase — migration v296 : 8 colonnes/tables manquantes. order by invited_at corrigé.' },
    ],
  },
  {
    version: 'v2.96.0',
    date: '21 juin 2026 à 12h00',
    title: 'Invitation & Rôles personnalisés',
    highlights: [
      { tag: 'design',  text: 'Page /join redesignée — animations CSS, avatar workspace, confetti, badge rôle, modules accessibles.' },
      { tag: 'feature', text: 'Quitter une équipe — bouton visible pour les non-propriétaires. Accès révoqué immédiatement.' },
      { tag: 'feature', text: 'Realtime team pages — refresh automatique à l\'invitation ou à l\'arrivée d\'un membre.' },
      { tag: 'feature', text: 'Sidebar filtrée par rôle — /api/team/my-permissions masque les entrées inaccessibles.' },
      { tag: 'feature', text: 'Rôles personnalisés — onglet "Rôles & Permissions" dans /team : CRUD complet de rôles (nom, couleur, 19 modules).' },
    ],
  },
  {
    version: 'v2.95.0',
    date: '21 juin 2026',
    title: 'Facturation & Partage lead',
    highlights: [
      { tag: 'feature', text: 'Facturation — module complet 5 onglets : Abonnement, Forfaits, Utilisation, Paiement, Factures.' },
      { tag: 'feature', text: 'Lead partage public — lien /lead-preview/[token] accessible sans compte. Page lecture seule.' },
      { tag: 'feature', text: 'Token invite sécurisé — redirect chain propre /join/[token] → login → retour /join/[token].' },
      { tag: 'feature', text: 'Plans Minerva — 4 plans : Gratuit, Pro (29$/mois), Business (79$/mois), Entreprise.' },
    ],
  },
  {
    version: 'v2.94.0',
    date: '21 juin 2026',
    title: 'Canvas & Invitations par lien',
    highlights: [
      { tag: 'feature', text: 'Canvas — boutons fonctionnels : Notes horodatées, Historique de documents, Taille de texte (S/M/L).' },
      { tag: 'feature', text: 'Canvas — Save to Library après chaque export (HTML / MD / TXT).' },
      { tag: 'feature', text: 'Services & Tarifs — 3 onglets : Catalogue, Forfaits, Devis (export HTML imprimable).' },
      { tag: 'feature', text: 'Invitations par lien — token unique à partager. Page /join/[token] pour l\'acceptation.' },
      { tag: 'feature', text: 'IA — 7 Action Pills avec prompts contextuels (vrais leads, pipeline, tâches en retard).' },
    ],
  },
  {
    version: 'v2.93.0',
    date: '21 juin 2026',
    title: 'Fiche lead enrichie & Kanban DnD',
    highlights: [
      { tag: 'feature', text: 'Fiche lead — étoiles (rating), avis, téléphone cliquable, site web, lien Google Maps directement visibles.' },
      { tag: 'feature', text: 'Pipeline Kanban drag & drop natif (HTML5). Colonne cible surlignée. Flèches ← → toujours disponibles.' },
      { tag: 'feature', text: 'Carte — clic lead → FlyTo animé (zoom 15). Auto-route OSRM dès 2+ waypoints (debounce 900ms).' },
      { tag: 'feature', text: 'Today — onglet "Boîte de réception" pour accéder à Gmail sans quitter Today.' },
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

          <TagLegend />
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
                        <TagBadge tag={h.tag} />
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
