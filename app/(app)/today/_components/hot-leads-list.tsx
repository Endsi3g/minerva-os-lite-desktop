'use client';

import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table';
import { HotLeadRow } from './hot-lead-row';
import { Lead } from '@/lib/mock-data';
import { Flame } from 'lucide-react';

interface HotLeadsListProps {
  leads: Lead[];
}

export function HotLeadsList({ leads }: HotLeadsListProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Flame className="h-5 w-5" />
        </div>
        <h4 className="text-xs font-semibold text-foreground">Aucun lead chaud actif</h4>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px]">
          Qualifie des prospects en température &quot;Chaud&quot; (Hot) ou &quot;Tiède&quot; (Warm) pour les voir apparaître ici.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">Prospect</TableHead>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">Température</TableHead>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">Activité</TableHead>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">Prochaine Étape</TableHead>
            <TableHead className="h-9 text-right text-[10px] font-bold uppercase tracking-wider pr-4">Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <HotLeadRow key={lead.id} lead={lead} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
export default HotLeadsList;
