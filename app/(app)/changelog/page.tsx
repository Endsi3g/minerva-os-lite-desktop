'use client';

import React, { useEffect } from 'react';
import { Megaphone, Calendar, CheckCircle, Bug, Sparkles, Palette } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { TranslationKey } from '@/lib/translations';

type HighlightTag = 'fix' | 'feature' | 'design';
type HighlightItem = string | { tag: HighlightTag; text: string };

interface ChangelogVersion {
  version: string;
  date: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  highlights: HighlightItem[];
}

const TAG_CONFIG: Record<HighlightTag, { label: string; description: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  fix:     { label: 'Correctif',  description: 'bug ou problème résolu',      bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: Bug      },
  feature: { label: 'Nouveauté',  description: 'nouvelle fonctionnalité',     bg: '#f0fdf4', text: '#059669', border: '#bbf7d0', icon: Sparkles },
  design:  { label: 'Design',     description: 'amélioration visuelle ou UX', bg: '#eef2ff', text: '#6366f1', border: '#c7d2fe', icon: Palette  },
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
          <span className="text-[10px] text-neutral-400 hidden sm:inline">— {cfg.description}</span>
        </span>
      ))}
    </div>
  );
}

export default function ChangelogPage() {
  useEffect(() => { document.title = 'Changelog — Minerva'; }, []);
  const { t } = useLanguage();

  const versions: ChangelogVersion[] = [
    {
      version: 'v4.5.0',
      date: '2026-06-28',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'design', text: '[01:58] Changelog — badges de type remplacés : les étiquettes texte (Fix / Nouveauté / Design) deviennent des icônes circulaires 18px (Bug rouge, Sparkles vert, Palette indigo). Légende TagLegend placée entre l\'en-tête et la timeline. Description masquée sous sm (icône + label seulement sur mobile). Attributs aria-label + title pour l\'accessibilité.' },
        { tag: 'fix', text: '[01:58] Leads — restauration de l\'arrière-plan crème chaud (#fafaf8) avec superposition de grille. Correction d\'une régression qui avait remplacé le fond par du blanc uni.' },
      ],
    },
    {
      version: 'v4.4.0',
      date: '2026-06-28',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'design', text: 'Charts analytics — polish visuel complet : axes, grilles, tooltips et couleurs alignés avec le design system (#059669 vert Minerva).' },
        { tag: 'feature', text: 'Mémoïsation des re-renders sur les composantes lourdes (graphiques, tableaux) via useMemo et React.memo pour éliminer les calculs redondants.' },
        { tag: 'design', text: 'Iconographie unifiée : remplacement des icônes génériques par des variantes Lucide cohérentes avec la charte visuelle.' },
        { tag: 'feature', text: 'Messages toast améliorés : description contextuelle, durée 5 secondes, icône de statut colorée.' },
        { tag: 'feature', text: 'Titres de page clients : chaque vue (lead, projet, campagne) met à jour document.title avec le nom de l\'entité pour un meilleur historique navigateur.' },
      ],
    },
    {
      version: 'v4.3.0',
      date: '2026-06-28',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'feature', text: 'Nouvelles étapes pipeline : "Proposition envoyée" et "Négociation" entre Meeting Booked et Won. 2 nouvelles colonnes Kanban avec codes couleur (violet #7c3aed et ambre #d97706).' },
        { tag: 'feature', text: 'Onglet Prévisions dans le pipeline : KPIs (taux de closing, valeur moy. deal, pipeline 30j pondéré), graphique barres par mois pondéré par probabilité, tableau des deals à clôturer.' },
        { tag: 'feature', text: 'Builder de propositions multi-sections : 5 sections éditables (Présentation, Problème identifié, Solution proposée, Prix QC, Modalités) avec génération IA par section. Calcul taxes QC automatique (TPS 5% + TVQ 9.975%).' },
        { tag: 'feature', text: 'Export PDF proposition — Electron : dialogue de sauvegarde natif. Web : impression navigateur. Format A4 professionnel avec en-tête vert Minerva.' },
        { tag: 'feature', text: 'Persistance propositions : table "proposals" sauvegarde chaque section. Bouton "Marquer envoyée" passe le lead en "Proposition envoyée" automatiquement.' },
        { tag: 'feature', text: 'IA par section de proposition : /api/proposals/generate-section génère Présentation, Problème identifié, Solution proposée ou Modalités en contexte du lead (niche, ville, description site).' },
      ],
    },
    {
      version: 'v4.2.0',
      date: '2026-06-28',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'design', text: 'SVG inline — icônes Instagram et Facebook converties de requêtes HTTP externes vers des composants JSX inline. Zéro requête réseau supplémentaire sur la fiche lead, rendu immédiat.' },
        { tag: 'feature', text: 'Singleton admin Supabase — client service-role partagé entre toutes les requêtes serveur. Élimine la réinstanciation par requête et réduit l\'overhead de connexion.' },
        { tag: 'feature', text: 'Correction N+1 team/members — profils chargés en une seule requête IN (user_id) au lieu de N requêtes individuelles. Idem pour les ownerName des workspaces.' },
        { tag: 'feature', text: 'Cache serveur (lib/server-cache.ts) + cache client (lib/fetch-cache.ts) — TTL 30-60s pour /api/team/members et /api/team/my-permissions. Invalidation automatique sur mutation.' },
      ],
    },
    {
      version: 'v4.1.0',
      date: '2026-06-27',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'design', text: 'Transitions de page — suppression du loader/blur overlay, remplacé par une barre de progression verte fine (#059669) en haut de l\'écran + fade-in 180ms sur le contenu. Respect de prefers-reduced-motion.' },
        { tag: 'feature', text: 'Skeleton chargement — tableau Leads affiche 8 lignes animées (pulse) pendant le chargement initial des données, grâce au flag isDataReady exposé par ReachContext.' },
        { tag: 'design', text: 'Polices — correction du subset Inter (suppression de "sans-serif" invalide) + display: swap sur Inter et JetBrains Mono pour éliminer les décalages de mise en page (CLS) au chargement.' },
        { tag: 'feature', text: 'Recherche leads — debounce 220ms (plus d\'appel à chaque frappe). Historique des recherches récentes (max 5, localStorage) affiché dans un dropdown au focus sur le champ vide. Suppression individuelle de chaque terme. Touche Escape pour effacer.' },
        { tag: 'feature', text: 'AlertDialog — nouveau composant (radix-ui AlertDialog) remplace les window.confirm() natifs du navigateur. Suppression en masse de leads : dialog avec titre, description de conséquence et bouton libellé par l\'action ("Supprimer les N prospects").' },
        { tag: 'design', text: 'Fil d\'Ariane — sur la fiche lead (/leads/[id]), le breadcrumb affiche maintenant le vrai nom du business (ex. "Cabinet Dentaire Dr. Laurent") au lieu de "Details", avec troncature à 28 caractères.' },
      ],
    },
    {
      version: 'v4.0.0',
      date: '2026-06-27',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'feature', text: 'Automatisation complète — enrichissement batch (/api/leads/enrich-batch), cron nocturne à 2h, auto-email après enrichissement. L\'app peut prospecter et contacter des leads sans intervention.' },
        { tag: 'feature', text: 'Tags leads — champ tags[] sur chaque lead. Auto-tags depuis statut CRM (@Contacté, @Gagné, @RDV fixé, @Perdu) et depuis les réponses email classifiées (Intéressé, RDV demandé, Pas intéressé, Demande info, Absent). Tags libres manuels depuis la fiche lead.' },
        { tag: 'feature', text: 'Paramètres Automations — nouveau panneau dédié avec 4 toggles : Enrichir à l\'import, Enrichissement nocturne, Email auto après enrichissement, Tagger les réponses. Sélecteur de template email et délai configurable.' },
        { tag: 'feature', text: 'Cron enrichissement nocturne — /api/cron/enrich-leads tourne à 2h chaque nuit, traite jusqu\'à 50 leads non enrichis par workspace avec auto_enrich_scheduled activé.' },
        { tag: 'fix', text: 'AI 429 rate limit — retry automatique après 60 secondes pour les appels non-streaming et streaming. Plus de crash immédiat sur modèle saturé.' },
        { tag: 'design', text: 'Page Prospection responsive — grille principale xl:grid-cols-[1fr_300px], min-w-0 sur les colonnes. La page s\'adapte maintenant à la largeur disponible quelle que soit l\'état de la sidebar.' },
      ],
    },
    {
      version: 'v3.47.0',
      date: '2026-06-27',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'fix', text: 'Google auth (systémique) — getAuthStatus renforcé : si status="error" mais des tokens valides existent, l\'état est auto-réparé à "connected". Plus jamais l\'app ne demande de reconnecter Google après une session normale. Fallback sur settings.google_* (tokens legacy) si google_accounts est absent.' },
        { tag: 'fix', text: 'google_tokens upsert — utilise onConflict: "account_id" pour éviter les doublons lors d\'une reconnexion (cause silencieuse de mauvais tokens retournés par maybeSingle).' },
        { tag: 'fix', text: 'Intégrations Google — si déjà connecté dans /integrations, toutes les pages (Inbox, Today, fiche lead Gmail, Agenda, etc.) le détectent sans redemander une autorisation.' },
        { tag: 'design', text: 'Fiche lead — layout responsive corrigé : grid passe en 2 colonnes à xl (≥1280px) au lieu de lg (≥1024px), padding réduit à p-4/p-6, gap entre onglets réduit à gap-1. L\'onglet Outreach ne clippe plus même avec la sidebar étendue.' },
        { tag: 'design', text: 'Google Calendar (Today) + Gmail/Agenda (fiche lead) — remplacent les boutons de connexion bruts par le GoogleConnectModal centralisé (même UX que la page Intégrations).' },
        { tag: 'fix', text: 'AI 429 rate limit — message d\'erreur explicite : "Le modèle IA est temporairement saturé. Réessaie dans 30–60 secondes…" au lieu du message technique brut.' },
        { tag: 'design', text: 'Widget Intelligence comportementale — rapport IA rendu en JSX structuré via MarkdownRenderer (## en-têtes, listes à puces vertes, **gras**, *italique*) au lieu de whitespace-pre-line.' },
        { tag: 'feature', text: 'Changelog — système de tags (Fix / Nouveauté / Design) avec badges colorés sur tous les highlights. Versions v3.43–v3.46 rétroactivement taguées.' },
      ],
    },
    {
      version: 'v3.46.0',
      date: '2026-06-26',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'fix', text: 'Inbox Gmail — resolveAccessToken renforcé avec un 3ème chemin direct sur google_tokens qui contourne le statut error et auto-réinitialise le statut à connected. Le badge "Connecter Google" ne réapparaît plus après reconnexion.' },
        { tag: 'fix', text: 'Google Maps — le lien inline <a> converti en bouton electron-safe (openExternal dans Electron, window.open en web). Plus de blocage dans l\'app desktop.' },
        { tag: 'fix', text: 'Couleurs profil agency — bouton "Réinitialiser" ajouté à côté de "Modifier" pour revenir au vert Minerva (#059669) en un clic, avec retrait immédiat du CSS var --sidebar-primary.' },
        { tag: 'fix', text: 'Attribution leads projets — le picker de projet dans la fiche lead fonctionne correctement (project_id FK, supabase migration v4.3).' },
        { tag: 'feature', text: 'Templates Email — maintenant accessible depuis la sidebar sous "Templates Email" (/email-templates), plus seulement dans les Paramètres.' },
        { tag: 'feature', text: 'Notifications — 4 nouveaux types : email_sent, email_received, lead_aging, scraping_done. Notif in-app + macOS native après envoi depuis le composer. Détection des nouvelles réponses de leads dans l\'inbox (dédup localStorage). Alerte quotidienne si des leads sont inactifs depuis 7+ jours.' },
        { tag: 'feature', text: 'Page Statistiques (/analytics) — 3 onglets : Vue globale (KPI cards, funnel coloré, top niches & villes), Prospection, Activité équipe. Composants existants réutilisés.' },
      ],
    },
    {
      version: 'v3.45.0',
      date: '2026-06-26',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'design', text: 'Refonte responsive globale — suppression de toutes les contraintes de largeur fixes (max-w-5xl, max-w-4xl, max-w-3xl, max-w-6xl) sur toutes les pages. Le contenu s\'étale de manière fluide sur tout l\'écran disponible.' },
        { tag: 'design', text: 'Today, Leads, Pipeline, Analytics, Prospecting, Billing, Campaigns, Webhooks, Sequences, Skills, Agenda, Activities, Services, Ops, Team, Integrations, Personas, Playbooks, Projects, Acquisition, Settings, Download, Help, Client Reports, Field Gallery — padding adaptatif appliqué sur toutes ces pages.' },
        { tag: 'fix', text: 'BottomBlur Messages — le BottomBlur global (fixed, 64px) ne s\'affiche plus sur /messages. Il couvrait l\'input bar et le bas du chat, les rendant inaccessibles.' },
        { tag: 'design', text: 'globals.css — overflow-x: hidden sur html et body pour éliminer les scrollbars parasites. Nouvelles classes : .page-container et .table-responsive.' },
      ],
    },
    {
      version: 'v3.44.0',
      date: '2026-06-26',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'feature', text: 'Projets — association explicite leads ↔ projets : colonne project_id UUID sur les leads (migration v4.3). Les leads s\'assignent via un sélecteur dans la fiche lead.' },
        { tag: 'feature', text: 'Fiche lead — nouveau sélecteur "Projet" dans la sidebar droite (sous Campagne). Lien direct vers la page du projet si assigné.' },
        { tag: 'fix', text: 'Page projet — le compteur et le filtre utilisent project_id explicite (plus de fausse correspondance par texte).' },
        { tag: 'fix', text: 'updateLead : projectId → project_id mappé dans les deux chemins (Electron SQLite et Supabase). Migration SQL v4.3 incluse.' },
      ],
    },
    {
      version: 'v3.43.0',
      date: '2026-06-25',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        { tag: 'fix', text: 'OpenRouter — les modèles Anthropic (claude-*) sont remappés automatiquement vers meta-llama/llama-3.3-70b-instruct:free. L\'assistant IA ne renvoie plus d\'erreur de modèle.' },
        { tag: 'feature', text: 'Email — bannière verte de confirmation après envoi (sujet + destinataire), toast 5s, notification native macOS via Electron.' },
        { tag: 'fix', text: 'Panneau outreach — Score V2 (ICP/Engagement) retiré. La voicemail est activée dès qu\'un numéro est renseigné.' },
        { tag: 'fix', text: 'Bouton Google Maps — utilise shell.openExternal() dans Electron (IPC open-external + preload). Ouvre dans le navigateur système.' },
        { tag: 'feature', text: 'Inbox — onglet "Envoyés" : récupère les fils du label SENT dans Gmail, liés automatiquement aux leads par email.' },
        { tag: 'fix', text: 'Inbox OAuth — resolveAccessToken utilise maybeSingle() (ne crash plus), essaie d\'abord legacy settings, puis google_accounts/google_tokens. Fin du faux "Connecter Google".' },
      ],
    },
    {
      version: 'v3.42.0',
      date: '2026-06-24',
      titleKey: 'changelog.v3_42_0_title' as TranslationKey,
      descKey: 'changelog.v3_42_0_desc' as TranslationKey,
      highlights: [
        "Google Places auto-enrichissement : note, nombre d'avis, résumé IA Google et top 2 avis clients récupérés automatiquement à l'ouverture de chaque fiche lead (cache 7 jours). Clé GOOGLE_PLACES_API_KEY requise.",
        "Section 'Google Insights' dans la fiche lead : affichée entre les réseaux sociaux et les onglets — rating étoiles, résumé IA, extraits d'avis.",
        "Email IA refondu : 1ère phrase = détail SPÉCIFIQUE issu de Google (résumé IA ou avis client). Interdit : 'J'espère que tu vas bien', 'En tant que leader'. Ton ami qui a vraiment fait ses recherches.",
        "Fiche lead mobile : 8 onglets scrollables horizontalement sans troncature (overflow-x-auto, whitespace-nowrap, shrink-0).",
        "Transition fluide entre onglets de la fiche lead (AnimatePresence fade + slide 6px, 160ms ease).",
        "Sidebar — slide depuis la gauche : mobile = motion.x -240→0 (vrai drawer), desktop = width spring + inner slide synchronisé. Icône toggle rotation 180° spring.",
        "Transitions de page globales : AnimatePresence mode='wait' sur le slot {children} (opacity + y:8→0, 180ms). Remplace l'animation CSS statique.",
        "Migration SQL v4.9 : colonnes google_place_id, google_place_data (JSONB), google_enriched_at sur la table leads.",
      ],
    },
    {
      version: 'v3.41.0',
      date: '2026-06-24',
      titleKey: 'changelog.v3_41_0_title' as TranslationKey,
      descKey: 'changelog.v3_41_0_desc' as TranslationKey,
      highlights: [
        "Bottom nav mobile : réduit de 7 à 4 destinations (Accueil, Prospecter, Leads, Assistant) avec retour tactile spring (scale: 0.88). Sheet '+ Plus' pour 6 destinations secondaires avec AnimatePresence slide.",
        "Icônes sidebar : strokeWidth 1.5 inactif / 2 actif, fill='currentColor' quand actif, opacity 60% inactif — poids optique aligné à la hauteur de ligne.",
        "Sidebar — accordion 'Paramètres & Plus' : footer collapsable AnimatePresence (height: 0→auto, 180ms ease). Remplace la liste statique.",
        "Workspace switcher animé : AnimatePresence mode='wait' key={activeWorkspace.id} — fade + slide vertical à chaque changement de workspace.",
        "Barre de filtres leads plus aérée : gap-3, hauteurs unifiées h-8, min-w ajustés. Correction du hover sur 'Mes leads' (orange → vert #047857).",
        "Toutes les animations Framer Motion spring (stiffness 300–400, damping 30, mass 1). Imports depuis 'motion/react' (paquet motion v12.40).",
      ],
    },
    {
      version: 'v3.40.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_40_0_title' as TranslationKey,
      descKey: 'changelog.v3_40_0_desc' as TranslationKey,
      highlights: [
        "Smartlead sequences : onglet 'Outreach' dans chaque fiche lead — bouton Enroller envoie le lead à la campagne Smartlead configurée via API. Score ICP + canaux recommandés (email / voicemail si score ≥ 50).",
        "Voicemail Drop Cowboy : génération de script IA ≤80 mots (~30s) + envoi Ringless Voicemail via API Drop Cowboy. Nécessite numéro de téléphone.",
        "Bibliothèque de preuves (/leverage-library) : CRUD études de cas — titre, niche cible, headline résultat, snippet email. L'IA sélectionne automatiquement la plus pertinente lors de la génération d'email.",
        "Paramètres → Intégrations : cartes Smartlead (API key + campaign ID), Drop Cowboy (username + API key), IA Inbox (toggle auto-réponse + slider seuil de confiance 0-100).",
        "Migration SQL v4.8 : tables leverage_library et voicemail_queue avec RLS ; colonnes settings smartlead_api_key, smartlead_campaign_id, drop_cowboy_username, drop_cowboy_api_key, ai_inbox_auto_reply, ai_inbox_confidence_min.",
      ],
    },
    {
      version: 'v3.39.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_39_0_title' as TranslationKey,
      descKey: 'changelog.v3_39_0_desc' as TranslationKey,
      highlights: [
        "Composer — Email → Brouillon Gmail : l'envoi d'email crée désormais un brouillon dans Gmail (jamais envoyé automatiquement) + bouton 'Sauvegarder' conserve le texte dans l'app (table drafts).",
        "Composer — Onglet DM (Instagram/Facebook) : rédiger un message direct, choisir la plateforme, générer un template IA, copier en 1 clic, accéder directement au profil, sauvegarder comme brouillon.",
        "Description du lead éditable : remplace l'affichage read-only par un Textarea éditable avec bouton 'Enregistrer' qui sauvegarde via updateLead (Supabase/SQLite).",
        "Filtre 'Avis minimum' dans le scraper (prospecting) : slider 0–500 avis, filtrage en temps réel sur reviewsCount, grille de filtres passée en 4 colonnes.",
        "Dernier lead visité en tête de liste : le lead ouvert en dernier est automatiquement remonté en première ligne de la liste des leads, avec badge 'Récemment visité' vert.",
        "Migration SQL v4.7 (addendum) : colonnes subject + draft_type sur la table drafts ; SQLite schema mis à jour (ALTER TABLE safe).",
        "Modèle OpenRouter mis à jour : meta-llama/llama-3.3-70b-instruct:free remplace le modèle deprecated 3.1-8b ; remapping automatique des anciens slugs.",
      ],
    },
    {
      version: 'v3.38.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_38_0_title' as TranslationKey,
      descKey: 'changelog.v3_38_0_desc' as TranslationKey,
      highlights: [
        "Réseaux sociaux sur les fiches leads : section dédiée Instagram/Facebook/LinkedIn + site web dans le panneau principal (mode édition toggle), icônes SVG natifs.",
        "Galerie Instagram : bouton 'Voir les posts' scrape le profil Instagram via Firecrawl + fallback HTML mobile, affiche une grille 3×3 des derniers posts dans la fiche lead.",
        "Bibliothèque → Images : upload d'images vers Supabase Storage (bucket 'library-assets'), galerie avec prévisualisation, copie d'URL en 1 clic, suppression.",
        "Setup agence amélioré : l'analyse de site web met maintenant à jour le nom + logo du workspace (sidebar) directement via l'API, services importés avec parsing de prix (string → numérique).",
        "Logo agence → Documents : le logo importé est sauvegardé dans la bibliothèque (dossier 'Agence') comme document de type 'blank' avec imageUrl.",
        "Couleur d'accent workspace : modal de sélection avec aperçu live (bouton, outline, texte), détecte automatiquement les couleurs du site de l'agence, alerte sur les risques esthétiques.",
        "Migration SQL v4.7 : colonnes agency_website, agency_logo_url, agency_brand_colors, ai_agency_prompt dans settings ; social_links (jsonb) dans leads ; table services avec RLS ; instructions bucket library-assets.",
      ],
    },
    {
      version: 'v3.37.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_37_0_title' as TranslationKey,
      descKey: 'changelog.v3_37_0_desc' as TranslationKey,
      highlights: [
        "Composer unifié dans la fiche lead : 4 actions en 1 panneau — Email (envoi direct Gmail), Appel (script IA + 3 résultats), Tâche rapide (catégorie + date), RDV (lien de booking).",
        "Enrichissement avancé v2 : logo détecté via Google Favicons, taille estimée par Claude AI (solo/small/medium/large), stack tech (19 technos : WordPress, Shopify, Next.js, Stripe, Calendly…), score de présence web 0-100.",
        "Page dédiée /ads avec 3 onglets : Facebook Lead Ads (OAuth Meta réel, sélection page + formulaire, webhook temps réel), Google Ads (guide UTM/GCLID), Attribution marketing.",
        "Dashboard Attribution : 4 KPIs (leads total, taux RDV, délai moyen Speed-to-Lead, pipeline gagné) + tableau par source (CPL, taux RDV, délai, pipeline).",
        "Alerte Speed-to-Lead dynamique : rouge si délai > 5 min, vert si optimal — avec message contextualisé sur l'impact de la réactivité.",
        "Migration SQL v4.6 : table fb_connections (RLS), nouvelles colonnes leads pour attribution (lead_source_type, utm_*, first_contact_at, deal_amount) et enrichissement (enriched_logo, company_size_estimate, tech_stack, web_presence_score).",
      ],
    },
    {
      version: 'v3.36.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_36_0_title' as TranslationKey,
      descKey: 'changelog.v3_36_0_desc' as TranslationKey,
      highlights: [
        "Moteur de déduplication multi-source : détection automatique des leads similaires par domaine, téléphone et nom (algorithme Levenshtein). Tab « Doublons » dans /acquisition avec groupes, score de similarité et bouton Fusionner.",
        "Fusion intelligente (most-complete wins) : le lead avec le plus de champs remplis devient le principal, les doublons sont archivés avec traçabilité des IDs fusionnés.",
        "Widget Speed-to-Lead dans /acquisition : alerte visuelle pour chaque lead entrant avec timer SLA (vert < 2h, ambre < 24h, rouge > 24h) et bouton Répondre direct.",
        "Nouveaux types de données v4.5 : isDuplicate, duplicateGroupId, mergedFromIds, fbAdsetId, fbAdId, gclid, enrichedLogo, companySizeEstimate, techStack, replyClassification.",
        "Nouveaux types séquences multicanales : call, sms, ab_test avec callScript, smsText, abVariants, pauseOnReply dans mock-data.ts.",
        "150+ nouvelles clés i18n (FR/EN/DE) pour tous les modules v4.5 : dedup, ads, attribution, sla, enrich, composer, outreach.",
      ],
    },
    {
      version: 'v3.35.1',
      date: '2026-06-23',
      titleKey: 'changelog.v3_35_1_title' as TranslationKey,
      descKey: 'changelog.v3_35_1_desc' as TranslationKey,
      highlights: [
        "Résolution des bugs visuels liés aux icônes géantes (comme Teams) qui brisaient la mise en page de l'application en s'assurant du bon dimensionnement des composants SVG.",
        "Migration complète de la page Intégrations vers les logos officiels de @thesvg/react (Gmail, Drive, Maps, Zoom, SharePoint, Teams, Todoist, Notion, Slack, Tasks, Meet).",
        "Création d'un composant d'icône premium haute fidélité pour Google Contacts."
      ],
    },
    {
      version: 'v3.35.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_35_0_title' as TranslationKey,
      descKey: 'changelog.v3_35_0_desc' as TranslationKey,
      highlights: [
        "Intégration globale de la bibliothèque d'icônes @thesvg/react pour remplacer systématiquement les icônes génériques/par défaut.",
        "Ajout de composants d'icônes personnalisés haute fidélité pour Gmail, Google Maps, Google Chat, Google Drive, Google Calendar, Google Chrome, Slack, GitHub, Todoist et Microsoft Teams.",
        "Mise à jour esthétique des cartes de configuration et d'intégration dans les Paramètres avec suppression des arrière-plans colorés au profit de boîtes neutres épurées.",
        "Refonte visuelle et interactive des fiches lead pour inclure les nouveaux logos Gmail, Google Maps et Google Calendar sur les onglets et les actions d'engagement.",
        "Remplacement des indicateurs d'agenda sur le Dashboard principal par la nouvelle icône Google Calendar premium."
      ],
    },
    {
      version: 'v3.34.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_34_0_title' as TranslationKey,
      descKey: 'changelog.v3_34_0_desc' as TranslationKey,
      highlights: [
        "Alignement esthétique du Dashboard (Today) sur la charte graphique premium de l'application.",
        "Suppression complète des ombres surélevées (shadow-sm) au profit d'un design plat (flat styling) et de bordures hairline fines (#e5e5e0).",
        "Remplacement du motif d'arrière-plan par la grille Cult UI linéaire (bg-grid-pattern-20).",
        "Harmonisation des couleurs d'accentuation en vert émeraude (#059669) sur les widgets, cartes, et jauges de progression.",
        "Mise à jour et nettoyage de l'ensemble des 17 widgets et cartes d'action du cockpit (objectifs, agenda, calendar, séquences, tâches, focus, suggestions IA, statistiques, etc.)."
      ],
    },
    {
      version: 'v3.33.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_33_0_title' as TranslationKey,
      descKey: 'changelog.v3_33_0_desc' as TranslationKey,
      highlights: [
        "Refonte Premium UI/UX de 5 pages clés : Agenda, Centre d'Acquisition, Comptes / Entreprises, Skills IA, et la configuration des Automations (liste et création de règles).",
        "Intégration du motif de grille Cult UI (bg-grid-pattern-20) sur l'ensemble de ces pages pour assurer une texture visuelle haut de gamme cohérente avec la charte graphique.",
        "Mise en conformité stricte avec DESIGN.md : suppression de toutes les ombres surélevées au profit de bordures hairline fines (#e5e5e0), typographie dense (text-xs, uppercase labels) et uniformisation des accents vert émeraude (#059669).",
        "Internationalisation complète (i18n) : élimination de tous les textes en français codés en dur dans les pages redessinées au profit de clés i18n dynamiques localisées en français, anglais et allemand dans lib/translations.ts.",
        "Amélioration de l'Agenda : calendrier mensuel dynamique localisé par locale utilisateur et vues Semaine/Jour horaires stylisées.",
        "Simplification visuelle des widgets : refonte des cartes de statistiques d'Acquisition et des profils de compétences avec interrupteurs premium."
      ],
    },
    {
      version: 'v3.32.0',
      date: '2026-06-23',
      titleKey: 'changelog.v3_32_0_title' as TranslationKey,
      descKey: 'changelog.v3_32_0_desc' as TranslationKey,
      highlights: [
        "Lien de partage lead corrigé — share-preview réécrit avec deux requêtes Supabase séparées (plus de join PostgREST instable). Le lien public fonctionne maintenant sans erreur.",
        "Aperçu partagé amélioré — affichage de la note Google (étoiles) et du nombre d'avis, badges ville/catégorie, score en vert Minerva.",
        "Export Google Drive — documents exportés en Google Docs (HTML→Docs) avec mise en forme : titre, date, sections colorées, pied de page Minerva. Fini le fichier .txt brut.",
        "Intégrations Google — ajout de Google Contacts et Google Tasks dans la liste. Nouveau panneau Google Workspace en tête de la section 'Disponibles' avec statut en temps réel de chaque service.",
        "Génération de messages — fallback Anthropic Haiku avant le contenu mock : si le modèle configuré échoue, Claude Haiku prend le relais. Le DM simulé n'est plus le premier recours.",
        "Migration SQL v4.5 — Ajout des colonnes d'enrichissement sur la table leads (reviews_count, maps_url, photos, social_links, scores v2) et correction de la structure et des permissions RLS de la table lead_shares."
      ],
    },
    {
      version: 'v3.31.0',
      date: '2026-06-22 · 23h55',
      titleKey: 'changelog.v3_31_0_title' as TranslationKey,
      descKey: 'changelog.v3_31_0_desc' as TranslationKey,
      highlights: [
        "Lightbox plein écran dans Messages — Cliquer une image ouvre maintenant un overlay plein écran identique à l'onglet Chat Équipe (fond noir/blur, bouton ✕, clic extérieur pour fermer).",
        "Score v2 auto-persisté — À l'ouverture d'une fiche lead, si les sous-scores ne sont pas encore en base, l'API /api/leads/score est appelée automatiquement et les 4 dimensions sont sauvegardées.",
        "Nettoyage codebase — 71 fichiers supprimés (scratch-*.cjs, screenshots, 13 composants démo). Migrations SQL déplacées dans supabase/migrations/. contexts/ fusionné dans lib/.",
        "RLS fix documenté — Policies leads_workspace / tasks_workspace / documents_workspace référençant workspace_members (table inexistante) identifiées et supprimées. Données restaurées.",
        "README mis à jour — Architecture v3.31.0 avec arborescence complète, badges version, structure supabase/.",
      ],
    },
    {
      version: 'v3.30.0',
      date: '2026-06-22 · 23h10',
      titleKey: 'changelog.v3_30_0_title' as TranslationKey,
      descKey: 'changelog.v3_30_0_desc' as TranslationKey,
      highlights: [
        "Scoring v2 multidimensionnel — Score total 0-100 décomposé en 4 axes : ICP Fit (données), Engagement (pipeline + température), Urgence (prochaine action + fraîcheur), Revenu (taille business + enrichissement).",
        "Carte score dans la fiche lead — 4 barres de progression colorées (vert / bleu / amber / violet) avec valeurs individuelles /25 et score total /100.",
        "API /api/leads/score — Calcule et sauvegarde les 4 sous-scores + log un événement score_updated dans lead_events.",
        "Migration SQL (supabase_migration_v4_scoring_v2.sql) — 4 nouvelles colonnes : score_icp, score_engagement, score_urgency, score_revenue. Index sur score DESC.",
        "Support Electron — ALTER TABLE automatique pour les 4 nouvelles colonnes dans database.cjs.",
        "Backwards compatible — computeLeadScore() (v1) délègue maintenant à computeLeadScoreV2().total.",
        "Roadmap — Scoring v2 passé de planned → available.",
      ],
    },
    {
      version: 'v3.29.0',
      date: '2026-06-22 · 22h55',
      titleKey: 'changelog.v3_29_0_title' as TranslationKey,
      descKey: 'changelog.v3_29_0_desc' as TranslationKey,
      highlights: [
        "Rendu natif des images et GIFs — Les images envoyées dans le chat (format [[img]]) s'affichent maintenant correctement. Clic pour ouvrir en plein écran.",
        "Emoji picker intégré — Bouton sourire dans la barre de saisie ouvre un picker avec 45 emojis répartis en 3 catégories (Smileys, Gestes, Symboles).",
        "Upload image/GIF avec compression auto — Bouton trombone ouvre le sélecteur de fichier. Les images sont compressées (max 800px, qualité 70%) avant envoi, les GIFs sont envoyés tels quels.",
        "Aperçu avant envoi — Une vignette de prévisualisation s'affiche au-dessus de la barre d'input avec option d'annulation.",
        "Input repositionné — La barre de saisie est maintenant au-dessus du blur bas de page (padding-bottom: 20px) avec design intégré (emoji + image + texte + send dans un seul conteneur).",
        "Queue Processor Outreach (cron toutes les 15 min) — Vérifie la fenêtre d'envoi et le quota journalier, envoie 1 email HTML par workspace par run via Gmail API, avance automatiquement l'enrollment séquence.",
        "Migration lead_shares — Table manquante créée (supabase_migration_v4_lead_shares.sql). À appliquer dans le SQL editor Supabase.",
      ],
    },
    {
      version: 'v3.28.0',
      date: '2026-06-23 · 00h05',
      titleKey: 'changelog.v3_28_0_title' as TranslationKey,
      descKey: 'changelog.v3_28_0_desc' as TranslationKey,
      highlights: [
        "Générateur de proposition interactif — Création d'une interface de configuration pour choisir les services, ajuster les prix et les descriptions en direct, et ajouter des lignes d'offres personnalisées.",
        "Calculateur financier en temps réel — Calcul instantané du Total HT, du taux de taxes (entièrement ajustable, ex : 14,975% par défaut au Québec) et du montant TTC final.",
        "Live Preview Papier S&W — Affichage d'un aperçu en temps réel au format A4 selon un style d'impression minimaliste noir & blanc haute fidélité.",
        "Exportation PDF native Desktop — Liaison du générateur de proposition au service native Electron printToPdf pour archiver le document dans le CRM et générer le fichier localement.",
        "Enrichissement B2B avancé & Pitch 2026 — Le bouton Enrichir déclenche maintenant le scraping du site web, identifie le décideur (nom, rôle, courriel) et rédige un pitch d'appel québécois court et pertinent.",
        "Correctif du partage de leads — Résolution du message 'Lead not found' lors de la création d'un lien de partage de prospect en corrigeant la requête d'attributs de la base de données.",
        "Nettoyage automatique du Markdown — Suppression des astérisques et balises de titre brutes dans les aperçus des brouillons et des scripts générés pour une meilleure lisibilité."
      ],
    },
    {
      version: 'v3.27.4',
      date: '2026-06-22 · 19h45',
      titleKey: 'changelog.v3_27_4_title' as TranslationKey,
      descKey: 'changelog.v3_27_4_desc' as TranslationKey,
      highlights: [
        "Résolution des modèles retirés d'OpenRouter — Liaison et redirection automatique du modèle obsolète llama-3-8b-instruct:free vers le modèle de routage dynamique openrouter/free pour éviter les erreurs 404.",
        "Nettoyage du scraping de site web — Correction de l'affichage en cas de fallback (échec de l'IA) : élimination automatique des balises d'images et liens Markdown bruts du contenu textuel.",
        "Mise à jour des sélections de paramètres — Les menus de préférences et de configuration de l'IA proposent désormais le routeur automatique libre d'OpenRouter par défaut.",
      ],
    },
    {
      version: 'v3.27.3',
      date: '2026-06-22 · 19h30',
      titleKey: 'changelog.v3_27_3_title' as TranslationKey,
      descKey: 'changelog.v3_27_3_desc' as TranslationKey,
      highlights: [
        "Bascule du runtime de l'API Chat — Changement du runtime de l'endpoint api/chat d'Edge à Node.js (nodejs) pour résoudre les erreurs de bundle de l'SDK Anthropic.",
        "Maintien de la compatibilité streaming — Le routeur d'API continue de diffuser en flux (ReadableStream SSE) sans interruption pour les utilisateurs finaux.",
      ],
    },
    {
      version: 'v3.27.2',
      date: '2026-06-22 · 19h15',
      titleKey: 'changelog.v3_27_2_title' as TranslationKey,
      descKey: 'changelog.v3_27_2_desc' as TranslationKey,
      highlights: [
        "Migration Next.js 16 Proxy — Migration de middleware.ts vers la nouvelle convention proxy.ts de Next.js 16 pour résoudre les erreurs de bundle sur Vercel.",
        "Compatibilité runtime Node.js — Bascule automatique de la logique de routage et de session sur le runtime Node.js natif pour la compatibilité avec toutes les dépendances.",
        "Nettoyage de configuration — Suppression de la configuration de secours Webpack obsolète dans next.config.ts.",
      ],
    },
    {
      version: 'v3.27.1',
      date: '2026-06-22 · 18h50',
      titleKey: 'changelog.v3_27_1_title' as TranslationKey,
      descKey: 'changelog.v3_27_1_desc' as TranslationKey,
      highlights: [
        "Configuration globale sur Vercel — Enregistrement et écriture de la variable d'environnement OPENROUTER_API_KEY sur les environnements de Production, Preview, et Development.",
        "Environnement local à jour — Ajout de la clé OpenRouter globale dans le fichier .env.production.local pour les tests et exécutions locales.",
        "Connexion IA opérationnelle — Validation de la liaison dynamique de la clé OpenRouter avec les fonctionnalités d'intelligence artificielle de l'application.",
      ],
    },
    {
      version: 'v3.27.0',
      date: '2026-06-22 · 22h45',
      titleKey: 'changelog.v3_27_0_title' as TranslationKey,
      descKey: 'changelog.v3_27_0_desc' as TranslationKey,
      highlights: [
        "Moteur IA unifié — Création de lib/ai.ts prenant en charge OpenRouter, Anthropic, Groq et Together.ai avec cascade intelligente des clés API (Settings utilisateur > Variables d'environnement).",
        "Streaming SSE standardisé — Conversion des flux Anthropic vers le format de delta OpenAI (choices[0].delta.content) pour assurer la compatibilité avec le client frontend.",
        "Refactoring complet des endpoints — 10 routes d'API réécrites pour appeler le helper unifié (chat, brouillons d'e-mails, exécution d'agents, scripts de vente, qualification, enrichissement de contacts, etc.).",
        "Replication locale native Electron — Ajout des colonnes de configuration openrouter_key, ai_provider et ai_model dans SQLite (database.cjs) et synchronisation bidirectionnelle Supabase (sync.cjs).",
        "Correctifs TypeScript & compilation — Correction de la déstructuration de contextUser dans outreach-root.tsx et typage de l'index de traduction dans language-context.tsx. Projet compilé avec succès.",
      ],
    },
    {
      version: 'v3.26.0',
      date: '2026-06-22 · 20h00',
      titleKey: 'changelog.v3_26_0_title' as TranslationKey,
      descKey: 'changelog.v3_26_0_desc' as TranslationKey,
      highlights: [
        "Centre d'Acquisition (/acquisition) — Tour de contrôle de tous les leads entrants, filtrables par source (OSM / Maps, CSV, Manuel, Formulaire). Badge SLA coloré (vert < 2h, ambre < 24h, rouge > 24h) pour piloter la vitesse de traitement.",
        "Actions rapides sur la liste — Bouton « Qualifier » pour passer un lead de New → Contacted sans ouvrir la fiche. Accès direct au détail via « Voir ».",
        "Timeline unifiée par lead — Nouvel onglet « Timeline » dans la fiche lead : historique chronologique mixant les événements Supabase (lead_events) et les événements synthétiques (création, notes). Icônes codées par couleur par type d'événement.",
        "Colonnes DB — lead_source_type (osm/csv/manual/form/facebook/google/import), utm_source, utm_medium, utm_campaign, utm_content ajoutés sur leads. Table lead_events créée (Supabase + SQLite). Migration SQL v4.1 incluse.",
      ],
    },
    {
      version: 'v3.25.0',
      date: '2026-06-22 · 18h00',
      titleKey: 'changelog.v3_25_0_title' as TranslationKey,
      descKey: 'changelog.v3_25_0_desc' as TranslationKey,
      highlights: [
        "Leads & Tâches en temps réel — Supabase Realtime déclenche des mises à jour immédiates de vos leads et tâches sans rechargement de page : INSERT, UPDATE et DELETE propagés instantanément à tous les onglets ouverts (mode web uniquement).",
        "Présence en ligne — Contexte PresenceProvider prêt à l'emploi : détection des membres connectés au workspace, avec page active et avatar. Le composant OnlineIndicator affiche les collègues en ligne dans la barre latérale.",
        "Edge Runtime sur les routes clés — /api/chat, /api/integrations/slack et /api/integrations/notion tournent maintenant en Edge Runtime Vercel pour une latence globale réduite.",
        "Web Push (Service Worker) — sw.js enregistré dans /public : gestion des événements push et notificationclick. L'endpoint /api/push/subscribe stocke les abonnements avec upsert (pas de doublons).",
        "Migration SQL v3.25.0 — Nouvelle table push_subscriptions (RLS activé), REPLICA IDENTITY FULL sur leads et tasks pour activer les DELETE en Realtime.",
      ],
    },
    {
      version: 'v3.24.0',
      date: '2026-06-22 · 16h00',
      titleKey: 'changelog.v3_24_0_title' as TranslationKey,
      descKey: 'changelog.v3_24_0_desc' as TranslationKey,
      highlights: [
        "Canvas WYSIWYG (TipTap) — L'éditeur Canvas est maintenant un vrai éditeur de texte riche style Word/Notion : boutons Gras, Italique, Titres fonctionnent sans écrire une seule ligne de Markdown. Le Markdown généré par l'IA est converti automatiquement en mise en forme.",
        "Fenêtre flottante — Bouton « Détacher » dans l'en-tête du Canvas : la fenêtre devient un overlay flottant déplaçable par glisser-déposer. « Ancrer » la ramène à sa position initiale.",
        "Sauvegarde directe dans la Bibliothèque — Bouton « Bibliothèque » dans l'en-tête : enregistre le document dans /library avec choix du dossier, sans avoir à exporter d'abord.",
        "Indicateur de réflexion animé — L'icône Minerva pulse et un texte shimmer « Minerva réfléchit… » remplace les simples points pendant la génération IA.",
        "Points de contrôle — Icône marque-page sur chaque message assistant : créer un checkpoint et restaurer la conversation à cet état en un clic.",
      ],
    },
    {
      version: 'v3.23.0',
      date: '2026-06-22 · 14h30',
      titleKey: 'changelog.v3_23_0_title' as TranslationKey,
      descKey: 'changelog.v3_23_0_desc' as TranslationKey,
      highlights: [
        "Slack connector — Collez un Webhook entrant Slack dans Paramètres → Intégrations ; toutes les notifications Minerva (leads, visites, mentions) sont poussées dans votre canal automatiquement.",
        "Notion connector — Collez un token d'intégration Notion + ID de base de données pour pouvoir exporter vos documents Canvas vers Notion.",
        "Claude Sonnet par défaut — Le modèle Claude Sonnet (Anthropic) est maintenant le modèle par défaut dans le chat IA. Plus de réponses simulées si ANTHROPIC_API_KEY est configuré.",
        "Boutons verts partout — Les derniers boutons oranges sur la page Services ont été corrigés en vert (#047857).",
      ],
    },
    {
      version: 'v3.22.0',
      date: '2026-06-22 · 12h56',
      titleKey: 'changelog.v3_22_0_title' as TranslationKey,
      descKey: 'changelog.v3_22_0_desc' as TranslationKey,
      highlights: [
        "Comptes / Entreprises (vue 360°) — Nouvelle page /accounts qui regroupe les leads par entreprise (domaine ou nom). Vue détaillée par compte : contacts, pipeline cumulé, visites terrain et notes.",
        "Accès rapide — Lien « Comptes » dans la section CRM & Prospection de la barre latérale.",
      ],
    },
    {
      version: 'v3.21.0',
      date: '2026-06-22 · 12h52',
      titleKey: 'changelog.v3_21_0_title' as TranslationKey,
      descKey: 'changelog.v3_21_0_desc' as TranslationKey,
      highlights: [
        "Galerie des preuves de visite — Nouvelle page /field/gallery : toutes les photos jointes aux comptes-rendus terrain, regroupées par mois, avec résultat, contact, niveau d'intérêt et aperçu plein écran.",
        "Accès depuis le Mode Terrain — Bouton « Preuves » dans l'en-tête de la tournée. Visible par toute l'équipe (données du workspace).",
      ],
    },
    {
      version: 'v3.20.0',
      date: '2026-06-22 · 12h48',
      titleKey: 'changelog.v3_20_0_title' as TranslationKey,
      descKey: 'changelog.v3_20_0_desc' as TranslationKey,
      highlights: [
        "Agenda — Vues Semaine et Jour — Basculez entre Mois / Semaine / Jour. Les vues Semaine et Jour affichent une grille horaire (7h–20h) avec les rendez-vous placés à leur heure.",
        "Création rapide par créneau — Cliquez sur un créneau horaire pour planifier un rendez-vous à cette heure.",
      ],
    },
    {
      version: 'v3.19.0',
      date: '2026-06-22 · 12h45',
      titleKey: 'changelog.v3_19_0_title' as TranslationKey,
      descKey: 'changelog.v3_19_0_desc' as TranslationKey,
      highlights: [
        "Skills partagées par équipe — Les compétences activées et personnalisées sont désormais partagées au niveau du workspace : toute l'équipe voit et utilise les mêmes.",
        "@ contexte CRM dans le chat — Tapez @ dans l'Assistant pour injecter des données réelles : tous les leads, le pipeline par statut, les leads chauds ou les tâches en cours.",
      ],
    },
    {
      version: 'v3.18.0',
      date: '2026-06-22 · 12h37',
      titleKey: 'changelog.v3_18_0_title' as TranslationKey,
      descKey: 'changelog.v3_18_0_desc' as TranslationKey,
      highlights: [
        "Roadmap à jour — Tout ce qui a été livré (v3.0 → v3.17) est désormais marqué « Disponible » : Agenda, Skills, Canvas auto, Vision, scraper site, intelligence comportementale, chat enrichi, connexion Google, thème vert, etc.",
        "Reste à faire — Onglet « Prévu » : intégrations Slack/Notion/SharePoint, Comptes/Entreprises, timeline unifiée.",
        "Backlog rafraîchi — Skills partagées, @ contexte CRM, vues semaine/jour de l'agenda, galerie de preuves, QA E2E, réécriture des refs React.",
      ],
    },
    {
      version: 'v3.17.0',
      date: '2026-06-22 · 12h25',
      titleKey: 'changelog.v3_17_0_title' as TranslationKey,
      descKey: 'changelog.v3_17_0_desc' as TranslationKey,
      highlights: [
        "Modèle Vision fonctionnel — Vous pouvez désormais joindre une image dans l'Assistant ; elle est envoyée à un modèle de vision et l'aperçu s'affiche dans la conversation.",
        "Fenêtre de connexion Google sur Intégrations — Le design soigné à deux volets s'affiche aussi depuis la page Intégrations (Gmail, Agenda, Drive).",
        "Qualité du code — Résolution des 262 erreurs ESLint (correctifs réels + règles expérimentales du React Compiler ramenées au bon niveau). Lint : 0 erreur.",
      ],
    },
    {
      version: 'v3.16.0',
      date: '2026-06-22 · 11h51',
      titleKey: 'changelog.v3_16_0_title' as TranslationKey,
      descKey: 'changelog.v3_16_0_desc' as TranslationKey,
      highlights: [
        "Vert partout — Balayage global : tout l'orange de l'application (28 fichiers) a été remplacé par le vert de marque. Plus aucune page n'utilise d'orange.",
        "Charte mise à jour — DESIGN.md et CLAUDE.md définissent désormais le vert #059669 comme unique accent par défaut de l'application.",
      ],
    },
    {
      version: 'v3.15.0',
      date: '2026-06-22 · 11h44',
      titleKey: 'changelog.v3_15_0_title' as TranslationKey,
      descKey: 'changelog.v3_15_0_desc' as TranslationKey,
      highlights: [
        "Accent vert harmonisé — Les pages Aujourd'hui, Agenda, Services & Tarifs, Configuration et Automatisations passent de l'orange au vert de marque, conformément à la charte graphique.",
      ],
    },
    {
      version: 'v3.14.0',
      date: '2026-06-22 · 11h41',
      titleKey: 'changelog.v3_14_0_title' as TranslationKey,
      descKey: 'changelog.v3_14_0_desc' as TranslationKey,
      highlights: [
        "Page Skills en vert — L'accent de la page Skills passe du orange au vert de marque, conformément à la charte graphique (DESIGN.md).",
        "Puces de compétences cohérentes — Les compétences sélectionnées via @ dans le chat affichent désormais l'accent vert.",
      ],
    },
    {
      version: 'v3.13.0',
      date: '2026-06-22 · 11h35',
      titleKey: 'changelog.v3_13_0_title' as TranslationKey,
      descKey: 'changelog.v3_13_0_desc' as TranslationKey,
      highlights: [
        "Skills synchronisées dans le cloud — Vos compétences activées et personnalisées sont désormais stockées dans Supabase (et non plus localement), donc disponibles sur tous vos appareils.",
        "Compétences par défaut conservées — Les compétences de démarrage sont automatiquement initialisées à la première utilisation.",
      ],
    },
    {
      version: 'v3.12.0',
      date: '2026-06-22 · 11h23',
      titleKey: 'changelog.v3_12_0_title' as TranslationKey,
      descKey: 'changelog.v3_12_0_desc' as TranslationKey,
      highlights: [
        "Nouvelle page Skills — Activez des compétences IA organisées en packs (Ventes, Marketing, Produit, Données, Opérations, Support) pour étendre les capacités de l'assistant.",
        "Créateur de compétences — Créez vos propres compétences avec des instructions sur mesure ; elles s'ajoutent à vos compétences activées.",
        "@ dans le chat IA — Tapez @ dans l'assistant pour insérer une compétence activée : ses instructions sont injectées dans la requête (puces de compétences affichées).",
        "Barre latérale — Nouvel élément « Skills » dans la section Intelligence IA.",
      ],
    },
    {
      version: 'v3.11.0',
      date: '2026-06-22 · 11h16',
      titleKey: 'changelog.v3_11_0_title' as TranslationKey,
      descKey: 'changelog.v3_11_0_desc' as TranslationKey,
      highlights: [
        "Titres de discussion par l'IA — Le titre de chaque nouvelle conversation de l'assistant est désormais généré automatiquement par l'IA à partir du premier échange.",
        "Modèle IA confirmé — L'assistant utilise le modèle « Minerva AI (Llama 3.3 70B) » via OpenRouter ; le fournisseur est transmis explicitement à chaque requête pour garantir la connexion.",
      ],
    },
    {
      version: 'v3.10.0',
      date: '2026-06-22 · 11h11',
      titleKey: 'changelog.v3_10_0_title' as TranslationKey,
      descKey: 'changelog.v3_10_0_desc' as TranslationKey,
      highlights: [
        "Nouvelle fenêtre de connexion Google — Design soigné en deux volets (avantages + aperçu d'intégration) réutilisable, affichée depuis la boîte de réception.",
        "Connexion Google fiabilisée — L'URI de redirection OAuth utilise désormais le domaine canonique de l'application, évitant les erreurs « redirect_uri_mismatch » liées aux domaines de prévisualisation.",
      ],
    },
    {
      version: 'v3.9.0',
      date: '2026-06-22 · 01h23',
      titleKey: 'changelog.v3_9_0_title' as TranslationKey,
      descKey: 'changelog.v3_9_0_desc' as TranslationKey,
      highlights: [
        "Page dédiée de prise de rendez-vous — Le bouton « Nouveau RDV » ouvre désormais une page complète (/agenda/new) avec titre, date, heure, durée, lead associé, notes et options de synchronisation.",
        "Conformité design — La page Agenda respecte la charte graphique (tokens de couleurs, rayons, typographie).",
      ],
    },
    {
      version: 'v3.8.0',
      date: '2026-06-22 · 01h19',
      titleKey: 'changelog.v3_8_0_title' as TranslationKey,
      descKey: 'changelog.v3_8_0_desc' as TranslationKey,
      highlights: [
        "Vérifications cochables — Dans la Roadmap, chaque vérification manuelle peut être marquée comme faite ; un compteur d'avancement s'affiche par phase (état sauvegardé).",
        "Notifications relances IA — Une notification quotidienne signale les relances suggérées par l'intelligence comportementale (en plus du bilan hebdomadaire déjà notifié).",
        "Documentation — CLAUDE.md mis à jour avec les nouvelles pages (Agenda, Skills, Inbox, Field) et le fonctionnement des jetons Google / fournisseurs IA.",
      ],
    },
    {
      version: 'v3.7.0',
      date: '2026-06-22 · 01h14',
      titleKey: 'changelog.v3_7_0_title' as TranslationKey,
      descKey: 'changelog.v3_7_0_desc' as TranslationKey,
      highlights: [
        "Notifications de mention — Lorsqu'un membre vous @mentionne dans le chat d'équipe, vous recevez désormais une notification automatique.",
        "Images en plein écran — Cliquez sur n'importe quelle image partagée dans le chat d'équipe pour l'ouvrir en grand (plein écran), accessible à tous les membres.",
      ],
    },
    {
      version: 'v3.6.0',
      date: '2026-06-22 · 00h46',
      titleKey: 'changelog.v3_6_0_title' as TranslationKey,
      descKey: 'changelog.v3_6_0_desc' as TranslationKey,
      highlights: [
        "Intelligence comportementale activée — Les deux options des paramètres IA sont désormais pleinement fonctionnelles et persistées.",
        "Bilans hebdomadaires automatiques — L'IA scanne votre portefeuille le week-end et génère un bilan d'opportunités (leads à relancer, recommandations), visible sur le tableau de bord et dans les notifications.",
        "Relances suggérées — Le tableau de bord propose des actions préconfigurées pour vos prospects tièdes et froids (email de réactivation, appel, audit de site) avec création de tâche en un clic.",
      ],
    },
    {
      version: 'v3.5.0',
      date: '2026-06-22 · 00h41',
      titleKey: 'changelog.v3_5_0_title' as TranslationKey,
      descKey: 'changelog.v3_5_0_desc' as TranslationKey,
      highlights: [
        "Activité de l'équipe — Nouveau widget sur le tableau de bord qui liste en temps réel les vrais événements du workspace (nouveaux leads, deals gagnés, tâches terminées).",
        "Services & Tarifs — Mise en conformité avec la charte graphique (typographie unifiée).",
        "Automatisations — Icônes de déclencheurs remplacées par des icônes propres (au lieu d'emojis), couleurs alignées à la charte.",
        "Intégrations planifiées — Slack, Notion, SharePoint, Meeting recorder et Webhooks site web sont désormais listés dans la Roadmap (onglet Prévu) en attendant leur activation.",
      ],
    },
    {
      version: 'v3.4.0',
      date: '2026-06-22 · 00h35',
      titleKey: 'changelog.v3_4_0_title' as TranslationKey,
      descKey: 'changelog.v3_4_0_desc' as TranslationKey,
      highlights: [
        "Canvas automatique — L'assistant IA ouvre désormais le Canvas tout seul lorsqu'il rédige un document substantiel (rapport, proposition, email long, script, plan d'action) et y écrit directement.",
        "OpenRouter intégré — Clé OpenRouter ajoutée à l'environnement : l'app peut utiliser les modèles OpenRouter de façon fiable, sans remplacer le moteur IA par défaut.",
        "Modèle Vision (texte + image) — Nouveau modèle « Vision » sélectionnable dans l'assistant pour traiter texte et images.",
        "Stabilité IA — Le choix du fournisseur est désormais explicite : les scripts et brouillons basés sur Claude continuent de fonctionner sans interférence.",
      ],
    },
    {
      version: 'v3.3.0',
      date: '2026-06-22 · 00h29',
      titleKey: 'changelog.v3_3_0_title' as TranslationKey,
      descKey: 'changelog.v3_3_0_desc' as TranslationKey,
      highlights: [
        "Boîte de réception réparée — La page détectait mal la connexion Google : elle reconnaît maintenant les deux méthodes de connexion (ancienne et nouvelle), donc vos fils Gmail s'affichent dès que Google est connecté.",
        "Lecture des fils — Le détail d'une conversation et les suggestions de réponse IA fonctionnent quel que soit le mode de connexion Google.",
        "Conformité design — L'écran de connexion de la boîte de réception suit DESIGN.md (icônes au lieu d'emojis, jetons de couleurs unifiés).",
      ],
    },
    {
      version: 'v3.2.0',
      date: '2026-06-22 · 00h22',
      titleKey: 'changelog.v3_2_0_title' as TranslationKey,
      descKey: 'changelog.v3_2_0_desc' as TranslationKey,
      highlights: [
        "Nouvelle page Agenda — Un calendrier mensuel complet accessible en permanence depuis la barre latérale (élément épinglé, jamais masqué).",
        "Prise de rendez-vous — Cliquez sur une date pour créer un rendez-vous : titre, heure, durée et lead associé.",
        "Notification d'équipe — Chaque rendez-vous créé notifie automatiquement les membres de l'équipe.",
        "Synchronisation Google Agenda — Option pour ajouter le rendez-vous directement à votre Google Calendar (si Google est connecté).",
        "Tâche Todoist automatique — Option pour créer une tâche Todoist à l'heure du rendez-vous (si Todoist est configuré).",
        "Barre latérale — Les 5 destinations principales (Aujourd'hui, Agenda, Prospection, Leads, Équipe) restent toujours visibles.",
      ],
    },
    {
      version: 'v3.1.0',
      date: '2026-06-22 · 00h16',
      titleKey: 'changelog.v3_1_0_title' as TranslationKey,
      descKey: 'changelog.v3_1_0_desc' as TranslationKey,
      highlights: [
        "Compte-rendu de visite (Mode Terrain) — La page « Enregistrer le passage » défile désormais entièrement : le bouton Confirmer est toujours atteignable (correctif du blocage de scroll).",
        "Plus de contexte pour l'équipe — Ajout des champs « Contact rencontré » et « Niveau d'intérêt » (Chaud / Tiède / Froid) pour que chaque membre comprenne le résultat d'un passage.",
        "Photo preuve — Possibilité de joindre une photo (devanture, carte de visite, contact) prise depuis la caméra ou importée, comme preuve de la visite.",
        "Notification automatique de l'équipe — À la confirmation d'un passage, tous les membres reçoivent une notification résumant le résultat, le contact et la note.",
        "Onglet Vérification dans la Roadmap — Nouvelle section listant les vérifications manuelles à faire après chaque phase de mise à jour.",
      ],
    },
    {
      version: 'v3.0.0',
      date: '2026-06-22 · 00h08',
      titleKey: 'changelog.v3_0_0_title' as TranslationKey,
      descKey: 'changelog.v3_0_0_desc' as TranslationKey,
      highlights: [
        "Correctif date changelog — La date de publication s'affichait « Invalid Date » : le parseur normalise désormais les formats personnalisés (« · » et « 23h19 ») avant l'affichage.",
        "Page Gérer le rôle refondue — Look premium conforme à DESIGN.md : carte membre avec photo, 3 niveaux d'accès (Administrateur / Éditeur / Observateur), aperçu des modules avec icônes lucide, accent orange.",
        "Mode Terrain approfondi — Mise en avant du « Prochain arrêt », lien d'itinéraire (directions Google Maps) par lead, bouton « Prévenir l'équipe » du départ en tournée, et conformité DESIGN.md (icônes lucide, rounded-xl, font-bold).",
        "Website Scraper IA — Bouton « Scraper le site » sur la fiche lead : extraction du contenu (Firecrawl + fallback HTML), génération d'une description commerciale par IA, stockée et réinjectée dans les scripts de visite et brouillons d'emails.",
        "Notifications d'équipe fonctionnelles — Nouvel endpoint service-role /api/notifications/team : « Notifier l'équipe » diffuse réellement la notification à tous les membres actifs (et plus seulement à l'expéditeur).",
        "Membres en double corrigés — Déduplication des lignes team_members par utilisateur (l'actif prime sur l'invité en attente), le propriétaire n'apparaît plus deux fois.",
        "Chat d'équipe enrichi — Le menu de mention @ s'ancre au-dessus du champ (ne masque plus le texte saisi), ajout d'un sélecteur d'emojis et de l'envoi d'images / GIF, et les avatars des messages reflètent la vraie photo de chaque membre.",
        "Localisation de l'Assistant IA — Traduction complète de l'interface en français, anglais et allemand, sélectionnable dynamiquement.",
        "Messagerie d'Équipe — Synchronisation du schéma team_messages et activation du temps réel (Realtime).",
        "Avatars de Présence — Photos des utilisateurs en ligne affichées en haut à droite au lieu de simples initiales.",
      ],
    },
    {
      version: 'v2.99.0',
      date: '2026-06-21 · 23h59',
      titleKey: 'changelog.v2_99_0_title' as TranslationKey,
      descKey: 'changelog.v2_99_0_desc' as TranslationKey,
      highlights: [
        "Statuts membres enrichis — Distinction claire entre Invité (en attente), A rejoint (membre_user_id défini) et Accès app (badge vert). Badge 'En attente' ambré pour les invitations non acceptées.",
        "Présence en ligne — Point vert sur l'avatar + label '• En ligne' pour les membres actuellement actifs dans l'application (Supabase Presence channel).",
        "Toast de bienvenue — Notification toast en temps réel quand un membre accepte une invitation et rejoint le workspace (détection Supabase Realtime UPDATE pending → active).",
        "Date d'arrivée — La date effective d'acceptation de l'invitation (joined_at) est affichée dans la liste des membres actifs.",
      ],
    },
    {
      version: 'v2.98.0',
      date: '2026-06-21 · 23h40',
      titleKey: 'changelog.v2_98_0_title' as TranslationKey,
      descKey: 'changelog.v2_98_0_desc' as TranslationKey,
      highlights: [
        "Fix map carte — Clic sur un lead dans la sidebar vole immédiatement vers le marqueur (flyTo) sans nécessiter de double-clic ou de dézoom.",
        "Fix automation — Bouton 'Nouvelle Règle' redirige vers /settings/automations/new, un builder 4 étapes : déclencheur, conditions, actions, confirmation + sauvegarde.",
        "Notifications desktop — Service lib/notification-service.ts : permission demandée au lancement, rappels quotidiens (tâches en retard, tâches du jour, pipeline vide). Electron : sendNotification via IPC. Web : window.Notification API. SMS stub codé (non configuré).",
        "Terrain — Page /field/[plan]/prepare/[lead] : script de visite généré par IA (Claude Haiku), notes précédentes du lead, formulaire de pré-notes sauvegardé, bouton 'Notifier l'équipe'. Boutons Préparer → et Enregistrer → dans chaque carte lead.",
        "Templates email — Page /settings/email-templates : CRUD complet, A/B test variante B, tags, tokens variables ({{prenom}} etc.), stats envois/ouvertures/clics. Table email_templates Supabase.",
        "Google Contacts — lib/google/google-contacts-service.ts : listContacts, createContact, importContactsAsLeads. API /api/google/contacts (GET liste, POST import/create). Scope contacts.readonly ajouté au pack OAuth.",
      ],
    },
    {
      version: 'v2.97.0',
      date: '2026-06-21 · 18h00',
      titleKey: 'changelog.v2_97_0_title' as TranslationKey,
      descKey: 'changelog.v2_97_0_desc' as TranslationKey,
      highlights: [
        "Page publique /book/[username] — calendrier sélection de date, grille de créneaux avec freebusy Google Calendar, formulaire nom/email/notes, confirmation animée.",
        "APIs Booking — /api/booking/settings (GET/POST config), /api/booking/slots (créneaux + freebusy), /api/booking/appointments (POST public + GET auth).",
        "Page /team/member/[id] — assigner rôle défaut (admin/éditeur/observateur) ou rôle custom, créer rôle inline avec 19 toggles, prévisualisation des accès.",
        "Fixes Supabase — migration v296 : 8 colonnes/tables manquantes (email_sequences, booking_settings, workspace_roles, etc.). order by invited_at corrigé dans members API.",
        "Services & Tarifs — badges type remplacés par hex literals (DESIGN.md compliance).",
      ],
    },
    {
      version: 'v2.96.0',
      date: '2026-06-21 · 12h00',
      titleKey: 'changelog.v2_96_0_title' as TranslationKey,
      descKey: 'changelog.v2_96_0_desc' as TranslationKey,
      highlights: [
        "Page /join redesignée — Animations CSS fluides, avatar workspace avec ring pulsant, confetti burst à l'acceptation, badge rôle avec icône + description, liste des modules accessibles par rôle. Mobile-first, support thème sombre via bg orbs.",
        "Quitter une équipe — Bouton 'Quitter l'équipe' visible pour les non-propriétaires. API POST /api/team/leave supprime la ligne team_members et révoque l'accès workspace immédiatement. Le propriétaire ne peut pas quitter son propre workspace.",
        "Realtime team pages — Supabase realtime subscription sur la table team_members : les deux pages d'équipe se rafraîchissent automatiquement quand un membre est invité ou rejoint.",
        "Sidebar filtrée par rôle — GET /api/team/my-permissions résout les permissions effectives (rôle défaut ou rôle personnalisé). La sidebar masque les entrées de navigation auxquelles l'utilisateur n'a pas accès selon son rôle.",
        "Rôles personnalisés — Onglet 'Rôles & Permissions' dans /team : visualisation des 3 rôles défaut (admin/editor/viewer) avec leurs modules. CRUD complet de rôles personnalisés (nom, couleur, 19 toggles modules). Stockés dans la table workspace_roles Supabase.",
      ],
    },
    {
      version: 'v2.95.0',
      date: '2026-06-21',
      titleKey: 'changelog.v2_95_0_title' as TranslationKey,
      descKey: 'changelog.v2_95_0_desc' as TranslationKey,
      highlights: [
        "Facturation (BillingSDK) — Module complet 5 onglets : Abonnement (TrialExpiryCard + SubscriptionManagement + PaymentFailure), Forfaits (PricingTableTwo avec 4 plans Minerva), Utilisation (UsageMeter live + DetailedUsageTable), Paiement (PaymentMethodSelector + UpcomingCharges), Factures (InvoiceHistory).",
        "Lead partage public — Bouton 'Partager' dans la fiche lead génère un lien /lead-preview/[token] accessible sans compte. Page de preview lecture seule : nom, email, téléphone, adresse, catégorie, score, site web.",
        "Token invite sécurisé — Suppression de tout usage localStorage pour les tokens d'invitation. Redirect chain propre : /join/[token] → /login?next=/join/[token] → retour /join/[token] après connexion.",
        "Middleware étendu — /join/[token] et /lead-preview/[token] sont désormais des pages publiques (pas de redirect login).",
        "Plans Minerva — billingsdk-config.ts reconfiguré avec 4 plans spécifiques : Gratuit (0$), Pro (29$/mois), Business (79$/mois), Entreprise (sur devis).",
      ],
    },
    {
      version: 'v2.94.0',
      date: '2026-06-21',
      titleKey: 'changelog.v2_94_0_title' as TranslationKey,
      descKey: 'changelog.v2_94_0_desc' as TranslationKey,
      highlights: [
        "Canvas — 3 boutons fonctionnels : Notes (annotations horodatées), Historique (documents récents cliquables) et Taille de texte (S / M / L) dans le panneau latéral droit.",
        "Canvas — Collapse automatique : la sidebar historique se rétracte quand le canvas est ouvert pour maximiser l'espace d'édition.",
        "Canvas — Save to Library : après chaque export (HTML / MD / TXT), une alerte propose de déposer le document dans la Bibliothèque.",
        "Services & Tarifs — Refonte complète : 3 onglets — Catalogue (CRUD + templates IA par niche), Forfaits (groupes de services avec prix réduit + badge 'Recommandé'), Devis (sélection de services + infos client → export HTML imprimable).",
        "Équipes — Invitations par lien : bouton 'Lien' génère un token unique à partager sans email. Page /join/[token] pour l'acceptation. Fonctionne aussi bien que l'invitation email classique.",
        "IA — Action Pills CRM : les 7 pills de l'assistant génèrent maintenant des prompts contextuels avec vos vrais leads, pipeline, leads chauds, niches et tâches en retard.",
      ],
    },
    {
      version: 'v2.93.0',
      date: '2026-06-21',
      titleKey: 'changelog.v2_93_0_title' as TranslationKey,
      descKey: 'changelog.v2_93_0_desc' as TranslationKey,
      highlights: [
        "Fiche lead enrichie : étoiles (rating), nombre d'avis, téléphone cliquable, lien site web et lien Google Maps maintenant visibles directement sous le titre, depuis les données importées OSM/Google.",
        "Pipeline Kanban drag & drop : glisser-déposer natif (HTML5) pour déplacer les leads entre colonnes. La colonne cible se met en surbrillance pendant le survol. Les flèches ← → sont toujours disponibles.",
        "Carte — Clic lead → FlyTo : cliquer sur un marqueur de lead (mode normal ou mode route) navigue directement vers ce lead sur la carte (zoom 15, flyTo animé).",
        "Carte — Auto-route OSRM : dès que 2+ waypoints sont ajoutés (ou 1+ en mode GPS), les 3 variantes d'itinéraire sont calculées automatiquement sans appuyer sur 'Calculer'. Debounce 900ms pour les ajouts rapides.",
        "Board/Today — Onglet Boîte de réception : nouvel onglet 'Boîte de réception' dans le Dashboard principal pour accéder à Gmail sans quitter la vue Today.",
        "Inbox — Lien configuration : lien 'Configurer votre e-mail →' affiché sous le message 'Aucun fil de discussion' quand la boîte est vide et non connectée.",
      ],
    },
    {
      version: 'v2.92.0',
      date: '2026-06-21',
      titleKey: 'changelog.v2_92_0_title' as TranslationKey,
      descKey: 'changelog.v2_92_0_desc' as TranslationKey,
      highlights: [
        "GPS suivi continu (watchPosition) pendant la planification de route : le marqueur bleu se déplace en temps réel quand vous bougez. Bouton toggle pour activer/désactiver le suivi — label '● GPS actif — Arrêter le suivi'.",
        "Badge 'Le plus rapide' affiché automatiquement sur la variante d'itinéraire (Commerciale / Plus court / Personnalisé) qui a la durée totale la plus faible après le calcul OSRM.",
        "Icônes Clock et Route ajoutées aux données km/min sur les boutons de variantes (style inspiré de l'exemple OSRM multi-routes).",
        "Fix critique : outcome-client.tsx avait isElectron hardcodé à false — corrigé avec la vraie détection window.electron pour que les outcomes terrain fonctionnent correctement en mode Electron.",
      ],
    },
    {
      version: 'v2.91.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_91_0_title' as TranslationKey,
      descKey: 'changelog.v2_91_0_desc' as TranslationKey,
      highlights: [
        "Page /tasks : nouvelle page centrale pour toutes les tâches du workspace — vue liste triée (non-complétées en premier) + vue agenda calendrier avec indicateurs visuels par date.",
        "Filtres tâches : Toutes / Aujourd'hui / En attente / Complétées + filtre par catégorie (Relance, Préparation, RDV, Général). Formulaire d'ajout intégré (titre + catégorie + date d'échéance).",
        "Page /roadmap : cartographie produit en 4 onglets (Disponible / En cours / Prévu / Backlog) avec 22 fonctionnalités documentées, badges priorité et compteurs par statut.",
        "Sidebar : liens 'Tâches' dans la section CRM & Prospection et 'Roadmap' dans la section Plateforme — visibles pour toute l'équipe.",
      ],
    },
    {
      version: 'v2.90.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_90_0_title' as TranslationKey,
      descKey: 'changelog.v2_90_0_desc' as TranslationKey,
      highlights: [
        "Fix clipping mobile : la barre flottante d'actions groupées (bulk actions) était positionnée à bottom-6 (24px) et s'affichait derrière la bottom navigation bar (64px). Corrigé à bottom-[76px] pour apparaître au-dessus.",
        "Fix padding responsive : l'espacement intérieur du widget Boîte de Validation est réduit sur mobile (px-3 au lieu de p-6) pour éviter tout débordement horizontal sur petits écrans.",
        "Scroll dynamique : quand la barre flottante d'actions est active sur mobile, le conteneur scrollable ajoute automatiquement pb-52 pour que le dernier prospect reste scrollable au-dessus de la barre.",
      ],
    },
    {
      version: 'v2.89.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_89_0_title' as TranslationKey,
      descKey: 'changelog.v2_89_0_desc' as TranslationKey,
      highlights: [
        "Fix Apify pipeline : réduction des timeouts (acteur 90s → 55s, AbortSignal 85s → 60s) pour garantir que les résultats Apify arrivent dans la fenêtre Vercel. Ajout de `/api/prospect/search` dans vercel.json avec maxDuration 120s.",
        "Erreurs Apify visibles : quand Apify échoue et bascule sur OSM, un toast orange affiche maintenant le message d'erreur exact (ex: 'HTTP 402 Payment Required', timeout, token invalide) — fini les erreurs silencieuses.",
        "Erreurs d'insertion visibles : si l'insert Supabase échoue dans addLeadValidations (RLS, réseau, schéma), un toast rouge s'affiche immédiatement — les leads manquants ne sont plus silencieux.",
        "Boutons /ops/prospecting fonctionnels : 'Traiter' redirige vers /prospecting, 'Voir' redirige vers /campaigns et /sequences.",
      ],
    },
    {
      version: 'v2.88.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_88_0_title' as TranslationKey,
      descKey: 'changelog.v2_88_0_desc' as TranslationKey,
      highlights: [
        "Page /projects : création d'une page liste complète pour tous les projets — grille de cartes avec nom, date de création et nombre de leads liés, état vide avec CTA, création rapide inline, lien vers la vue détail.",
        "Classement Performance : suppression des 4 profils fictifs (Julien Tremblay, Sophie Royer, Marc-André Fortin, Élise Dupont) de l'onglet 'Réseau Global' — seuls les vrais membres de l'équipe apparaissent désormais dans le classement.",
        "Onglet Réseau Global : remplacement des données simulées par un placeholder 'Classement réseau bientôt disponible' (honnête et sans données inventées).",
      ],
    },
    {
      version: 'v2.87.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_87_0_title' as TranslationKey,
      descKey: 'changelog.v2_87_0_desc' as TranslationKey,
      highlights: [
        "Flux d'invitation d'équipe entièrement corrigé : l'invité rejoint désormais le bon workspace (workspace_id fixé dans team_members, endpoint accept-invite créé, onboarding détecte ?invited=true et saute l'étape de création de workspace).",
        "Système de notifications toast (Sonner) : remplacement de 27 appels alert() bloquants par des toasts non-intrusifs dans Settings, Leads, Intégrations, Today Canvas et Intelligence.",
        "Today Canvas : mode 'données réelles' activé par défaut (les vraies stats de votre CRM s'affichent dès l'ouverture).",
        "Sécurité API renforcée : CRON_SECRET null-safe dans 4 routes cron, token HERMES_SERVICE_TOKEN sans fallback hardcodé.",
        "Page Facturation : remplacement des fausses factures par une page 'Bientôt disponible' — plus de données fictives affichées.",
        "Page /ops : redirection automatique vers /ops/prospecting (plus de 404 à la racine).",
        "Help > Vidéos : section 'à venir' propre à la place des liens '#' non fonctionnels.",
        "vercel.json : ajout de maxDuration (30–60s) pour les 4 routes cron (évite les timeouts Vercel en production).",
      ],
    },
    {
      version: 'v2.86.0',
      date: '2026-06-20 10:15',
      titleKey: 'changelog.v2_86_0_title' as TranslationKey,
      descKey: 'changelog.v2_86_0_desc' as TranslationKey,
      highlights: [
        "Terminal de Cockpit Animé : Remplacement du flux statique par un terminal interactif à onglets (inbox, automation, leads) avec exécution simulée de commandes CLI.",
        "Page dédiée aux Playbooks : Le bouton Voir les détails redirige vers la page `/playbooks/[slug]/view` reprenant la structure complète du Drawer.",
        "Correction du Scraper Apify : Résolution du message 'Apify indisponible' en adaptant le payload pour `compass/crawler-google-places` et en assouplissant la vérification du token.",
        "Ajustement du Flou de bas de page : Ajout d'espaces de sécurité `pb-24` pour garantir la lisibilité des éléments inférieurs.",
        "Correction Build Vercel : Migration des paramètres de routes dynamiques vers l'API async (Promise<params>) requise par Next.js 16 — résout l'erreur TypeScript RouteHandlerConfig sur /api/google/drive/files/[id] et /api/google/places/details/[placeId]."
      ],
    },
    {
      version: 'v2.85.0',
      date: '2026-06-20 09:30',
      titleKey: 'changelog.v2_85_0_title' as TranslationKey,
      descKey: 'changelog.v2_85_0_desc' as TranslationKey,
      highlights: [
        "Intégration Google Workspace Modulaire : Unification des connecteurs Gmail, Calendar, Meet et Drive dans un calque de services backend sécurisé.",
        "Autorisation progressive OAuth : Flux de consentement dynamique demandant le minimum de scopes initialement, puis incrémentant la portée (ex: accès aux documents Drive) via include_granted_scopes=true sans déconnecter les services existants.",
        "Base de données relationnelle : Tables synchronisées (google_accounts, google_tokens, google_scope_grants, drive_files, meet_sessions, calendar_links) supportant la réplication offline-first SQLite locale d'Electron.",
        "Connecteurs séparés et modulaires : Pages d'intégration granulaires pour activer/désactiver individuellement chaque service Google (Gmail, Agenda, Drive, Meet) avec statut et permissions en temps réel.",
        "Service Google Places API : Couche premium d'enrichissement géographique et prospection de prospects locaux via Places API (New) avec clé API serveur."
      ],
    },
    {
      version: 'v2.84.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_84_0_title' as TranslationKey,
      descKey: 'changelog.v2_84_0_desc' as TranslationKey,
      highlights: [
        "Planificateur de Tournées (Field Route Planner) : Refonte de la page de la carte avec un layout moderne à 3 panneaux (étapes à gauche, carte au centre, résumé financier à droite).",
        "Trois Variantes de Tournées : Choix instantané entre l'Optimisation Commerciale (Hot d'abord), l'Itinéraire le plus court (heuristique TSP géographique pure) et l'Ordre personnalisé (drag & drop manuel).",
        "Régulateurs Temporels : Configuration de l'heure de départ, de la durée moyenne de visite et des types de départ/destination (GPS, premier lead, boucle de retour, dernier lead).",
        "Calculs Métiers CRM : Calcul du Chiffre d'Affaires potentiel cumulé et du taux de priorité pour chaque variante, avec enregistrement direct de la tournée dans route_plans.",
        "Recalcul en Direct Mode Terrain : Intégration du GPS live (watchPosition) et recalcul dynamique automatique de l'itinéraire restant et des ETAs à chaque étape de la tournée."
      ],
    },
    {
      version: 'v2.83.0',
      date: '2026-06-20',
      titleKey: 'changelog.v2_83_0_title' as TranslationKey,
      descKey: 'changelog.v2_83_0_desc' as TranslationKey,
      highlights: [
        "Prospection Unifiée : Transition d'un modèle multi-sources exposé vers une interface unifiée propulsée par Apify (Google Maps) pour une expérience haut de gamme.",
        "Simplification UX : Suppression des sélecteurs complexes de providers (OSM, Yelp, 411, PagesJaunes, Firecrawl) pour une interface épurée avec un seul bouton d'action.",
        "Statut de Connexion Apify : Indication visuelle claire du statut (Connecté / Non configuré) avec un CTA d'onboarding direct vers la configuration des intégrations.",
        "Fallback Silencieux Serveur : Intégration d'OpenStreetMap (OSM) et du générateur québécois en tant que fallbacks transparents en arrière-plan en cas de souci d'API Apify.",
        "Scoring Côté Serveur : Calcul et enrichissement dynamiques des indicateurs de pertinence (Quality, Opportunity, Proximity) directement par la route d'API unifiée.",
      ],
    },
    {
      version: 'v2.82.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_82_0_title' as TranslationKey,
      descKey: 'changelog.v2_82_0_desc' as TranslationKey,
      highlights: [
        "Profils Agents Structurés : Chaque fiche agent affiche désormais ses instructions système, modèle IA, créativité, type d'entrée (formulaire ou prompt), actions activées et base de connaissances dans des cartes premium séparées.",
        "Mode Édition Complet : Les agents personnalisés ont un bouton Modifier déverrouillant un formulaire d'édition complet identique à la page de création — nom, avatar, instructions, modèle, créativité, actions et labels.",
        "Architecture IA Visuelle : Barre de créativité animée (Déterministe → Créatif), badge de modèle (Rapide / Recommandé / Puissant) et indicateur de niveau de créativité textuel.",
        "Champs de Formulaire Enrichis : Aperçu interactif des champs de formulaire avec types colorés (Texte, Sélection, Date…) et options visibles directement sur la fiche agent.",
        "Actions & Outils Visuels : Toutes les actions de l'agent (Recherche web, Audit GMB, Analyse données…) affichées avec état actif/inactif visuel et icônes distinctes.",
        "Agents Intégrés Enrichis : Metadata statique complète ajoutée pour Audit GMB, Pitcheur Québécois, Radar Réputation et Lucifee (instructions, modèle, créativité, actions réelles).",
      ],
    },
    {
      version: 'v2.81.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_81_0_title' as TranslationKey,
      descKey: 'changelog.v2_81_0_desc' as TranslationKey,
      highlights: [
        "Saisie manuelle : Formulaire dédié pour ajouter des prospects individuellement dans la boîte de validation.",
        "Import CSV local : Lecteur de fichier CSV client avec détection automatique intelligente de colonnes.",
        "Scores client-side : Calcul instantané de complétude, local fit et opportunité pour les leads importés.",
        "Message OSM permanent : Avertissement sur la couverture de la base de données pour orienter la prospection.",
        "Layout Côte-à-Côte : Grille responsive affichant la liste de validation et la carte côte à côte sur grand écran.",
        "Carte Sticky : Rendu de la carte en mode collant lors du défilement vertical de la liste des prospects."
      ],
    },
    {
      version: 'v2.80.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_80_0_title' as TranslationKey,
      descKey: 'changelog.v2_80_0_desc' as TranslationKey,
      highlights: [
        "Architecture Direct-Cloud : Déclassement de la base offline-first SQLite locale d'Electron.",
        "Supabase en temps réel : CRUD direct depuis l'application desktop (leads, tâches, notes, campagnes, Goals).",
        "Spotlight & Tray : Recherche Spotlight et widgets réécrits pour interroger directement la base cloud.",
        "Assistant IA & Canvas Cloud : Sessions, messages et documents persistés sur le cloud avec sécurité RLS."
      ],
    },
    {
      version: 'v2.79.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_79_0_title' as TranslationKey,
      descKey: 'changelog.v2_79_0_desc' as TranslationKey,
      highlights: [
        "Normalisation Téléphone & URLs : Nettoyage automatique des sites web et formatage +1 (514) 555-0199.",
        "Scores d'opportunités : Calcul automatique client/serveur de complétude, local fit, proximité et opportunité.",
        "Inbox de Validation : Interface en 4 onglets persistée localement dans SQLite/Supabase avec panel de scores HSL premium.",
        "Géocodage d'adresse gratuit : Saisie et géocodage textuel d'adresse de recherche via Nominatim OpenStreetMap.",
        "Raccourcis OSM & Doublons : Redirection vers l'éditeur OSM iD et fusion intelligente de doublons CRM/Inbox en un clic.",
        "Actions en bloc : Validation, exclusion, CRM import et suppression en masse des prospects."
      ],
    },
    {
      version: 'v2.78.0',
      date: '2026-06-19',
      titleKey: 'changelog.v2_78_0_title' as TranslationKey,
      descKey: 'changelog.v2_78_0_desc' as TranslationKey,
      highlights: [
        "3 modes de recherche : Autour de moi (géolocalisation GPS navigateur), Par ville (liste Québec), Libre (texte brut).",
        "Overpass around:radius,lat,lon avec coordonnées GPS réelles — fini le centre-ville approximatif.",
        "Bannière 'Centre de recherche' après scrape : label + coordonnées + rayon + raccourci 'Trier par distance'.",
        "Tri Haversine par distance depuis le centre de recherche (km). Option de tri visible uniquement après un scrape géolocalisé.",
        "Bouton 'Lancer la recherche' désactivé en mode GPS tant que la permission n'est pas accordée."
      ],
    },
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
      <div className="max-w-3xl mx-auto px-8 pt-10 pb-24 space-y-8">

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

        {/* ── Tag legend ── */}
        <TagLegend />

        {/* ── Timeline Timeline ── */}
        <div className="relative border-l border-neutral-200/80 ml-5 pl-8 space-y-8 py-2">
          {versions.map((ver) => {
            // Normalize custom date formats so Date can parse them:
            //   "2026-06-21 · 23h19" → "2026-06-21 23:19"
            //   "2026-06-20 10:15"   → unchanged (already parseable)
            const normalizedDate = ver.date
              .replace(/\s*·\s*/, ' ')
              .replace(/(\d{1,2})h(\d{2})/, '$1:$2')
              .trim();
            const dateObj = new Date(normalizedDate);
            const isValid = !Number.isNaN(dateObj.getTime());
            const formattedDate = isValid
              ? dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
              : ver.date;
            const hasTime = /\d{1,2}[:h]\d{2}/.test(ver.date) || ver.date.includes('T');
            const formattedTime = isValid && hasTime
              ? dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              : '';

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
                      <span>
                        {t('changelog.released')} {formattedDate}
                        {formattedTime ? ` à ${formattedTime}` : ''}
                      </span>
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
                    {ver.highlights.map((h, i) => {
                      const isTagged = typeof h !== 'string';
                      const text = isTagged ? h.text : h;
                      return (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-500 font-semibold leading-normal">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {isTagged && <TagBadge tag={(h as { tag: HighlightTag; text: string }).tag} />}
                          <span>{text}</span>
                        </li>
                      );
                    })}
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
