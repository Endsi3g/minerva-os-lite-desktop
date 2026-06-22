'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Flag, CheckCircle2, Clock, Lightbulb, Archive, Copy, Check, ClipboardCheck, Square, CheckSquare } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { TranslationKey } from '@/lib/translations';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type RoadmapStatus = 'available' | 'in_progress' | 'planned' | 'backlog';
type Priority = 'high' | 'medium' | 'low';

interface RoadmapItem {
  module: string;
  feature: string;
  desc: string;
  priority: Priority;
  status: RoadmapStatus;
}

const roadmapData: RoadmapItem[] = [
  // ─── Available ───────────────────────────────────────────────────────
  { module: 'Prospection', feature: 'Moteur OSM & Apify', desc: 'Recherche locale par secteur, ville, rayon. Fallback automatique OSM si Apify indisponible.', priority: 'high', status: 'available' },
  { module: 'Prospection', feature: 'Imports CSV & manuel', desc: 'Import bulk de leads depuis un fichier CSV ou saisie manuelle depuis /prospecting.', priority: 'high', status: 'available' },
  { module: 'Prospection', feature: 'Validation Inbox', desc: 'Boîte de validation avec tri, scoring, actions groupées et historique des imports.', priority: 'high', status: 'available' },
  { module: 'CRM', feature: 'Leads & Pipeline', desc: 'Gestion complète des leads, pipeline Kanban, probabilités et deals.', priority: 'high', status: 'available' },
  { module: 'CRM', feature: 'Campagnes & Séquences', desc: 'Campagnes multi-leads, séquences email automatisées, quotas et suivi.', priority: 'high', status: 'available' },
  { module: 'Terrain', feature: 'Route Planner & GPS Live', desc: 'Planification de tournées terrain, GPS watchPosition en temps réel, badge variante la plus rapide, ETA, compte-rendus de visite.', priority: 'high', status: 'available' },
  { module: 'Inbox', feature: 'Gmail intégré', desc: "Boîte Gmail dans l'app avec suggestions IA, détection de replies, actions rapides.", priority: 'high', status: 'available' },
  { module: 'IA', feature: 'Agents & Canvas', desc: 'Agents IA custom, assistant Canvas, Hermes, skills et cockpit ops.', priority: 'high', status: 'available' },
  { module: 'Tâches', feature: 'Page /tasks centrale', desc: 'Vue liste + agenda de toutes les tâches du workspace avec filtres, ajout rapide et indicateurs calendrier.', priority: 'high', status: 'available' },
  { module: 'Plateforme', feature: 'Roadmap /roadmap', desc: "Cartographie produit 4 statuts visible dans l'app avec bouton Copier pour l'IA.", priority: 'medium', status: 'available' },
  { module: 'Plateforme', feature: 'Google Workspace', desc: 'Connecteurs Gmail, Calendar, Drive, Meet, Places avec OAuth progressif.', priority: 'medium', status: 'available' },
  { module: 'Plateforme', feature: 'Équipes & Workspaces', desc: 'Multi-workspaces, invitations, rôles basiques et cloisonnement des données.', priority: 'medium', status: 'available' },
  { module: 'Analytics', feature: 'Tableau de bord & KPIs', desc: 'Analytics pipeline, quotas, performance par rep et rapports clients.', priority: 'medium', status: 'available' },

  // ─── Available (shipped v2.93.0+) ────────────────────────────────────
  { module: 'CRM', feature: 'Données prospect dans fiche lead', desc: 'Affichage étoiles, avis Google, téléphone, site web, lien Google Maps directement dans la page lead.', priority: 'high', status: 'available' },
  { module: 'Pipeline', feature: 'Kanban drag & drop', desc: 'Déplacer les leads entre colonnes Kanban par glisser-déposer natif, sans passer par les flèches.', priority: 'high', status: 'available' },
  { module: 'Carte', feature: 'Clic lead → navigation directe', desc: 'Cliquer sur un lead en mode carte centre la vue sur ce lead (flyTo), comme le bouton de localisation GPS.', priority: 'high', status: 'available' },
  { module: 'Carte', feature: 'Calcul de route automatique', desc: 'Dès que 2+ waypoints sont ajoutés, OSRM calcule automatiquement les 3 variantes sans appui manuel.', priority: 'high', status: 'available' },
  { module: 'Board', feature: 'Onglet Boîte de réception', desc: "Onglet Inbox dans la page Today/Board pour accéder à Gmail depuis le tableau de bord.", priority: 'high', status: 'available' },
  { module: 'Inbox', feature: 'Config e-mail sous zéro fil', desc: "Lien 'Configurer votre e-mail →' visible sous 'Aucun fil de discussion' dans la boîte de réception.", priority: 'medium', status: 'available' },
  { module: 'IA', feature: 'Script de pitch IA (Firecrawl)', desc: "Le panel Script dans la fiche lead scrape le site web du prospect et génère un pitch script de 60s personnalisé.", priority: 'high', status: 'available' },
  { module: 'IA', feature: 'Action pills contextuelles', desc: "7 pills d'action dans l'assistant déclenchent de vraies analyses CRM : pipeline, email, priorités, script, recherche, plan du jour, rapport.", priority: 'medium', status: 'available' },

  // ─── In Progress (v2.94.0 scope) ─────────────────────────────────────
  { module: 'Canvas', feature: 'Éditeur riche TipTap + Export', desc: 'Canvas en éditeur WYSIWYG (style Word) avec export PDF, HTML et Markdown. Après export, proposition de déposer dans la Bibliothèque.', priority: 'high', status: 'in_progress' },
  { module: 'Terrain', feature: 'Page visite terrain dédiée', desc: "Page de préparation de visite : script IA, notes passées, compte-rendu. Notification équipe après visite.", priority: 'high', status: 'in_progress' },
  { module: 'Services', feature: 'Page Services & Tarifs', desc: 'Refonte complète avec catalogue de prestations, packages, grilles tarifaires et devis PDF.', priority: 'medium', status: 'in_progress' },
  { module: 'Équipes', feature: 'Invitations via lien (sans SMTP)', desc: "Remplacement du système SMTP par un lien d'invitation sécurisé, sans configuration email requise.", priority: 'high', status: 'available' },
  { module: 'Équipes', feature: 'Quitter une équipe', desc: "Un membre peut quitter un workspace. Son accès est révoqué immédiatement et la table team_members est nettoyée.", priority: 'medium', status: 'available' },
  { module: 'Équipes', feature: 'Rôles personnalisés & Permissions', desc: "Onglet Rôles dans /team : création de rôles custom avec 19 toggles de modules. Sidebar filtrée selon le rôle effectif (défaut ou custom).", priority: 'high', status: 'available' },
  { module: 'Équipes', feature: 'Page invitation redesignée', desc: "Page /join animée : avatar workspace, confetti à l'acceptation, badge rôle avec description, preview des modules accessibles.", priority: 'medium', status: 'available' },

  // ─── In Progress ─────────────────────────────────────────────────────
  { module: 'Booking', feature: 'Scheduling public / Booking Links', desc: 'Page publique /book/[username] avec Google Calendar freebusy, slots disponibles et lien partageable. APIs créées, page publique live.', priority: 'high', status: 'in_progress' },
  { module: 'Équipes', feature: 'Page dédiée gestion de rôle membre', desc: 'Page /team/member/[id] : assigner un rôle prédéfini ou personnalisé à un membre, créer un rôle inline.', priority: 'medium', status: 'available' },

  // ─── Planned : Intégrations à activer (lourdes, planifiées) ───────────
  { module: 'Intégrations', feature: 'Slack', desc: 'Notifications et alertes CRM poussées dans des canaux Slack (nouveaux leads, deals gagnés, réponses).', priority: 'medium', status: 'planned' },
  { module: 'Intégrations', feature: 'Notion', desc: 'Synchronisation bidirectionnelle des leads et notes vers des bases de données Notion.', priority: 'medium', status: 'planned' },
  { module: 'Intégrations', feature: 'Microsoft SharePoint', desc: 'Export et stockage des documents et rapports clients sur SharePoint.', priority: 'low', status: 'planned' },
  { module: 'Intégrations', feature: 'Meeting recorder', desc: 'Capture et transcription automatique des réunions, liées aux fiches leads.', priority: 'low', status: 'planned' },
  { module: 'Intégrations', feature: 'Webhooks Website', desc: 'Réception des formulaires de site web entrants comme leads taggés (déjà en partie via /integrations/forms).', priority: 'medium', status: 'planned' },

  // ─── Planned ─────────────────────────────────────────────────────────
  { module: 'CRM', feature: 'Accounts / Entreprises', desc: 'Vue 360° par société regroupant contacts, deals, emails, meetings, notes et visites.', priority: 'high', status: 'planned' },
  { module: 'CRM', feature: 'Timeline unifiée par compte', desc: 'Flux chronologique unique par lead/compte : emails, calls, meetings, notes, visites.', priority: 'high', status: 'planned' },

  // ─── Available (v2.98) ────────────────────────────────────────────────
  { module: 'Terrain', feature: 'Page préparation de visite', desc: 'Page /field/[plan]/prepare/[lead] : script IA, notes passées, pré-notes, notification équipe avant départ.', priority: 'medium', status: 'available' },
  { module: 'Automation', feature: 'Builder visuel d\'automations', desc: 'Page /settings/automations/new : builder 4 étapes — déclencheur, conditions, actions, confirmer. Enregistrement en base.', priority: 'medium', status: 'available' },
  { module: 'Contenu', feature: 'Templates email versionnés', desc: 'Page /settings/email-templates : bibliothèque avec A/B tests, tags, snippets partagés et analytics par template.', priority: 'medium', status: 'available' },
  { module: 'Google', feature: 'People / Contacts API', desc: "API /api/google/contacts : import Google Contacts → leads, création contact depuis leads. Scope contacts.readonly ajouté.", priority: 'low', status: 'available' },
  { module: 'Plateforme', feature: 'Notifications desktop + rappels', desc: 'Service de notifications desktop (Electron + Web Notification API). Rappels quotidiens : tâches en retard, pipeline vide, tâches du jour.', priority: 'medium', status: 'available' },

  // ─── Backlog ──────────────────────────────────────────────────────────
  { module: 'Canvas', feature: 'IA ouvre le canvas automatiquement', desc: "L'IA détecte quand la réponse nécessite le canvas (long document, rapport, script) et l'ouvre automatiquement. Sidebar se réduit à l'ouverture.", priority: 'medium', status: 'backlog' },
  { module: 'Terrain', feature: 'Notifications équipe après visite', desc: "Après un compte-rendu de visite terrain, notifier les membres de l'équipe dans l'app avec le résultat et les prochaines étapes.", priority: 'medium', status: 'backlog' },
  { module: 'Plateforme', feature: 'Audit log admin', desc: "Journal d'audit des actions : qui a modifié quoi, quand. Visible uniquement par l'owner.", priority: 'medium', status: 'backlog' },
  { module: 'Analytics', feature: 'Reporting avancé', desc: 'Cohortes, velocity pipeline, source attribution, performance par playbook et séquence.', priority: 'low', status: 'backlog' },
];

