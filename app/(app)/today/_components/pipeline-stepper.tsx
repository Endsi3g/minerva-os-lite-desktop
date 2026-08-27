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
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Progression du Pipeline</h4>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          {leads.length} opportunités
        </span>
      </div>

      <div className="relative flex items-center justify-between py-2 overflow-x-auto">
        {/* Background Connecting Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-2 h-[2px] bg-gray-200 z-0" />

        {/* Steps */}
        {STEPS.map((step, idx) => {
          const isActive = idx <= activeIndex;
          const isCurrent = idx === activeIndex;
          const count = counts[step.key] || 0;

          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 z-10 shrink-0 px-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  isActive
                    ? 'bg-brand-accent-emerald text-white ring-4 ring-emerald-50 shadow-xs'
                    : 'bg-gray-100 text-gray-400 border border-gray-300'
                )}
              >
                {isActive && idx < activeIndex ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <div className="text-center">
                <span className={cn('text-[10px] font-bold uppercase tracking-wider block', isActive ? 'text-gray-900' : 'text-gray-400')}>
                  {step.label}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">{count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PipelineStepper;
