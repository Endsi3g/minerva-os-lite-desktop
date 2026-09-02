'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Target, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';
import { computeProgress, METRIC_LABELS, PERIOD_LABELS } from '@/lib/goal-utils';
import { cn } from '@/lib/utils';

export function TodayGoalsCard() {
  const { goals, leads, tasks } = useReach();

  const progressByGoal = useMemo(
    () => Object.fromEntries(goals.map(g => [g.id, computeProgress(g.metric, g.period, leads, tasks)])),
    [goals, leads, tasks]
  );

  if (goals.length === 0) {
    return (
      <Card className="border border-dashed border-border bg-muted/20 shadow-none">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5 shrink-0" />
            <span>Aucun objectif défini — configurez vos quotas mensuels pour suivre votre progression.</span>
          </div>
          <Link
            href="/settings"
            className="ml-4 flex shrink-0 items-center gap-1 text-[10px] font-semibold text-brand-accent-emerald hover:underline cursor-pointer"
          >
            <Settings className="h-3 w-3" />
            Configurer
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Target className="h-3.5 w-3.5 text-brand-accent-emerald" />
            Objectifs du mois
          </div>
          <Link href="/settings" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Modifier
          </Link>
        </div>

        <div className="kpi-container">
          <div className="kpi-grid">
            {goals.map(goal => {
              const progress = progressByGoal[goal.id] ?? 0;
              const pct = Math.min(100, Math.round((progress / Math.max(goal.target, 1)) * 100));
              const done = pct >= 100;

              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-foreground truncate">{METRIC_LABELS[goal.metric]}</span>
                    <span className={cn('text-[10px] font-bold tabular-nums', done ? 'text-brand-accent-emerald' : 'text-foreground')}>
                      {progress}/{goal.target}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-brand-accent-emerald' : 'bg-brand-accent-emerald/70')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">{PERIOD_LABELS[goal.period]}</span>
                    {done && <span className="text-[9px] font-bold text-brand-accent-emerald">✓ Atteint</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TodayGoalsCard;