// ── Manual verification checklist, accumulated per release phase ──────────────
interface PhaseVerification {
  phase: string;
  version: string;
  date: string;
  checks: string[];
}

const VERIFICATIONS: PhaseVerification[] = [
  {
    phase: 'Phase 10 — Connexion Google & OAuth',
    version: 'v3.10.0',
    date: '2026-06-22',
    checks: [
      'Sur /inbox (non connecté), cliquer « Connecter mon compte Gmail » : la nouvelle fenêtre à deux volets s\'affiche.',
      'Cliquer « Connecter Google » lance le flux OAuth Google.',
      'IMPORTANT : enregistrer https://minerva-os-lite-desktop.vercel.app/api/google/auth/callback ET /api/auth/google/callback dans Google Cloud Console (Identifiants OAuth → URI de redirection autorisés).',
      'Vérifier que NEXT_PUBLIC_APP_URL = https://minerva-os-lite-desktop.vercel.app dans Vercel.',
      'Après connexion, l\'erreur redirect_uri_mismatch ne doit plus apparaître et les fils Gmail se chargent.',
    ],
  },
  {
    phase: 'Phase 9 — Page de rendez-vous dédiée',
    version: 'v3.9.0',
    date: '2026-06-22',
    checks: [
      'Sur /agenda, cliquer « Nouveau RDV » ouvre la page dédiée /agenda/new (et non plus seulement la modale).',
      'La date sélectionnée dans le calendrier est pré-remplie sur la page (paramètre ?date=).',
      'Créer un RDV depuis la page : retour à /agenda, le RDV apparaît dans le jour concerné.',
      'Les options Notifier l\'équipe / Google Agenda / Todoist fonctionnent comme dans la modale.',
      'Vérifier que /agenda et /agenda/new respectent la charte (couleurs, rayons, typographie).',
    ],
  },
  {
    phase: 'Phase 8 — Vérifications cochables & notifications IA',
    version: 'v3.8.0',
    date: '2026-06-22',
    checks: [
      'Dans cet onglet, cliquer une vérification la coche (texte barré) ; le compteur N/Total se met à jour.',
      'Recharger la page : les cases cochées restent cochées (persistées).',
      'Avec « Suggérer des relances » actif et des leads tièdes/froids : une notification quotidienne apparaît dans la cloche.',
      'Vérifier que CLAUDE.md liste les pages Agenda, Skills, Inbox, Field et les deux flux de jetons Google.',
    ],
  },
  {
    phase: 'Phase 7 — Mentions notifiées & images plein écran',
    version: 'v3.7.0',
    date: '2026-06-22',
    checks: [
      'Dans le chat d\'équipe, @mentionner un autre membre : ce membre reçoit une notification (cloche).',
      'Se mentionner soi-même ne crée pas de notification.',
      'Envoyer une image dans le chat, puis cliquer dessus : elle s\'ouvre en plein écran.',
      'Un autre membre peut aussi cliquer la même image pour l\'agrandir.',
      'Fermer le plein écran via le bouton X ou en cliquant à l\'extérieur.',
    ],
  },
  {
    phase: 'Phase 6 — Intelligence comportementale',
    version: 'v3.6.0',
    date: '2026-06-22',
    checks: [
      'Exécuter supabase_migration_v360.sql (colonnes auto_insights / auto_follow_ups).',
      'Paramètres → IA → activer « Générer automatiquement des analyses hebdomadaires » et « Suggérer des relances » ; recharger : les toggles restent activés (persistés).',
      'Sur /today, le widget « Intelligence comportementale » apparaît quand au moins un toggle est actif.',
      'Cliquer « Bilan » : un bilan d\'opportunités IA s\'affiche et une notification est créée.',
      'Avec « Suggérer des relances » actif : des actions préconfigurées apparaissent pour les leads tièdes/froids ; « Créer » génère une tâche de relance.',
      'Le week-end, le bilan se génère automatiquement une fois (vérifiable via la notification).',
    ],
  },
  {
    phase: 'Phase 5 — Activité d\'équipe & conformité design',
    version: 'v3.5.0',
    date: '2026-06-22',
    checks: [
      'Sur /today, le widget « Activité de l\'équipe » liste les événements réels (leads créés, deals gagnés, tâches terminées) triés par date.',
      'Sur /services, vérifier la typographie (plus de font-black) conforme à la charte.',
      'Sur /settings/automations, les déclencheurs affichent des icônes (sablier, flamme, message) au lieu d\'emojis.',
      'Dans /roadmap onglet « Prévu », les intégrations Slack, Notion, SharePoint, Meeting recorder, Webhooks site web sont listées.',
    ],
  },
  {
    phase: 'Phase 4 — Canvas automatique & OpenRouter',
    version: 'v3.4.0',
    date: '2026-06-22',
    checks: [
      "Dans l'Assistant IA, demander un document long (ex : « Rédige une proposition commerciale complète pour … ») : le Canvas s'ouvre automatiquement et contient le document.",
      'Pour une question courte, l\'assistant répond normalement sans ouvrir le Canvas.',
      'Vérifier que les modèles OpenRouter (Llama, Gemini, Vision…) répondent dans l\'assistant.',
      'Vérifier que les scripts de visite terrain et brouillons d\'emails (basés sur Claude) fonctionnent toujours.',
      'Confirmer dans Vercel que OPENROUTER_API_KEY est présent (Production + Development).',
      'Sélectionner le modèle « Vision (texte + image) » et confirmer une réponse.',
    ],
  },
  {
    phase: 'Phase 3 — Boîte de réception',
    version: 'v3.3.0',
    date: '2026-06-22',
    checks: [
      'Connecter Google via le bouton de la boîte de réception (pack communication).',
      'Recharger /inbox : la liste des fils Gmail liés à des leads s\'affiche (plus d\'écran « non connecté » alors que Google est connecté).',
      'Ouvrir un fil : les messages se chargent et « Suggestions IA » propose des réponses.',
      'Envoyer une réponse depuis l\'inbox : elle part via votre adresse Gmail.',
      'Vérifier que l\'écran de connexion affiche des icônes (pas d\'emojis) et les bonnes couleurs.',
    ],
  },
  {
    phase: 'Phase 2 — Agenda & prise de rendez-vous',
    version: 'v3.2.0',
    date: '2026-06-22',
    checks: [
      "« Agenda » apparaît dans la barre latérale (élément épinglé, visible même barre réduite).",
      'Ouvrir /agenda : le calendrier mensuel s\'affiche, navigation mois précédent/suivant fonctionne.',
      'Cliquer une date la sélectionne ; double-clic (ou bouton +) ouvre la fenêtre de rendez-vous.',
      'Créer un RDV (titre + heure + durée + lead) : il apparaît dans le panneau du jour et le point du calendrier.',
      'Cocher « Notifier l\'équipe » : les autres membres reçoivent une notification.',
      'Avec Google connecté + « Ajouter à Google Agenda » : l\'événement apparaît dans Google Calendar.',
      'Avec un token Todoist dans Paramètres + « Créer une tâche Todoist » : la tâche apparaît dans Todoist à l\'heure du RDV.',
    ],
  },
  {
    phase: 'Phase 1 — Mode Terrain : compte-rendu enrichi',
    version: 'v3.1.0',
    date: '2026-06-22',
    checks: [
      "Ouvrir une tournée terrain → un lead → « Enregistrer » : la page défile jusqu'en bas et le bouton Confirmer est atteignable.",
      'Choisir un résultat (Visité / Absent / RDV / Non intéressé) : les champs de contexte apparaissent.',
      'Remplir « Contact rencontré », choisir un niveau d\'intérêt (Chaud/Tiède/Froid).',
      'Ajouter une photo preuve (caméra ou fichier) : l\'aperçu s\'affiche et peut être supprimé.',
      'Confirmer : retour à la tournée, et les autres membres reçoivent une notification avec le résultat + contexte.',
      "Exécuter supabase_migration_v310.sql dans Supabase pour activer contact_met / interest_level / proof_image.",
    ],
  },
];

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-[#059669]/10 text-[#059669] border-[#059669]/30',
  medium: 'bg-muted text-muted-foreground border-border',
  low: 'bg-secondary text-secondary-foreground border-border',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Priorité haute',
  medium: 'Priorité moyenne',
  low: 'Faible',
};

