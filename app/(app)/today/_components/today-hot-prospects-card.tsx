'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';

export function TodayHotProspectsCard() {
  const { leads } = useReach();

  const topLeads = useMemo(() => {
    return leads
      .filter((l) => l.status !== 'Won' && l.status !== 'Lost' && (l.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);
  }, [leads]);

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none flex flex-col min-h-0">
      <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#167f5b]/10 text-[#167f5b]">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-heading text-base font-medium">Prospects chauds</CardTitle>
            <CardDescription className="text-xs">Score de priorisation le plus élevé</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {topLeads.length === 0 ? (
          <p className="text-xs text-[#7a7a76] py-6 text-center">
            Aucun prospect scoré pour l&apos;instant.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {topLeads.map((lead) => {
              const score = Math.min(100, Math.max(0, lead.score ?? 0));
              return (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#14171A] truncate group-hover:text-[#167f5b] transition-colors">
                        {lead.businessName}
                      </span>
                      <span className="text-[10px] font-bold text-[#4B5158] tabular-nums shrink-0">{score} pts</span>
                    </div>
                    <div className="h-1 rounded-full bg-[#8A9098]/15 overflow-hidden">
                      <div className="h-full bg-[#167f5b] rounded-full" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayHotProspectsCard;
