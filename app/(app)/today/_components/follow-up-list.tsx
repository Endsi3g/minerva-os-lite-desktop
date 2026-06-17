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
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-lg border border-dashed border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Info className="h-5 w-5" />
        </div>
        <h4 className="text-xs font-semibold text-foreground">{t('today.no_followup_title')}</h4>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-[280px]">
          {t('today.no_followup_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">{t('today.table_prospect')}</TableHead>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">{t('today.table_channel')}</TableHead>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">{t('today.table_last_contact')}</TableHead>
            <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider">{t('today.table_next_action')}</TableHead>
            <TableHead className="h-9 text-right text-[10px] font-bold uppercase tracking-wider pr-4">{t('today.table_actions')}</TableHead>
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
