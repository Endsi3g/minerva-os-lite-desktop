'use client';

import React, { useState } from 'react';
import { Lead } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { PipelineKanbanCard } from './pipeline-kanban-card';
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
  // Styles for column styling
  const getHeaderStyle = (id: Lead['status']) => {
    switch (id) {
      case 'New':
        return 'border-t-2 border-t-blue-500 bg-blue-50/10';
      case 'Contacted':
        return 'border-t-2 border-t-amber-500 bg-amber-50/10';
      case 'Meeting Booked':
        return 'border-t-2 border-t-purple-500 bg-purple-50/10';
      case 'Proposal Sent':
        return 'border-t-2 bg-violet-50/10' + ' ' + 'border-t-[#7c3aed]';
      case 'Negotiation':
        return 'border-t-2 bg-amber-50/10' + ' ' + 'border-t-[#d97706]';
      case 'Won':
        return 'border-t-2 border-t-emerald-500 bg-emerald-50/10';
      case 'Lost':
        return 'border-t-2 border-t-rose-500 bg-rose-50/10';
      default:
        return 'border-t-2 border-t-slate-500 bg-slate-50/10';
    }
  };

  const getBadgeStyle = (id: Lead['status']) => {
    switch (id) {
      case 'New':
        return 'bg-blue-100 text-blue-700';
      case 'Contacted':
        return 'bg-amber-100 text-amber-700';
      case 'Meeting Booked':
        return 'bg-purple-100 text-purple-700';
      case 'Proposal Sent':
        return 'bg-violet-100 text-violet-700';
      case 'Negotiation':
        return 'bg-amber-100 text-amber-700';
      case 'Won':
        return 'bg-emerald-100 text-emerald-700';
      case 'Lost':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

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
        "flex flex-col w-[280px] shrink-0 rounded-lg border bg-white/40 overflow-hidden transition-all",
        getHeaderStyle(column.id),
        isDragOver ? 'border-primary/60 ring-2 ring-primary/20 bg-[#059669]/5' : 'border-[#e5e5e0]'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#e5e5e0]/60 bg-white/60">
        <h3 className="text-xs font-bold text-[#26251e] flex items-center gap-1.5 uppercase tracking-wider">
          {column.title}
        </h3>
        <Badge 
          variant="secondary" 
          className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-none border-none", getBadgeStyle(column.id))}
        >
          {leads.length}
        </Badge>
      </div>

      {/* Cards Scroll Area */}
      <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[400px] max-h-[calc(100vh-310px)] scrollbar-thin">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <PipelineKanbanCard key={lead.id} lead={lead} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-[#e5e5e0]/80 bg-[#f4f4f3]/40 text-[#7a7a76]">
            <span className="text-[10px] font-medium italic">Aucun prospect</span>
          </div>
        )}
      </div>

      {/* Column footer — deal total */}
      {(() => {
        const totalDeal = leads.reduce((sum, l) => sum + (l.dealAmount ?? 0), 0);
        if (totalDeal === 0) return null;
        return (
          <div className="border-t border-[#e5e5e0]/60 px-3 py-2 bg-white/60 text-[10px] font-bold text-[#7a7a76] flex items-center justify-between">
            <span>Pipeline</span>
            <span className="text-[#26251e]">{totalDeal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</span>
          </div>
        );
      })()}
    </div>
  );
}

export default PipelineKanbanColumn;
