'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HotLeadsList } from './hot-leads-list';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Flame } from 'lucide-react';

export function HotLeadsCard() {
  const { leads } = useReach();
  const { t } = useLanguage();

  // Filter hot and warm leads (status not Won or Lost)
  const hotLeads = leads.filter(
    (lead) => 
      (lead.temperature === 'Hot' || lead.temperature === 'Warm') && 
      lead.status !== 'Won' && 
      lead.status !== 'Lost'
  );

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">{t('today.hot_leads')}</CardTitle>
            <CardDescription className="text-xs">{t('today.hot_leads_desc')}</CardDescription>
          </div>
        </div>
        {hotLeads.length > 0 && (
          <Badge className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white">
            {hotLeads.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <HotLeadsList leads={hotLeads} />
      </CardContent>
    </Card>
  );
}
export default HotLeadsCard;
