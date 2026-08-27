'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FollowUpList } from './follow-up-list';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { MessageSquareReply, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 5;

export function FollowUpListCard() {
  const { leads } = useReach();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // Filter leads with nextActionDate <= today AND status is not Won/Lost
  const followUpLeads = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return leads.filter(
      (lead) =>
        !!lead.nextActionDate &&
        lead.nextActionDate <= todayStr &&
        lead.status !== 'Won' &&
        lead.status !== 'Lost' &&
        lead.nextAction
    );
  }, [leads]);

  const visibleLeads = expanded ? followUpLeads : followUpLeads.slice(0, MAX_VISIBLE);
  const hiddenCount = followUpLeads.length - MAX_VISIBLE;

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none flex flex-col min-h-0">
      <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
            <MessageSquareReply className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-heading font-sans text-sm font-bold text-gray-900">{t('today.follow_ups')}</CardTitle>
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
        <FollowUpList leads={visibleLeads} />
        {followUpLeads.length > MAX_VISIBLE && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer",
              "text-primary hover:bg-primary/5"
            )}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Voir les {hiddenCount} autres
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
export default FollowUpListCard;
