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
      <Card className="border border-dashed border-[#e5e5e0] bg-[#fafaf8] shadow-none">
        <CardContent className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-[#78716c]">
            <Target className="h-3.5 w-3.5 shrink-0" />
            <span>Aucun objectif défini — configurez vos quotas mensuels pour suivre votre progression.</span>
          </div>
          <Link
            href="/settings"
            className="ml-4 flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#f54e00] hover:underline"
          >
            <Settings className="h-3 w-3" />
            Configurer
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-sm">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#26251e]">
            <Target className="h-3.5 w-3.5 text-[#f54e00]" />
            Objectifs du mois
          </div>
          <Link href="/settings" className="text-[10px] text-[#78716c] hover:text-[#f54e00] transition-colors">
            Modifier
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {goals.map(goal => {
            const progress = progressByGoal[goal.id] ?? 0;
            const pct = Math.min(100, Math.round((progress / Math.max(goal.target, 1)) * 100));
            const done = pct >= 100;

            return (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#26251e] truncate">{METRIC_LABELS[goal.metric]}</span>
                  <span className={cn('text-[10px] font-bold tabular-nums', done ? 'text-[#059669]' : 'text-[#26251e]')}>
                    {progress}/{goal.target}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f4f4f3]">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-[#059669]' : 'bg-[#f54e00]')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#a8a29e]">{PERIOD_LABELS[goal.period]}</span>
                  {done && <span className="text-[9px] font-bold text-[#059669]">✓ Atteint</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
