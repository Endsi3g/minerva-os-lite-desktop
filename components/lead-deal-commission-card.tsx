'use client';

import React from 'react';
import { Trophy, Sparkles, DollarSign, ArrowUpRight, CheckCircle2, Flame, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/mock-data';
import { calculateLeadCommission } from '@/lib/rewards-engine';

interface LeadDealCommissionCardProps {
  lead: Lead;
  memberWonCount?: number;
  teamChallengeCompleted?: boolean;
  onMarkWon?: () => void;
  className?: string;
}

export function LeadDealCommissionCard({
  lead,
  memberWonCount = 0,
  teamChallengeCompleted = false,
  onMarkWon,
  className,
}: LeadDealCommissionCardProps) {
  const estimate = calculateLeadCommission(lead, memberWonCount, teamChallengeCompleted);
  const isWon = lead.status === 'Won';

  return (
    <div className={cn(
      "rounded-xl border p-3.5 transition-all relative overflow-hidden",
      isWon 
        ? "bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-white border-emerald-300"
        : estimate.isFirstDeal 
          ? "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border-amber-200 shadow-2xs"
          : "bg-white border-[#e5e5e0] shadow-2xs",
      className
    )}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "p-1 rounded-md text-white flex items-center justify-center",
            isWon ? "bg-emerald-600" : estimate.isFirstDeal ? "bg-amber-500" : "bg-[#167f5b]"
          )}>
            {isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#14171A] leading-tight flex items-center gap-1.5">
              Valeur du Deal & Commission
              {isWon && (
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                  Signé !
                </span>
              )}
            </h4>
            <p className="text-[10px] text-[#8A9098]">
              {estimate.isFirstDeal 
                ? "Bonus de bienvenue : 1er deal à 100% de commission" 
                : "Commission standard (20%)"}
            </p>
          </div>
        </div>

        {estimate.isFirstDeal && !isWon && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 text-[9px] font-black uppercase tracking-wider animate-pulse">
            <Sparkles className="w-2.5 h-2.5" />
            100% Closer
          </span>
        )}
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-2 gap-2.5 bg-[#fafaf8] rounded-lg p-2.5 border border-[#e5e5e0]/70 mb-2">
        <div>
          <span className="text-[10px] font-medium text-[#8A9098] block">Montant du contrat</span>
          <span className="text-base font-black text-[#14171A]">
            {estimate.dealAmount.toLocaleString('fr-FR')} $
          </span>
        </div>

        <div className="border-l border-[#e5e5e0] pl-2.5">
          <span className="text-[10px] font-bold text-[#8A9098] block flex items-center gap-1">
            {estimate.isFirstDeal ? 'Gain Closer (100%)' : 'Gain Closer (20%)'}
          </span>
          <span className={cn(
            "text-base font-black",
            estimate.isFirstDeal ? "text-amber-600" : "text-[#167f5b]"
          )}>
            +{estimate.estimatedCommission.toLocaleString('fr-FR')} $
          </span>
        </div>
      </div>

      {/* Team pool impact */}
      <div className="flex items-center justify-between text-[11px] text-[#666660] px-0.5">
        <span className="flex items-center gap-1 text-[10px]">
          <Users className="w-3 h-3 text-[#167f5b]" />
          <span>Alimente le challenge des <strong>5 clients</strong> d&apos;équipe</span>
        </span>
        {!isWon && onMarkWon && (
          <button
            type="button"
            onClick={onMarkWon}
            className="text-[10px] font-bold text-[#167f5b] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Marquer Gagné <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
