'use client';

import React from 'react';
import { 
  Trophy, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Clock, 
  Flame, 
  PartyPopper,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonthlyTeamChallenge, TeamMemberReward } from '@/lib/rewards-engine';

interface TeamRewardsCardProps {
  challenge: MonthlyTeamChallenge;
  memberRewards: TeamMemberReward[];
  className?: string;
  compact?: boolean;
}

export function TeamRewardsCard({
  challenge,
  memberRewards,
  className,
  compact = false,
}: TeamRewardsCardProps) {
  const {
    targetDeals,
    confirmedDealsCount,
    progressPercent,
    isCompleted,
    totalPoolAmount,
    activeMembersCount,
    sharePerMember,
    qualifyingDeals,
    daysRemainingInMonth,
  } = challenge;

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300 relative overflow-hidden",
      isCompleted 
        ? "bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-white border-amber-300/80 shadow-md"
        : "bg-gradient-to-br from-[#167f5b]/5 via-white to-[#f4f4f3] border-[#e5e5e0] shadow-sm",
      compact ? "p-4 sm:p-5" : "p-6",
      className
    )}>
      {/* Background ambient badge */}
      <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
        <Trophy className="w-44 h-44 text-[#167f5b]" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg flex items-center justify-center text-white",
              isCompleted ? "bg-amber-500 shadow-amber-200" : "bg-[#167f5b]"
            )}>
              {isCompleted ? <PartyPopper className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#14171A] tracking-tight">
              Challenge 1er Mois • Palier 5 Clients
            </h3>
            <span className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border",
              isCompleted
                ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                : "bg-amber-100 text-amber-800 border-amber-200"
            )}>
              {isCompleted ? '🎉 Objectif Décroché' : 'En cours'}
            </span>
          </div>
          <p className="text-xs text-[#666660]">
            Si l&apos;équipe signe 5 clients ce mois-ci, 100% de l&apos;argent des 5 contrats est versé dans la cagnotte et divisé équitablement entre tous les membres !
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#e5e5e0] text-xs font-semibold text-[#14171A]">
          <Clock className="w-3.5 h-3.5 text-[#8A9098]" />
          <span>{daysRemainingInMonth} j restants</span>
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#14171A]">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Progression collective : <strong className="text-[#167f5b] text-sm">{confirmedDealsCount}</strong> / {targetDeals} clients confirmés</span>
          </div>
          <span className="font-extrabold text-[#167f5b]">{progressPercent}%</span>
        </div>

        <div className="h-3 w-full bg-[#e5e5e0]/80 rounded-full overflow-hidden p-0.5 border border-[#e5e5e0]">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isCompleted 
                ? "bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-600" 
                : "bg-gradient-to-r from-emerald-500 to-[#167f5b]"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white/90 rounded-xl p-3.5 border border-[#e5e5e0]/80 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] mb-1">Cagnotte Commune</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-[#167f5b]">
              {totalPoolAmount.toLocaleString('fr-FR')} $
            </span>
            <span className="text-[11px] text-[#8A9098]">total</span>
          </div>
          <p className="text-[10px] text-[#666660] mt-0.5">
            {confirmedDealsCount >= targetDeals ? '100% débloqué pour l\'équipe' : 'Montant accumulé des deals'}
          </p>
        </div>

        <div className="bg-white/90 rounded-xl p-3.5 border border-[#e5e5e0]/80 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] mb-1">Part par Membre ({activeMembersCount})</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-[#14171A]">
              {sharePerMember.toLocaleString('fr-FR')} $
            </span>
            <span className="text-[11px] text-[#8A9098]">/ pers.</span>
          </div>
          <p className="text-[10px] text-[#666660] mt-0.5">
            Partage équitable entre tous
          </p>
        </div>

        <div className="bg-white/90 rounded-xl p-3.5 border border-[#e5e5e0]/80 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] mb-1">Bonus 1er Deal Closer</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-amber-600">
              100%
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">du contrat</span>
          </div>
          <p className="text-[10px] text-[#666660] mt-0.5">
            Sur le 1er deal individuel réussi
          </p>
        </div>
      </div>

      {/* Team Members Bonus 1er Deal Status */}
      {!compact && memberRewards.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#e5e5e0]/70">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#14171A] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Statut Bonus 1er Deal (100% Commission)
            </h4>
            <span className="text-[11px] text-[#8A9098]">
              {memberRewards.filter(m => m.hasFirstDealUnlocked).length} / {memberRewards.length} membres qualifiés
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {memberRewards.map(member => (
              <div 
                key={member.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                  member.hasFirstDealUnlocked 
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                    : "bg-white/70 border-[#e5e5e0] text-[#14171A]"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                    member.hasFirstDealUnlocked ? "bg-emerald-600 text-white" : "bg-[#f4f4f3] text-[#8A9098]"
                  )}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{member.name}</p>
                    <p className="text-[10px] text-[#8A9098] truncate">{member.email}</p>
                  </div>
                </div>

                {member.hasFirstDealUnlocked ? (
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      +{member.firstDealAmount?.toLocaleString('fr-FR') || 0} $
                    </span>
                    <p className="text-[9px] text-emerald-700 font-medium">100% empoché</p>
                  </div>
                ) : (
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                      En chasse
                    </span>
                    <p className="text-[9px] text-[#8A9098]">100% au 1er deal</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Qualifying Deals preview if any */}
      {qualifyingDeals.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#e5e5e0]/70">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] mb-2">
            Contrats confirmés dans le pool ({qualifyingDeals.length}/5) :
          </p>
          <div className="flex flex-wrap gap-1.5">
            {qualifyingDeals.map((d, idx) => (
              <span 
                key={d.id || idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#e5e5e0] text-xs font-medium text-[#14171A]"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                  #{idx + 1}
                </span>
                <span className="font-semibold truncate max-w-[120px]">{d.businessName}</span>
                <span className="text-[#167f5b] font-bold">{d.dealAmount.toLocaleString('fr-FR')} $</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
