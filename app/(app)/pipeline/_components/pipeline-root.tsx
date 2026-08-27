'use client';

import React from 'react';
import { useQueryState, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useReach } from '@/lib/reach-context';
import { PipelineHeader } from './pipeline-header';
import { PipelineRevenueBar } from './pipeline-revenue-bar';
import { PipelineViewToggle } from './pipeline-view-toggle';
import { PipelineKanbanView } from './pipeline-kanban-view';
import { PipelineTableView } from './pipeline-table-view';
import { PipelineForecastView } from './pipeline-forecast-view';
import { CloturerSubNav } from '@/app/(app)/_components/hub-nav/cloturer-sub-nav';
import { Skeleton } from '@/components/ui/skeleton';

function PipelineKanbanSkeleton() {
  return (
    <div className="w-full h-full overflow-x-auto rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/10 p-4 min-h-[480px]">
      <div className="flex gap-4 h-full align-stretch">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            {i % 2 === 0 && <Skeleton className="h-20 w-full rounded-lg" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineRoot() {
  const { leads, isDataReady } = useReach();

  // Vue/filtres dans l'URL — même pattern que /leads et /contacts : une vue devient
  // un lien partageable/bookmarkable.
  const [view, setView] = useQueryState('view', parseAsStringLiteral(['board', 'table', 'forecast']).withDefault('board'));
  const [niche, setNiche] = useQueryState('niche', parseAsString.withDefault('all'));
  const [owner, setOwner] = useQueryState('owner', parseAsString.withDefault('all'));

  // Filter leads by niche and owner
  const filteredLeads = leads.filter((lead) => {
    const matchesNiche = niche === 'all' || lead.niche === niche;
    const matchesOwner = owner === 'all' || lead.owner === owner;
    return matchesNiche && matchesOwner;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CloturerSubNav />
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Header section with niche/owner selectors */}
      <PipelineHeader
        selectedNiche={niche}
        onNicheChange={(v) => setNiche(v === 'all' ? null : v)}
        selectedOwner={owner}
        onOwnerChange={(v) => setOwner(v === 'all' ? null : v)}
      />

      {/* Revenue KPIs (hidden when no deals exist) */}
      <PipelineRevenueBar leads={filteredLeads} />

      {/* Switcher segmented control — 3 tabs */}
      <PipelineViewToggle view={view} onChange={(v) => setView(v === 'board' ? null : v)} />

      {/* Renders main viewport */}
      <div className="flex-1 overflow-hidden min-h-0">
        {!isDataReady ? (
          <PipelineKanbanSkeleton />
        ) : view === 'board' ? (
          <PipelineKanbanView leads={filteredLeads} />
        ) : view === 'table' ? (
          <PipelineTableView leads={filteredLeads} />
        ) : (
          <PipelineForecastView />
        )}
      </div>
      </div>
    </div>
  );
}
export default PipelineRoot;
