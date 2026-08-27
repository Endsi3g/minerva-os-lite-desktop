'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  X,
  ArrowUpRight,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';
import { computeDealRisk, getDealRiskColor, getDealRiskLabel } from '@/lib/deal-risk';
import { toast } from 'sonner';

interface PipelineKanbanCardProps {
  lead: Lead;
}

const STAGE_ORDER: Lead['status'][] = [
  'New',
  'Contacted',
  'Meeting Booked',
  'Proposal Sent',
  'Negotiation',
  'Won',
];

const DEFAULT_NICHE_MRR: Record<string, number> = {
  restaurant: 1500,
  coiffeur: 800,
  avocat: 3500,
  comptable: 2800,
  dentiste: 4500,
  construction: 5000,
  garage: 1800,
  immobilier: 3000,
};

export function PipelineKanbanCard({ lead }: PipelineKanbanCardProps) {
  const { updateLeadStatus, updateLead } = useReach();
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [dealInput, setDealInput] = useState<string>(String(lead.dealAmount || ''));

  const currentIndex = STAGE_ORDER.indexOf(lead.status);

  // Estimate default MRR if missing
  const estimatedAmount = lead.dealAmount ?? (
    DEFAULT_NICHE_MRR[(lead.niche || '').toLowerCase()] || 2000
  );

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (lead.status === 'Lost') {
      updateLeadStatus(lead.id, 'Negotiation');
    } else if (currentIndex > 0) {
      updateLeadStatus(lead.id, STAGE_ORDER[currentIndex - 1]);
    }
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIndex + 1];
      // If moving to Won and no deal amount, set the estimated amount
      if (nextStage === 'Won' && !lead.dealAmount) {
        updateLead(lead.id, { dealAmount: estimatedAmount, status: 'Won' });
        toast.success(`🎉 Deal gagné pour ${lead.businessName} (+${estimatedAmount} $) !`);
      } else {
        updateLeadStatus(lead.id, nextStage);
      }
    }
  };

  const handleMarkLost = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateLeadStatus(lead.id, 'Lost');
    toast.info(`${lead.businessName} marqué comme Perdu`);
  };

  const handleSaveDealAmount = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const num = parseFloat(dealInput);
    if (!isNaN(num) && num >= 0) {
      updateLead(lead.id, { dealAmount: num });
      toast.success(`Montant du deal mis à jour : ${num.toLocaleString('fr-CA')} $`);
    }
    setIsEditingDeal(false);
  };

  const isOverdue = lead.nextActionDate && lead.nextActionDate <= new Date().toISOString().split('T')[0];

  const dealRisk = computeDealRisk({
    status: lead.status,
    lastActivityAt: lead.lastActivityAt,
    nextActionDate: lead.nextActionDate,
    replyStatus: lead.replyStatus,
    dealAmount: lead.dealAmount ?? estimatedAmount,
    dealProbability: lead.dealProbability ?? 50,
  });

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="border border-[#e5e5e0] bg-white shadow-xs hover:shadow-md hover:border-[#10B981]/50 transition-all group/card overflow-hidden cursor-grab active:cursor-grabbing active:opacity-70 rounded-xl"
    >
      <CardContent className="p-3.5 space-y-3">
        {/* Title & Detail Link */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="text-xs font-bold text-[#14171A] hover:text-[#059669] transition-colors leading-tight line-clamp-2 pr-1"
          >
            {lead.businessName}
          </Link>
          <Button asChild variant="ghost" size="icon" className="h-5 w-5 text-[#8A9098] hover:text-[#059669] hover:bg-emerald-50 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
            <Link href={`/leads/${lead.id}`}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Niche & Location */}
        <div className="flex flex-col gap-0.5 text-[10px] text-[#8A9098]">
          {lead.niche && <span className="truncate font-semibold text-[#555552]">{lead.niche}</span>}
          {lead.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-[#059669]" />
              <span className="truncate">{lead.city}</span>
            </div>
          )}
        </div>

        {/* Badges row: Temp + Score + Deal Risk */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className={cn("text-[8px] font-bold px-1.5 py-0 rounded", getTemperatureStyle(lead.temperature))}
            >
              {getTemperatureLabel(lead.temperature)}
            </Badge>

            {dealRisk && dealRisk.level !== 'low' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0 rounded border"
                    style={{ color: getDealRiskColor(dealRisk.level), borderColor: `${getDealRiskColor(dealRisk.level)}33`, background: `${getDealRiskColor(dealRisk.level)}0d` }}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {getDealRiskLabel(dealRisk.level)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px] max-w-[200px]">{dealRisk.reasons.join(' · ')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!!lead.score && (
              <div className={cn(
                "flex items-center justify-center px-1.5 h-4.5 rounded border text-[9px] font-black",
                lead.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : lead.score >= 60 ? 'bg-[#14171A]/5 text-[#14171A] border-[#14171A]/15'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              )}>
                {lead.score}
              </div>
            )}
            {lead.owner && (
              <span className="text-[9px] text-[#8A9098] font-mono">
                {lead.owner}
              </span>
            )}
          </div>
        </div>

        {/* Deal info / Quick Edit */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-[#059669]/20 bg-[#059669]/5">
          {isEditingDeal ? (
            <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] font-bold text-[#059669]">$</span>
              <input
                type="number"
                value={dealInput}
                onChange={(e) => setDealInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveDealAmount(e)}
                className="w-full text-xs font-bold bg-white border border-[#059669] rounded px-1.5 py-0.5 outline-none text-[#26251e]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveDealAmount}
                className="h-5 w-5 bg-[#059669] text-white rounded flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div
                className="flex items-center gap-1.5 cursor-pointer group/deal"
                onClick={() => setIsEditingDeal(true)}
                title="Cliquez pour modifier le montant"
              >
                <DollarSign className="h-3 w-3 text-[#059669] shrink-0" />
                <span className="text-[10px] font-bold text-[#059669]">
                  {(lead.dealAmount ?? estimatedAmount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
                </span>
                {!lead.dealAmount && (
                  <span className="text-[8px] text-[#8A9098] bg-white/60 px-1 rounded border border-[#059669]/20 font-medium">
                    est.
                  </span>
                )}
                <Edit2 className="h-2.5 w-2.5 text-[#8A9098] opacity-0 group-hover/deal:opacity-100 transition-opacity" />
              </div>

              {lead.dealProbability !== undefined && (
                <span className="text-[9px] font-bold text-[#8A9098]">{lead.dealProbability}%</span>
              )}
            </>
          )}
        </div>

        {/* Next Action Box */}
        {lead.nextAction && (
          <div className={cn(
            "p-2 rounded-lg border text-[10px] leading-normal",
            isOverdue
              ? "bg-[#D64545]/5 border-[#D64545]/20 text-[#D64545]"
              : "bg-[#fafaf8] border-[#e5e5e0] text-[#7a7a76]"
          )}>
            <div className="font-medium truncate text-[#26251e]">{lead.nextAction}</div>
            {lead.nextActionDate && (
              <div className="flex items-center gap-1 mt-1 font-mono text-[9px] text-[#8A9098]">
                <Calendar className="h-2.5 w-2.5 shrink-0 text-[#059669]" />
                <span>{new Date(lead.nextActionDate).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        )}

        {/* Card Movement Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0]/70">
          {/* Move Left */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMoveLeft}
            disabled={lead.status === 'New'}
            className="h-6 w-6 text-[#8A9098] hover:text-[#14171A] hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
            title="Étape précédente"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Reculer d&apos;étape</span>
          </Button>

          {/* Quick status shortcut buttons */}
          <div className="flex items-center gap-1">
            {lead.status !== 'Lost' && lead.status !== 'Won' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMarkLost}
                    className="h-6 w-6 text-[#D64545] hover:text-[#D64545] hover:bg-[#D64545]/10 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px]">Marquer comme Perdu</p>
                </TooltipContent>
              </Tooltip>
            )}

            {lead.status !== 'Won' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateLead(lead.id, { dealAmount: lead.dealAmount ?? estimatedAmount, status: 'Won' });
                      toast.success(`🎉 ${lead.businessName} marqué comme Gagné !`);
                    }}
                    className="h-6 w-6 text-[#059669] hover:text-[#059669] hover:bg-[#059669]/10 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px]">Clôturer Gagné</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Move Right */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMoveRight}
            disabled={lead.status === 'Won' || lead.status === 'Lost'}
            className="h-6 w-6 text-[#8A9098] hover:text-[#059669] hover:bg-emerald-50 disabled:opacity-30 cursor-pointer"
            title="Étape suivante"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="sr-only">Avancer d&apos;étape</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PipelineKanbanCard;
