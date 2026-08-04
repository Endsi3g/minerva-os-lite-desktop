'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Flame, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';

const MAX_VISIBLE = 5;

export function TodayHotProspectsCard() {
  const { leads } = useReach();
  const [expanded, setExpanded] = useState(false);

  const allLeads = useMemo(() => {
    return leads
      .filter((l) => l.status !== 'Won' && l.status !== 'Lost' && (l.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [leads]);

  const visibleLeads = expanded ? allLeads : allLeads.slice(0, MAX_VISIBLE);
  const hiddenCount = allLeads.length - MAX_VISIBLE;

  return (
    <Card className="border border-border bg-card shadow-none flex flex-col min-h-0">
      <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="font-heading text-base font-medium">Prospects chauds</CardTitle>
            <CardDescription className="text-xs">Score de priorisation le plus élevé</CardDescription>
          </div>
        </div>
        {allLeads.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {allLeads.length} leads
          </span>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {allLeads.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            Aucun prospect scoré pour l&apos;instant.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {visibleLeads.map((lead) => {
                const score = Math.min(100, Math.max(0, lead.score ?? 0));
                return (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {lead.businessName}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0">{score} pts</span>
                      </div>
                      <div className="h-1 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Expand / Collapse button */}
            {allLeads.length > MAX_VISIBLE && (
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayHotProspectsCard;
