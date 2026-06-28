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

export function PipelineRoot() {
  const { leads } = useReach();
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
    <div className="flex h-full flex-col gap-4 p-3 sm:p-4 md:p-6 overflow-hidden">
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
      <div className="flex bg-muted/65 p-1 rounded-lg self-start gap-1 select-none">
        <button
          type="button"
          onClick={() => setView('board')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all",
            view === 'board'
              ? "bg-card text-foreground shadow-xs border-border/10"
              : "text-muted-foreground hover:text-foreground"
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
              ? "bg-card text-foreground shadow-xs border-border/10"
              : "text-muted-foreground hover:text-foreground"
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
              ? "bg-card text-foreground shadow-xs border-border/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Prévisions</span>
        </button>
      </div>

      {/* Renders main viewport */}
      <div className="flex-1 overflow-hidden min-h-0">
        {view === 'board' && <PipelineKanbanView leads={filteredLeads} />}
        {view === 'table' && <PipelineTableView leads={filteredLeads} />}
        {view === 'forecast' && <PipelineForecastView />}
      </div>
    </div>
  );
}
export default PipelineRoot;
