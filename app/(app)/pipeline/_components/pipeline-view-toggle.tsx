'use client';

import React from 'react';
import { Kanban, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineViewToggleProps {
  view: 'board' | 'table';
  onChange: (view: 'board' | 'table') => void;
}

export function PipelineViewToggle({ view, onChange }: PipelineViewToggleProps) {
  return (
    <div className="flex bg-muted/65 p-1 rounded-lg self-start gap-1 select-none">
      <button
        type="button"
        onClick={() => onChange('board')}
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
        onClick={() => onChange('table')}
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
    </div>
  );
}
export default PipelineViewToggle;
