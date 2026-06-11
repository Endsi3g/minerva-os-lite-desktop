'use client';

import React from 'react';
import { Lead } from '@/lib/mock-data';
import { PipelineKanbanColumn } from './pipeline-kanban-column';

interface PipelineKanbanViewProps {
  leads: Lead[];
}

export function PipelineKanbanView({ leads }: PipelineKanbanViewProps) {
  const columns: { id: Lead['status']; title: string }[] = [
    { id: 'New', title: 'Nouveau' },
    { id: 'Contacted', title: 'Contacté' },
    { id: 'Meeting Booked', title: 'RDV Fixé' },
    { id: 'Won', title: 'Gagné' },
    { id: 'Lost', title: 'Perdu' },
  ];

  return (
    <div className="w-full h-full overflow-x-auto rounded-lg border border-border bg-muted/10 p-4 min-h-[480px]">
      <div className="flex gap-4 h-full align-stretch">
        {columns.map((column) => (
          <PipelineKanbanColumn
            key={column.id}
            column={column}
            leads={leads.filter((l) => l.status === column.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default PipelineKanbanView;
