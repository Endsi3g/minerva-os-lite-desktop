'use client';

import React from 'react';
import { useReach } from '@/lib/reach-context';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'total', label: 'TOTAL LEADS' },
  { key: 'engaged', label: 'ENGAGÉ' },
  { key: 'call', label: 'APPEL' },
  { key: 'discovery', label: 'DÉCOUVERTE' },
  { key: 'proposal', label: 'PROPOSITION' },
  { key: 'negotiation', label: 'NÉGOCIATION' },
  { key: 'won', label: 'GAGNÉ' },
];

export function PipelineStepper() {
  const { leads } = useReach();

  const counts: Record<string, number> = {
    total: leads.length,
    engaged: leads.filter(l => l.status !== 'New').length,
    call: leads.filter(l => l.preferredChannel === 'cold_call' || l.status === 'Contacted').length,
    discovery: leads.filter(l => l.status === 'Meeting Booked').length,
    proposal: leads.filter(l => l.status === 'Proposal Sent').length,
    negotiation: leads.filter(l => l.status === 'Negotiation').length,
    won: leads.filter(l => l.status === 'Won').length,
  };

  // Determine active up to engaged by default or current highest stage with leads
  const activeIndex = counts.proposal > 0 ? 4 : counts.discovery > 0 ? 3 : counts.engaged > 0 ? 1 : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Progression du Pipeline</h4>
        <span className="text-xs font-bold text-brand-accent-emerald bg-brand-accent-emeraldLight px-2 py-0.5 rounded-md border border-brand-accent-emeraldBorder/40">
          {leads.length} opportunités
        </span>
      </div>

      {/* Stepper container with horizontal scroll protection on small screens */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="relative flex items-start justify-between min-w-[420px] sm:min-w-0">
          {/* Background Connecting Line */}
          <div
            className="absolute h-[2px] bg-muted-foreground/20 z-0"
            style={{
              top: '14px',
              left: 'calc((100% / 14) + 14px)',
              right: 'calc((100% / 14) + 14px)',
            }}
          />
          {/* Active portion of the line */}
          {activeIndex > 0 && (
            <div
              className="absolute h-[2px] bg-brand-accent-emerald z-[1]"
              style={{
                top: '14px',
                left: 'calc((100% / 14) + 14px)',
                width: `calc(${(activeIndex / (STEPS.length - 1)) * 100}% - (100% / 7))`,
              }}
            />
          )}

          {/* Steps */}
          {STEPS.map((step, idx) => {
            const isActive = idx <= activeIndex;
            const count = counts[step.key] || 0;

            return (
              <div key={step.key} className="flex flex-col items-center z-10 flex-1 px-1">
                {/* Circle */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
                    isActive
                      ? 'bg-brand-accent-emerald text-white ring-4 ring-emerald-500/15 shadow-xs'
                      : 'bg-muted text-muted-foreground border border-border'
                  )}
                >
                  {isActive && idx < activeIndex ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                </div>

                {/* Label + Count */}
                <span className={cn(
                  'text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-2 text-center leading-tight truncate w-full',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium text-center">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PipelineStepper;
