'use client';

import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody } from '@/components/ui/table';
import { FollowUpRow } from './follow-up-row';
import { Lead } from '@/lib/mock-data';
import { Info } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface FollowUpListProps {
  leads: Lead[];
}

export function FollowUpList({ leads }: FollowUpListProps) {
  const { t } = useLanguage();

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-border bg-muted/20">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-brand-accent-emerald mb-2">
          <Info className="h-4 w-4" />
        </div>
        <h4 className="text-xs font-semibold text-foreground">{t('today.no_followup_title')}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[280px]">
          {t('today.no_followup_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto bg-card">
      <Table className="min-w-[500px]">
        <TableHeader className="bg-muted/40">
          <TableRow className="border-b border-border">
            <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('today.table_prospect')}</TableHead>
            <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('today.table_channel')}</TableHead>
            <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('today.table_last_contact')}</TableHead>
            <TableHead className="h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('today.table_next_action')}</TableHead>
            <TableHead className="h-8 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground pr-3">{t('today.table_actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <FollowUpRow key={lead.id} lead={lead} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
export default FollowUpList;
