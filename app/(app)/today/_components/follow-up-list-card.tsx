'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FollowUpList } from './follow-up-list';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { MessageSquareReply } from 'lucide-react';

export function FollowUpListCard() {
  const { leads } = useReach();
  const { t } = useLanguage();

  // Filter leads with nextActionDate <= today AND status is not Won/Lost
  const todayStr = new Date().toISOString().split('T')[0];
  const followUpLeads = leads.filter(
    (lead) => 
      lead.nextActionDate <= todayStr && 
      lead.status !== 'Won' && 
      lead.status !== 'Lost' &&
      lead.nextAction
  );

  return (
    <Card className="border border-border bg-card shadow-sm flex flex-col min-h-0">
      <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MessageSquareReply className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">{t('today.follow_ups')}</CardTitle>
            <CardDescription className="text-xs">{t('today.follow_ups_desc')}</CardDescription>
          </div>
        </div>
        {followUpLeads.length > 0 && (
          <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5 rounded-full">
            {followUpLeads.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto p-0 px-6 pb-4">
        <FollowUpList leads={followUpLeads} />
      </CardContent>
    </Card>
  );
}
export default FollowUpListCard;