const STATUS_CONFIG: Record<RoadmapStatus, { icon: React.ElementType; color: string; label: string }> = {
  available:   { icon: CheckCircle2, color: 'text-emerald-600', label: 'Disponible' },
  in_progress: { icon: Clock,        color: 'text-blue-600',    label: 'En cours' },
  planned:     { icon: Lightbulb,    color: 'text-amber-600',   label: 'Prévu' },
  backlog:     { icon: Archive,      color: 'text-slate-500',   label: 'Backlog' },
};

function buildAiPrompt(items: RoadmapItem[]): string {
  const byStatus = (s: RoadmapStatus) => items.filter(i => i.status === s);
  const formatItems = (list: RoadmapItem[]) =>
    list.map(i => `  - [${i.priority.toUpperCase()}] ${i.module} / ${i.feature}: ${i.desc}`).join('\n');

  return `# Minerva OS Reach Lite — World Map (Roadmap)
Date: ${new Date().toLocaleDateString('fr-CA')}
Stack: Next.js 16 App Router • TypeScript • TailwindCSS v4 • Supabase • SQLite (Electron) • MapLibre GL • shadcn/ui • Anthropic SDK

## ✅ Disponible (${byStatus('available').length} éléments)
${formatItems(byStatus('available'))}

## 🔵 En cours (${byStatus('in_progress').length} éléments)
${formatItems(byStatus('in_progress'))}

## 🟡 Prévu (${byStatus('planned').length} éléments)
${formatItems(byStatus('planned'))}

## 📦 Backlog (${byStatus('backlog').length} éléments)
${formatItems(byStatus('backlog'))}

---
## INSTRUCTIONS POUR L'IA

Tu es un développeur senior expert sur ce projet. Le codebase suit un pattern dual-store : SQLite (Electron via window.electron IPC) ou Supabase directement (web). Toutes les mutations passent par ReachContext (lib/reach-context.tsx). Les pages utilisent le pattern *-root.tsx (server wrapper → client component). Les traductions (FR/EN/DE) doivent être mises à jour dans lib/translations.ts avec les 3 locales identiques.

Avant de commencer l'implémentation des éléments "En cours", pose à l'utilisateur toutes les questions nécessaires pour clarifier :
1. Le scope exact et l'ordre de priorité des features à implémenter cette session
2. Les contraintes UX spécifiques (comportements attendus, cas limites)
3. Les intégrations existantes à respecter ou modifier
4. Les contraintes de temps ou de crédits IA disponibles

Une fois les réponses obtenues, implémente les fonctionnalités dans l'ordre de priorité, en commitant et pushant à chaque étape significative.`;
}

