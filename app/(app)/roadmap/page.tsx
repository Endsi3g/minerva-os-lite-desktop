'use client';

import React, { useState, useCallback } from 'react';
import { Flag, CheckCircle2, Clock, Lightbulb, Archive, Copy, Check } from 'lucide-react';
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

  // ─── In Progress (v2.93.0 scope) ─────────────────────────────────────
  { module: 'CRM', feature: 'Données prospect dans fiche lead', desc: 'Affichage étoiles, avis Google, téléphone, site web, lien Google Maps et description directement dans la page lead.', priority: 'high', status: 'in_progress' },
  { module: 'Pipeline', feature: 'Kanban drag & drop', desc: 'Déplacer les leads entre colonnes Kanban par glisser-déposer natif, sans passer par les flèches.', priority: 'high', status: 'in_progress' },
  { module: 'Carte', feature: 'Clic lead → navigation directe', desc: 'Cliquer sur un lead en mode carte centre la vue sur ce lead (flyTo), comme le bouton de localisation GPS.', priority: 'high', status: 'in_progress' },
  { module: 'Carte', feature: 'Calcul de route automatique', desc: 'Dès que 2+ waypoints sont ajoutés, OSRM calcule automatiquement les 3 variantes sans appui manuel.', priority: 'high', status: 'in_progress' },
  { module: 'Board', feature: 'Onglet Boîte de réception', desc: "Ajout de l'onglet Inbox dans la page Today/Board afin que les e-mails soient visibles en permanence depuis le tableau de bord.", priority: 'high', status: 'in_progress' },
  { module: 'Inbox', feature: 'Config e-mail sous zéro fil', desc: "Bouton 'Configurer l'e-mail' ou 'Changer de compte' visible sous le message 'Zéro fil de discussion' dans la boîte de réception.", priority: 'medium', status: 'in_progress' },
  { module: 'IA', feature: 'Bouton Script fonctionnel', desc: "Le bouton Script dans la fiche lead scrape le site web du prospect (Firecrawl) et génère un pitch script personnalisé via l'IA.", priority: 'high', status: 'in_progress' },
  { module: 'IA', feature: 'Action pills réelles dans le chat', desc: "Les pills d'action sous le chat assistant déclenchent de vraies actions IA (résumer leads, rédiger email, analyser pipeline) au lieu de texte hardcodé.", priority: 'medium', status: 'in_progress' },

  // ─── Planned ─────────────────────────────────────────────────────────
  { module: 'Booking', feature: 'Scheduling public / Booking Links', desc: 'Page publique /book/[username] avec Google Calendar freebusy, slots disponibles et lien partageable. Nécessite scope calendar.events OAuth.', priority: 'high', status: 'planned' },
  { module: 'Équipes', feature: 'Invitations via lien (sans SMTP)', desc: "Remplacement du système d'invitation par email SMTP par un lien d'invitation sécurisé, sans configuration SMTP requise.", priority: 'high', status: 'planned' },
  { module: 'Canvas', feature: 'Éditeur riche TipTap + Export', desc: 'Canvas en éditeur WYSIWYG (style Word) avec export PDF, HTML et Markdown. Après export, proposition de déposer dans la Bibliothèque.', priority: 'high', status: 'planned' },
  { module: 'Terrain', feature: 'Page visite terrain dédiée', desc: "Page de préparation de visite montrant les recherches sur le prospect, le script IA, les notes passées. Ajout de compte-rendu avec notification aux membres de l'équipe.", priority: 'high', status: 'planned' },
  { module: 'Services', feature: 'Page Services & Tarifs', desc: 'Refonte complète de la page services/tarifs avec catalogue de prestations, packages, grilles tarifaires et devis PDF.', priority: 'medium', status: 'planned' },
  { module: 'CRM', feature: 'Accounts / Entreprises', desc: 'Vue 360° par société regroupant contacts, deals, emails, meetings, notes et visites.', priority: 'high', status: 'planned' },
  { module: 'CRM', feature: 'Timeline unifiée par compte', desc: 'Flux chronologique unique par lead/compte : emails, calls, meetings, notes, visites.', priority: 'high', status: 'planned' },

  // ─── Backlog ──────────────────────────────────────────────────────────
  { module: 'Canvas', feature: 'IA ouvre le canvas automatiquement', desc: "L'IA détecte quand la réponse nécessite le canvas (long document, rapport, script) et l'ouvre automatiquement. Sidebar se réduit à l'ouverture.", priority: 'medium', status: 'backlog' },
  { module: 'Terrain', feature: 'Notifications équipe après visite', desc: "Après un compte-rendu de visite terrain, notifier les membres de l'équipe dans l'app avec le résultat et les prochaines étapes.", priority: 'medium', status: 'backlog' },
  { module: 'Plateforme', feature: 'Permissions & audit admin', desc: 'Matrice rôles owner/admin/manager/rep, accès par module, audit log.', priority: 'medium', status: 'backlog' },
  { module: 'Automation', feature: 'Builder visuel', desc: 'Builder trigger → conditions → actions (interface no-code drag & drop).', priority: 'medium', status: 'backlog' },
  { module: 'Contenu', feature: 'Templates email versionnés', desc: 'Bibliothèque de templates email avec A/B tests, snippets partagés et analytics par template.', priority: 'medium', status: 'backlog' },
  { module: 'Google', feature: 'People / Contacts API', desc: "Sync bidirectionnel Google Contacts — importer et enrichir depuis le carnet d'adresses Google.", priority: 'low', status: 'backlog' },
  { module: 'Analytics', feature: 'Reporting avancé', desc: 'Cohortes, velocity pipeline, source attribution, performance par playbook et séquence.', priority: 'low', status: 'backlog' },
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
          <TabsList className="w-full h-9 bg-muted/50 grid grid-cols-4">
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
        </Tabs>
      </div>
    </div>
  );
}
