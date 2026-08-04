'use client';

import React from 'react';
import Link from 'next/link';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MapPin, Calendar, X, ArrowUpRight, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';
import { computeDealRisk, getDealRiskColor, getDealRiskLabel } from '@/lib/deal-risk';
import { AlertTriangle } from 'lucide-react';

interface PipelineKanbanCardProps {
  lead: Lead;
}

export function PipelineKanbanCard({ lead }: PipelineKanbanCardProps) {
  const { updateLeadStatus } = useReach();

  const statusOrder: Lead['status'][] = ['New', 'Contacted', 'Meeting Booked', 'Won'];
  const currentIndex = statusOrder.indexOf(lead.status);

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (lead.status === 'Lost') {
      updateLeadStatus(lead.id, 'Meeting Booked');
    } else if (currentIndex > 0) {
      updateLeadStatus(lead.id, statusOrder[currentIndex - 1]);
    }
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentIndex >= 0 && currentIndex < statusOrder.length - 1) {
      updateLeadStatus(lead.id, statusOrder[currentIndex + 1]);
    }
  };

  const handleMarkLost = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateLeadStatus(lead.id, 'Lost');
  };

  const isOverdue = lead.nextActionDate && lead.nextActionDate <= new Date().toISOString().split('T')[0];

  const dealRisk = computeDealRisk({
    status: lead.status,
    lastActivityAt: lead.lastActivityAt,
    nextActionDate: lead.nextActionDate,
    replyStatus: lead.replyStatus,
    dealAmount: lead.dealAmount,
    dealProbability: lead.dealProbability,
  });

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="border border-[#e5e5e0] bg-white shadow-xs hover:shadow-sm hover:border-[#e5e5e0]/80 transition-all group/card overflow-hidden cursor-grab active:cursor-grabbing active:opacity-70"
    >
      <CardContent className="p-3.5 space-y-3">
        {/* Title & Detail Link */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="text-xs font-bold text-[#14171A] hover:text-[#167f5b] transition-colors leading-tight line-clamp-2 pr-1"
          >
            {lead.businessName}
          </Link>
          <Button asChild variant="ghost" size="icon" className="h-5 w-5 text-[#8A9098] hover:text-[#167f5b] hover:bg-secondary opacity-0 group-hover/card:opacity-100 transition-opacity">
            <Link href={`/leads/${lead.id}`}>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {/* Niche & Location */}
        <div className="flex flex-col gap-1 text-[10px] text-[#8A9098]">
          <div className="flex items-center gap-1">
            <span className="truncate">{lead.niche}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{lead.city}</span>
          </div>
        </div>

        {/* Temp badge + score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
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
                "flex items-center justify-center w-8 h-5 rounded border text-[9px] font-black",
                lead.score >= 80 ? 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20'
                  : lead.score >= 60 ? 'bg-[#14171A]/10 text-[#14171A] border-[#14171A]/20'
                  : 'bg-[#8A9098]/10 text-[#8A9098] border-[#8A9098]/20'
              )}>
                {lead.score}
              </div>
            )}
            <span className="text-[9px] text-[#8A9098] font-mono">
              {lead.owner}
            </span>
          </div>
        </div>

        {/* Deal info */}
        {lead.dealAmount !== undefined && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-[#167f5b]/20 bg-[#167f5b]/5">
            <DollarSign className="h-3 w-3 text-[#167f5b] shrink-0" />
            <span className="text-[10px] font-bold text-[#167f5b]">
              {lead.dealAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
            </span>
            {lead.dealProbability !== undefined && (
              <span className="text-[9px] text-[#8A9098] ml-auto">{lead.dealProbability}%</span>
            )}
          </div>
        )}

        {/* Next Action Box */}
        {lead.nextAction && (
          <div className={cn(
            "p-2 rounded border text-[10px] leading-normal",
            isOverdue
              ? "bg-[#D64545]/5 border-[#D64545]/20 text-[#D64545]"
              : "bg-secondary/40 border-[#e5e5e0]/70 text-[#8A9098]"
          )}>
            <div className="font-medium truncate">{lead.nextAction}</div>
            {lead.nextActionDate && (
              <div className="flex items-center gap-1 mt-1 font-mono text-[9px]">
                <Calendar className="h-2.5 w-2.5 shrink-0" />
                <span>{new Date(lead.nextActionDate).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        )}

        {/* Inline Card movement controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0]/70">
          {/* Move Left Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMoveLeft}
            disabled={lead.status === 'New'}
            className="h-6 w-6 text-[#8A9098] hover:text-[#14171A] disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Reculer d&apos;étape</span>
          </Button>

          {/* Lost Button (Special Trigger when in Meeting stage) */}
          {lead.status === 'Meeting Booked' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMarkLost}
                  className="h-6 w-6 text-[#D64545] hover:text-[#D64545] hover:bg-[#D64545]/10"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[10px]">Marquer comme perdu</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Move Right Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMoveRight}
            disabled={lead.status === 'Won' || lead.status === 'Lost'}
            className="h-6 w-6 text-[#8A9098] hover:text-[#14171A] disabled:opacity-30"
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
