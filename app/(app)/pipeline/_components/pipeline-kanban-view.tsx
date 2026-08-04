'use client';

import React, { useCallback } from 'react';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { PipelineKanbanColumn } from './pipeline-kanban-column';
import { triggerAgentLoop } from '@/lib/agent-trigger';
import { STATUS_LABEL } from '../../leads/columns';

const STAGE_ORDER: Lead['status'][] = ['New', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

interface PipelineKanbanViewProps {
  leads: Lead[];
}

export function PipelineKanbanView({ leads }: PipelineKanbanViewProps) {
  const { updateLeadStatus } = useReach();

  const columns: { id: Lead['status']; title: string }[] = STAGE_ORDER.map((id) => ({ id, title: STATUS_LABEL[id] }));

  const handleDrop = useCallback((leadId: string, status: Lead['status']) => {
    updateLeadStatus(leadId, status);
    triggerAgentLoop('pipeline_stage_change');
  }, [updateLeadStatus]);

  return (
    <div className="w-full h-full overflow-x-auto rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/10 p-4 min-h-[480px]">
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
