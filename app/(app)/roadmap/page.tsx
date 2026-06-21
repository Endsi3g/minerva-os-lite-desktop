'use client';

import React from 'react';
import { Flag, CheckCircle2, Clock, Lightbulb, Archive } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { TranslationKey } from '@/lib/translations';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
  // Available
  { module: 'Prospection', feature: 'Moteur OSM & Apify', desc: 'Recherche locale par secteur, ville, rayon. Fallback automatique OSM si Apify indisponible.', priority: 'high', status: 'available' },
  { module: 'Prospection', feature: 'Imports CSV & manuel', desc: 'Import bulk de leads depuis un fichier CSV ou saisie manuelle depuis /prospecting.', priority: 'high', status: 'available' },
  { module: 'Prospection', feature: 'Validation Inbox', desc: 'Boîte de validation avec tri, scoring, actions groupées et historique des imports.', priority: 'high', status: 'available' },
  { module: 'CRM', feature: 'Leads & Pipeline', desc: 'Gestion complète des leads, pipeline Kanban, probabilités et deals.', priority: 'high', status: 'available' },
  { module: 'CRM', feature: 'Campagnes & Séquences', desc: 'Campagnes multi-leads, séquences email automatisées, quotas et suivi.', priority: 'high', status: 'available' },
  { module: 'Terrain', feature: 'Route Planner & GPS', desc: 'Planification de tournées terrain, recalcul GPS live, ETA, compte-rendus de visite.', priority: 'high', status: 'available' },
  { module: 'Inbox', feature: 'Gmail intégré', desc: "Boîte Gmail dans l'app avec suggestions IA, détection de replies, actions rapides.", priority: 'high', status: 'available' },
  { module: 'IA', feature: 'Agents & Canvas', desc: 'Agents IA custom, assistant Canvas, Hermes, skills et cockpit ops.', priority: 'high', status: 'available' },
  { module: 'Plateforme', feature: 'Google Workspace', desc: 'Connecteurs Gmail, Calendar, Drive, Meet, Places avec OAuth progressif.', priority: 'medium', status: 'available' },
  { module: 'Plateforme', feature: 'Équipes & Workspaces', desc: 'Multi-workspaces, invitations, rôles basiques et cloisonnement des données.', priority: 'medium', status: 'available' },
  { module: 'Analytics', feature: 'Tableau de bord & KPIs', desc: 'Analytics pipeline, quotas, performance par rep et rapports clients.', priority: 'medium', status: 'available' },
  // In progress
  { module: 'Tâches', feature: 'Page /tasks centrale', desc: 'Vue liste + agenda de toutes les tâches du workspace avec filtres et ajout rapide.', priority: 'high', status: 'in_progress' },
  { module: 'Roadmap', feature: 'Cette page /roadmap', desc: "Cartographie produit 4 statuts visible dans l'app pour les membres de l'équipe.", priority: 'medium', status: 'in_progress' },
  // Planned
  { module: 'Booking', feature: 'Scheduling public', desc: 'Page de prise de RDV externe avec Google Calendar, slots, disponibilité et lien partageable.', priority: 'high', status: 'planned' },
  { module: 'CRM', feature: 'Accounts / Entreprises', desc: 'Vue 360° par société regroupant contacts, deals, emails, meetings, notes et visites.', priority: 'high', status: 'planned' },
  { module: 'CRM', feature: 'Multi-contacts par entreprise', desc: 'Plusieurs contacts par business avec rôles, téléphone, email et historique distinct.', priority: 'high', status: 'planned' },
  { module: 'CRM', feature: 'Timeline unifiée', desc: 'Flux chronologique unique par lead/compte : emails, calls, meetings, notes, visites.', priority: 'high', status: 'planned' },
  // Backlog
  { module: 'Plateforme', feature: 'Permissions & audit admin', desc: 'Matrice rôles owner/admin/manager/rep, accès par module, audit log.', priority: 'medium', status: 'backlog' },
  { module: 'Automation', feature: 'Builder visuel', desc: 'Builder trigger → conditions → actions (interface no-code drag & drop).', priority: 'medium', status: 'backlog' },
  { module: 'Contenu', feature: 'Templates email versionnés', desc: 'Bibliothèque de templates email avec A/B tests, snippets partagés et analytics par template.', priority: 'medium', status: 'backlog' },
  { module: 'Google', feature: 'People / Contacts API', desc: "Sync bidirectionnel Google Contacts — importer et enrichir depuis le carnet d'adresses Google.", priority: 'low', status: 'backlog' },
  { module: 'Analytics', feature: 'Reporting avancé', desc: 'Cohortes, velocity pipeline, source attribution, performance par playbook et séquence.', priority: 'low', status: 'backlog' },
];

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-[#f54e00]/10 text-[#f54e00] border-[#f54e00]/30',
  medium: 'bg-muted text-muted-foreground border-border',
  low: 'bg-secondary text-secondary-foreground border-border',
};

const STATUS_CONFIG: Record<RoadmapStatus, { icon: React.ElementType; color: string }> = {
  available: { icon: CheckCircle2, color: 'text-emerald-600' },
  in_progress: { icon: Clock, color: 'text-blue-600' },
  planned: { icon: Lightbulb, color: 'text-amber-600' },
  backlog: { icon: Archive, color: 'text-slate-500' },
};

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
          {t(`roadmap.priority_${item.priority}` as TranslationKey)}
        </Badge>
      </div>
    </Card>
  );
}

export default function RoadmapPage() {
  const { t } = useLanguage();

  const byStatus = (status: RoadmapStatus) => roadmapData.filter(i => i.status === status);

  const tabs: { key: RoadmapStatus; label: string; icon: React.ElementType }[] = [
    { key: 'available', label: t('roadmap.available'), icon: CheckCircle2 },
    { key: 'in_progress', label: t('roadmap.in_progress'), icon: Clock },
    { key: 'planned', label: t('roadmap.planned'), icon: Lightbulb },
    { key: 'backlog', label: t('roadmap.backlog'), icon: Archive },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#f54e00]/10 flex items-center justify-center">
            <Flag className="h-5 w-5 text-[#f54e00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('roadmap.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('roadmap.subtitle')}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {tabs.map(tab => {
            const count = byStatus(tab.key).length;
            const { icon: Icon, color } = STATUS_CONFIG[tab.key];
            return (
              <div key={tab.key} className="rounded-xl border border-border bg-card/60 p-3 text-center">
                <Icon className={cn('h-4 w-4 mx-auto mb-1', color)} />
                <div className="text-xl font-bold text-foreground">{count}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{tab.label}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available">
          <TabsList className="w-full h-9 bg-muted/50 grid grid-cols-4">
            {tabs.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1.5">
                <tab.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{tab.label}</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold">
                  {byStatus(tab.key).length}
                </Badge>
              </TabsTrigger>
            ))}
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
