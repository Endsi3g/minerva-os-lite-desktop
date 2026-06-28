'use client';

import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { getTemperatureStyle, getTemperatureLabel } from '@/lib/lead-badges';

interface HotLeadRowProps {
  lead: Lead;
}

export function HotLeadRow({ lead }: HotLeadRowProps) {
  const { updateLeadStatus } = useReach();

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      {/* Business detail */}
      <TableCell className="py-3.5 font-medium">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-foreground">{lead.businessName}</span>
          <span className="text-[10px] text-muted-foreground">
            {lead.niche} • {lead.city}
          </span>
        </div>
      </TableCell>

      {/* Temperature */}
      <TableCell className="py-3.5">
        <Badge 
          variant="secondary" 
          className={cn(
            "text-[9px] font-bold px-2 py-0.5 rounded-md", 
            getTemperatureStyle(lead.temperature)
          )}
        >
          {getTemperatureLabel(lead.temperature)}
        </Badge>
      </TableCell>

      {/* Last activity */}
      <TableCell className="py-3.5 text-xs text-muted-foreground">
        {new Date(lead.updatedAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit'
        })}
      </TableCell>

      {/* Next Step */}
      <TableCell className="py-3.5 text-xs">
        <span className="font-medium text-foreground max-w-[180px] block truncate">
          {lead.nextAction || 'Aucune action planifiée'}
        </span>
      </TableCell>

      {/* Pipeline Status drop-down */}
      <TableCell className="py-3.5 text-right">
        <div className="flex justify-end">
          <Select 
            value={lead.status} 
            onValueChange={(val: Lead['status']) => updateLeadStatus(lead.id, val)}
          >
            <SelectTrigger className="h-7 w-[120px] text-[11px] font-medium bg-background">
              <SelectValue placeholder="Changer le statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="New" className="text-xs">Nouveau</SelectItem>
              <SelectItem value="Contacted" className="text-xs">Contacté</SelectItem>
              <SelectItem value="Meeting Booked" className="text-xs">RDV Fixé</SelectItem>
              <SelectItem value="Proposal Sent" className="text-xs">Proposition envoyée</SelectItem>
              <SelectItem value="Negotiation" className="text-xs">Négociation</SelectItem>
              <SelectItem value="Won" className="text-xs">Gagné</SelectItem>
              <SelectItem value="Lost" className="text-xs">Perdu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TableCell>
    </TableRow>
  );
}
export default HotLeadRow;
