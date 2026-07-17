'use client';

import React, { useState } from 'react';
import { useReach } from '@/lib/reach-context';
import { PipelineHeader } from './pipeline-header';
import { PipelineRevenueBar } from './pipeline-revenue-bar';
import { PipelineViewToggle } from './pipeline-view-toggle';
import { PipelineKanbanView } from './pipeline-kanban-view';
import { PipelineTableView } from './pipeline-table-view';
import { PipelineForecastView } from './pipeline-forecast-view';
import { Kanban, Table, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadsSubNav } from '../../leads/_components/leads-sub-nav';
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
  const [view, setView] = useState<'board' | 'table' | 'forecast'>('board');
  const [niche, setNiche] = useState('all');
  const [owner, setOwner] = useState('all');

  // Filter leads by niche and owner
  const filteredLeads = leads.filter((lead) => {
    const matchesNiche = niche === 'all' || lead.niche === niche;
    const matchesOwner = owner === 'all' || lead.owner === owner;
    return matchesNiche && matchesOwner;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <LeadsSubNav />
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Header section with niche/owner selectors */}
      <PipelineHeader
        selectedNiche={niche}
        onNicheChange={setNiche}
        selectedOwner={owner}
        onOwnerChange={setOwner}
      />

      {/* Revenue KPIs (hidden when no deals exist) */}
      <PipelineRevenueBar leads={filteredLeads} />

      {/* Switcher segmented control — 3 tabs */}
      <div className="flex bg-[#f4f4f3]/65 p-1 rounded-lg self-start gap-1 select-none">
        <button
          type="button"
          onClick={() => setView('board')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all",
            view === 'board'
              ? "bg-white text-[#26251e] shadow-xs border-[#e5e5e0]/10"
              : "text-[#7a7a76] hover:text-[#26251e]"
          )}
        >
          <Kanban className="h-3.5 w-3.5" />
          <span>Tableau Kanban</span>
        </button>
        <button
          type="button"
          onClick={() => setView('table')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all",
            view === 'table'
              ? "bg-white text-[#26251e] shadow-xs border-[#e5e5e0]/10"
              : "text-[#7a7a76] hover:text-[#26251e]"
          )}
        >
          <Table className="h-3.5 w-3.5" />
          <span>Vue en Tableau</span>
        </button>
        <button
          type="button"
          onClick={() => setView('forecast')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all",
            view === 'forecast'
              ? "bg-white text-[#26251e] shadow-xs border-[#e5e5e0]/10"
              : "text-[#7a7a76] hover:text-[#26251e]"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Prévisions</span>
        </button>
      </div>

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
