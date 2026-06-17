'use client';

import React, { useState } from 'react';
import { useReach } from '@/lib/reach-context';
import { PipelineHeader } from './pipeline-header';
import { PipelineRevenueBar } from './pipeline-revenue-bar';
import { PipelineViewToggle } from './pipeline-view-toggle';
import { PipelineKanbanView } from './pipeline-kanban-view';
import { PipelineTableView } from './pipeline-table-view';

export function PipelineRoot() {
  const { leads } = useReach();
  const [view, setView] = useState<'board' | 'table'>('board');
  const [niche, setNiche] = useState('all');
  const [owner, setOwner] = useState('all');

  // Filter leads by niche and owner
  const filteredLeads = leads.filter((lead) => {
    const matchesNiche = niche === 'all' || lead.niche === niche;
    const matchesOwner = owner === 'all' || lead.owner === owner;
    return matchesNiche && matchesOwner;
  });

  return (
    <div className="flex h-full flex-col gap-5 p-6 overflow-hidden">
      {/* Header section with niche/owner selectors */}
      <PipelineHeader
        selectedNiche={niche}
        onNicheChange={setNiche}
        selectedOwner={owner}
        onOwnerChange={setOwner}
      />

      {/* Revenue KPIs (hidden when no deals exist) */}
      <PipelineRevenueBar leads={filteredLeads} />

      {/* Switcher segmented control */}
      <PipelineViewToggle view={view} onChange={setView} />

      {/* Renders main viewport */}
      <div className="flex-1 overflow-hidden min-h-0">
        {view === 'board' ? (
          <PipelineKanbanView leads={filteredLeads} />
        ) : (
          <PipelineTableView leads={filteredLeads} />
        )}
      </div>
    </div>
  );
}
export default PipelineRoot;
