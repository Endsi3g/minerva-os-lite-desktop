'use client';

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock } from 'lucide-react';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FollowUpRowProps {
  lead: Lead;
}

export function FollowUpRow({ lead }: FollowUpRowProps) {
  const { updateLead, addNoteToLead } = useReach();

  // Detect channel based on next action description or source
  const getChannel = (lead: Lead) => {
    const text = (lead.nextAction + ' ' + lead.source).toLowerCase();
    if (text.includes('email') || text.includes('mail')) return { label: 'Email', variant: 'indigo' as const };
    if (text.includes('dm') || text.includes('instagram') || text.includes('linkedin') || text.includes('message')) return { label: 'DM', variant: 'purple' as const };
    if (text.includes('appel') || text.includes('téléphone') || text.includes('call') || text.includes('tél')) return { label: 'Call', variant: 'sky' as const };
    return { label: 'Visite', variant: 'neutral' as const };
  };

  const channel = getChannel(lead);

  const handleDone = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7); // Schedule next follow up in 1 week
    
    // Add a quick activity note
    addNoteToLead(lead.id, `Relance effectuée : "${lead.nextAction}"`, 'general');
    
    // Update lead fields via context method to avoid mutating props
    updateLead(lead.id, {
      nextAction: "Relance programmée suite au dernier contact",
      nextActionDate: tomorrow.toISOString().split('T')[0],
      status: lead.status === 'New' ? 'Contacted' : lead.status
    });
  };

  const handleSnooze = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3); // Snooze by 3 days
    
    // Update nextActionDate in state
    updateLead(lead.id, {
      nextActionDate: nextDate.toISOString().split('T')[0]
    });
  };

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      {/* Lead info */}
      <TableCell className="py-3.5 font-medium">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-foreground">{lead.businessName}</span>
          <span className="text-[10px] text-muted-foreground">
            {lead.contactName || 'Sans contact'} • {lead.city}
          </span>
        </div>
      </TableCell>

      {/* Channel */}
      <TableCell className="py-3.5">
        <Badge 
          variant="secondary" 
          className={cn(
            "text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5",
            channel.variant === 'indigo' && "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
            channel.variant === 'purple' && "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
            channel.variant === 'sky' && "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
            channel.variant === 'neutral' && "bg-neutral-50 text-neutral-700 border border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800"
          )}
        >
          {channel.label}
        </Badge>
      </TableCell>

      {/* Last contact */}
      <TableCell className="py-3.5 text-xs text-muted-foreground max-w-[150px] truncate">
        {lead.notes && lead.notes.length > 0 
          ? lead.notes[lead.notes.length - 1].content 
          : 'Aucun contact historique'}
      </TableCell>

      {/* Next action */}
      <TableCell className="py-3.5 text-xs">
        <div className="flex flex-col gap-0.5 max-w-[200px]">
          <span className="font-medium text-foreground truncate">{lead.nextAction}</span>
          <span className="text-[10px] text-destructive font-medium">
            Aujourd&apos;hui
          </span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={handleDone}
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Fait (Relance effectuée)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                onClick={handleSnooze}
              >
                <Clock className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Reporter de 3 jours (Snooze)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
export default FollowUpRow;
