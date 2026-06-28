'use client';

import React, { useCallback } from 'react';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { PipelineKanbanColumn } from './pipeline-kanban-column';

interface PipelineKanbanViewProps {
  leads: Lead[];
}

export function PipelineKanbanView({ leads }: PipelineKanbanViewProps) {
  const { updateLeadStatus } = useReach();

  const columns: { id: Lead['status']; title: string }[] = [
    { id: 'New', title: 'Nouveau' },
    { id: 'Contacted', title: 'Contacté' },
    { id: 'Meeting Booked', title: 'RDV Fixé' },
    { id: 'Proposal Sent', title: 'Proposition envoyée' },
    { id: 'Negotiation', title: 'Négociation' },
    { id: 'Won', title: 'Gagné' },
    { id: 'Lost', title: 'Perdu' },
  ];

  const handleDrop = useCallback((leadId: string, status: Lead['status']) => {
    updateLeadStatus(leadId, status);
  }, [updateLeadStatus]);

  return (
    <div className="w-full h-full overflow-x-auto rounded-lg border border-border bg-muted/10 p-4 min-h-[480px]">
      <div className="flex gap-4 h-full align-stretch">
        {columns.map((column) => (
          <PipelineKanbanColumn
            key={column.id}
            column={column}
            leads={leads.filter((l) => l.status === column.id)}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}

export default PipelineKanbanView;