function RoadmapCard({ item, t }: { item: RoadmapItem; t: (k: TranslationKey, fallback?: string) => string }) {
  const { icon: Icon, color } = STATUS_CONFIG[item.status];
  return (
    <Card className="p-4 border-border bg-card/60 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.module}</span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{item.feature}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn('text-[9px] font-bold uppercase shrink-0 px-2 py-0.5 border', PRIORITY_STYLES[item.priority])}>
          {t(`roadmap.priority_${item.priority}` as TranslationKey, PRIORITY_LABEL[item.priority])}
        </Badge>
      </div>
    </Card>
  );
}

export default function RoadmapPage() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Persisted "done" state for manual verification checks (keyed by stable string)
  const [checkedVerifs, setCheckedVerifs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem('minerva_verif_checks');
      if (stored) setCheckedVerifs(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);
  const toggleVerif = useCallback((key: string) => {
    setCheckedVerifs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('minerva_verif_checks', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const byStatus = (status: RoadmapStatus) => roadmapData.filter(i => i.status === status);

  const handleCopyForAi = useCallback(async () => {
    const prompt = buildAiPrompt(roadmapData);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('World Map copiée pour l\'IA', { description: 'Collez dans Claude, GPT ou tout autre modèle.' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Impossible de copier dans le presse-papiers');
    }
  }, []);

  const tabs: { key: RoadmapStatus; icon: React.ElementType }[] = [
    { key: 'available',   icon: CheckCircle2 },
    { key: 'in_progress', icon: Clock },
    { key: 'planned',     icon: Lightbulb },
    { key: 'backlog',     icon: Archive },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#059669]/10 flex items-center justify-center">
              <Flag className="h-5 w-5 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('roadmap.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('roadmap.subtitle')}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyForAi}
            className="gap-2 shrink-0 text-xs border-dashed"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#059669]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copié !' : 'Copier pour l\'IA'}
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {tabs.map(tab => {
            const count = byStatus(tab.key).length;
            const { icon: Icon, color, label } = STATUS_CONFIG[tab.key];
            return (
              <div key={tab.key} className="rounded-xl border border-border bg-card/60 p-3 text-center">
                <Icon className={cn('h-4 w-4 mx-auto mb-1', color)} />
                <div className="text-xl font-bold text-foreground">{count}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="in_progress">
          <TabsList className="w-full h-9 bg-muted/50 grid grid-cols-5">
            {tabs.map(tab => {
              const { icon: Icon, label } = STATUS_CONFIG[tab.key];
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1.5">
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{label}</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold">
                    {byStatus(tab.key).length}
                  </Badge>
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="verification" className="text-xs gap-1.5">
              <ClipboardCheck className="h-3 w-3" />
              <span className="hidden sm:inline">Vérification</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold">
                {VERIFICATIONS.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.key} value={tab.key} className="mt-4 space-y-3">
              {byStatus(tab.key).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun élément dans cet onglet.</p>
              ) : (
                byStatus(tab.key).map((item, i) => (
                  <RoadmapCard key={i} item={item} t={t} />
                ))
              )}
            </TabsContent>
          ))}

          {/* Manual verification checklist per release phase */}
          <TabsContent value="verification" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Vérifications manuelles à effectuer après chaque phase déployée. Cochez mentalement chaque point pour valider la release.
            </p>
            {VERIFICATIONS.map((v, i) => {
              const total = v.checks.length;
              const doneCount = v.checks.filter((_, j) => checkedVerifs[`${v.version}-${j}`]).length;
              return (
                <Card key={i} className="p-4 border-border bg-card/60 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{v.phase}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        'text-[9px] font-bold px-2 py-0.5 border',
                        doneCount === total
                          ? 'border-[#059669]/30 bg-[#059669]/10 text-[#059669]'
                          : 'border-border bg-muted text-muted-foreground',
                      )}>
                        {doneCount}/{total}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 border-[#059669]/30 bg-[#059669]/10 text-[#059669]">
                        {v.version}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{v.date}</span>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {v.checks.map((c, j) => {
                      const key = `${v.version}-${j}`;
                      const done = !!checkedVerifs[key];
                      return (
                        <li key={j}>
                          <button
                            onClick={() => toggleVerif(key)}
                            className="w-full flex items-start gap-2 text-xs leading-relaxed text-left rounded-md p-1 hover:bg-muted/40 transition-colors"
                          >
                            {done
                              ? <CheckSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#059669]" />
                              : <Square className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#7a7a76]" />}
                            <span className={cn(done ? 'text-muted-foreground line-through' : 'text-foreground')}>{c}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
