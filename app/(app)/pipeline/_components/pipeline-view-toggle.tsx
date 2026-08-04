'use client';

import React from 'react';
import { Kanban, Table, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PipelineView = 'board' | 'table' | 'forecast';

interface PipelineViewToggleProps {
  view: PipelineView;
  onChange: (view: PipelineView) => void;
}

const OPTIONS: { value: PipelineView; label: string; icon: typeof Kanban }[] = [
  { value: 'board', label: 'Tableau Kanban', icon: Kanban },
  { value: 'table', label: 'Vue en Tableau', icon: Table },
  { value: 'forecast', label: 'Prévisions', icon: TrendingUp },
];

export function PipelineViewToggle({ view, onChange }: PipelineViewToggleProps) {
  return (
    <div className="flex bg-[#f4f4f3]/65 p-1 rounded-lg self-start gap-1 select-none">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all",
            view === value
              ? "bg-white text-[#14171A] shadow-xs border-[#e5e5e0]/10"
              : "text-[#8A9098] hover:text-[#14171A]"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
export default PipelineViewToggle;
