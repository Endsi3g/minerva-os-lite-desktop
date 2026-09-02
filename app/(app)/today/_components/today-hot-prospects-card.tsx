'use client';

import React, { useMemo, useState } from 'react';
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
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 shrink-0 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-brand-accent-emerald shrink-0">
              <Flame className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">Prospects chauds</h3>
              <p className="text-xs text-muted-foreground truncate">Score d'engagement et de conversion le plus élevé</p>
            </div>
          </div>
          {allLeads.length > 0 && (
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
              {allLeads.length} prospects
            </span>
          )}
        </div>

        <div className="pt-3">
          {allLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Aucun prospect scoré pour l'instant.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleLeads.map((lead) => {
                const score = Math.min(100, Math.max(0, lead.score ?? 0));
                return (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex flex-col gap-1 group hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground truncate group-hover:text-brand-accent-emerald transition-colors">
                        {lead.businessName}
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                        {score} pts
                      </span>
                    </div>
                    {/* Dynamic Score Bar */}
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-0.5">
                      <div
                        className="bg-brand-accent-emerald h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {allLeads.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "mt-3.5 w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-colors cursor-pointer",
            "text-brand-accent-emerald hover:bg-emerald-500/10"
          )}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Réduire
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Voir les {hiddenCount} autres
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default TodayHotProspectsCard;
