'use client';

import React, { useState } from 'react';
import { Lead } from '@/lib/mock-data';
import { PipelineKanbanCard } from './pipeline-kanban-card';
import { STATUS_DOT } from '../../leads/columns';
import { cn } from '@/lib/utils';

interface PipelineKanbanColumnProps {
  column: {
    id: Lead['status'];
    title: string;
  };
  leads: Lead[];
  onDrop: (leadId: string, status: Lead['status']) => void;
}

export function PipelineKanbanColumn({ column, leads, onDrop }: PipelineKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) onDrop(leadId, column.id);
  };

  return (
    <div
      className={cn(
        "flex flex-col w-[280px] shrink-0 rounded-lg border bg-white/40 overflow-hidden transition-all border-t-2",
        isDragOver ? 'border-[#167f5b]/60 ring-2 ring-[#167f5b]/20 bg-[#167f5b]/5' : 'border-[#e5e5e0]'
      )}
      style={{ borderTopColor: STATUS_DOT[column.id] }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header — petit carré coloré + label, jamais un badge plein */}
      <div className="flex items-center justify-between p-3 border-b border-[#e5e5e0]/60 bg-white/60">
        <h3 className="text-xs font-bold text-[#14171A] flex items-center gap-1.5 uppercase tracking-wider">
          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: STATUS_DOT[column.id] }} />
          {column.title}
        </h3>
        <span className="text-[10px] font-bold text-[#8A9098] shrink-0 tabular-nums">
          {leads.length}
        </span>
      </div>

      {/* Cards Scroll Area */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[400px] max-h-[calc(100vh-310px)] scrollbar-thin">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <PipelineKanbanCard key={lead.id} lead={lead} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-[#e5e5e0]/80 bg-[#f4f4f3]/40 text-[#8A9098]">
            <span className="text-[10px] font-medium italic">Aucun prospect</span>
          </div>
        )}
      </div>

      {/* Column footer — deal total */}
      {(() => {
        const totalDeal = leads.reduce((sum, l) => sum + (l.dealAmount ?? 0), 0);
        if (totalDeal === 0) return null;
        return (
          <div className="border-t border-[#e5e5e0]/60 px-3 py-2 bg-white/60 text-[10px] font-bold text-[#8A9098] flex items-center justify-between">
            <span>Pipeline</span>
            <span className="text-[#14171A]">{totalDeal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</span>
          </div>
        );
      })()}
    </div>
  );
}

export default PipelineKanbanColumn;
