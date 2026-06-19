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

interface PipelineKanbanCardProps {
  lead: Lead;
}

export function PipelineKanbanCard({ lead }: PipelineKanbanCardProps) {
  const { updateLeadStatus, onlineUsers, user } = useReach();

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

  const viewers = (onlineUsers || []).filter(u => u.user_id !== user?.id && u.pathname === `/leads/${lead.id}`);

  return (
    <Card className="border border-border bg-card shadow-xs hover:shadow-sm hover:border-border/80 transition-all group/card overflow-hidden">
      <CardContent className="p-3.5 space-y-3">
        {/* Title & Detail Link */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <Link 
              href={`/leads/${lead.id}`}
              className="text-xs font-bold text-foreground hover:text-primary transition-colors leading-tight line-clamp-2 pr-1"
            >
              {lead.businessName}
            </Link>
            
            {/* Viewers presence indicators */}
            {viewers.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <div className="flex -space-x-1 select-none animate-pulse">
                  {viewers.map(v => {
                    const viewerInitials = (v.full_name || '')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();
                    
                    const colors = [
                      'bg-indigo-500 text-white',
                      'bg-emerald-500 text-white',
                      'bg-sky-500 text-white',
                      'bg-rose-500 text-white',
                      'bg-amber-500 text-white',
                      'bg-violet-500 text-white'
                    ];
                    const hash = (v.full_name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                    const myColor = colors[hash % colors.length];

                    return (
                      <Tooltip key={v.user_id}>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "w-4.5 h-4.5 rounded-full border border-white flex items-center justify-center text-[6px] font-extrabold shrink-0 shadow-xs cursor-default select-none overflow-hidden",
                            myColor
                          )}>
                            {v.avatar_base64 ? (
                              <img src={v.avatar_base64} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{viewerInitials}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-[9px] bg-[#26251e] text-white p-1 rounded font-sans border border-neutral-800 shadow-md">
                          {v.full_name} est ici
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <span className="text-[9px] text-muted-foreground italic font-medium">Consulte...</span>
              </div>
            )}
          </div>
          <Button asChild variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-primary hover:bg-secondary opacity-0 group-hover/card:opacity-100 transition-opacity">
            <Link href={`/leads/${lead.id}`}>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {/* Niche & Location */}
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground">
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
          <Badge
            variant="secondary"
            className={cn("text-[8px] font-bold px-1.5 py-0 rounded", getTemperatureStyle(lead.temperature))}
          >
            {getTemperatureLabel(lead.temperature)}
          </Badge>

          <div className="flex items-center gap-1.5">
            {!!lead.score && (
              <div className={cn(
                "flex items-center justify-center w-8 h-5 rounded border text-[9px] font-black",
                lead.score >= 80 ? 'bg-[#10b981]/10 text-[#059669] border-[#10b981]/20'
                  : lead.score >= 60 ? 'bg-[#26251e]/10 text-[#26251e] border-[#26251e]/20'
                  : 'bg-[#e5e5e0] text-[#807d72] border-[#e5e5e0]'
              )}>
                {lead.score}
              </div>
            )}
            <span className="text-[9px] text-muted-foreground font-mono">
              {lead.owner}
            </span>
          </div>
        </div>

        {/* Deal info */}
        {lead.dealAmount !== undefined && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-[#059669]/20 bg-[#059669]/5">
            <DollarSign className="h-3 w-3 text-[#059669] shrink-0" />
            <span className="text-[10px] font-bold text-[#059669]">
              {lead.dealAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
            </span>
            {lead.dealProbability !== undefined && (
              <span className="text-[9px] text-[#7a7a76] ml-auto">{lead.dealProbability}%</span>
            )}
          </div>
        )}

        {/* Next Action Box */}
        {lead.nextAction && (
          <div className={cn(
            "p-2 rounded border text-[10px] leading-normal",
            isOverdue 
              ? "bg-rose-50/50 border-rose-100 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-300"
              : "bg-secondary/40 border-border/60 text-muted-foreground"
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
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {/* Move Left Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMoveLeft}
            disabled={lead.status === 'New'}
            className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
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
                  className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
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
            className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
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
