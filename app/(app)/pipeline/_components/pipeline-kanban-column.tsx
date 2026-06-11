'use client';

import React from 'react';
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
}

export function PipelineKanbanColumn({ column, leads }: PipelineKanbanColumnProps) {
  // Styles for column styling
  const getHeaderStyle = (id: Lead['status']) => {
    switch (id) {
      case 'New':
        return 'border-t-2 border-t-blue-500 bg-blue-50/10 dark:bg-blue-950/5';
      case 'Contacted':
        return 'border-t-2 border-t-amber-500 bg-amber-50/10 dark:bg-amber-950/5';
      case 'Meeting Booked':
        return 'border-t-2 border-t-purple-500 bg-purple-50/10 dark:bg-purple-950/5';
      case 'Won':
        return 'border-t-2 border-t-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5';
      case 'Lost':
        return 'border-t-2 border-t-rose-500 bg-rose-50/10 dark:bg-rose-950/5';
      default:
        return 'border-t-2 border-t-slate-500 bg-slate-50/10';
    }
  };

  const getBadgeStyle = (id: Lead['status']) => {
    switch (id) {
      case 'New':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Contacted':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'Meeting Booked':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Won':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'Lost':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className={cn(
      "flex flex-col w-[280px] shrink-0 rounded-lg border border-border bg-card/40 overflow-hidden",
      getHeaderStyle(column.id)
    )}>
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/40 bg-card/60">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
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
      <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[400px] max-h-[calc(100vh-270px)] scrollbar-thin">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <PipelineKanbanCard key={lead.id} lead={lead} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-muted-foreground">
            <span className="text-[10px] font-medium italic">Aucun prospect</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PipelineKanbanColumn;
