'use client';

import React from 'react';
import { TodayHeader } from './today-header';
import { TodayAgendaCard } from './today-agenda-card';
import { TodayFocusCard } from './today-focus-card';
import { FollowUpListCard } from './follow-up-list-card';
import { TodayTasksCard } from './today-tasks-card';
import { TodayProjectsCard } from './today-projects-card';
import { TodayStatsCard } from './today-stats-card';

export function TodayRoot() {
  return (
    <div className="h-full overflow-y-auto relative">
      {/* dot pattern background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-30 dark:opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative z-10 flex flex-col gap-4 p-3 sm:p-6 max-w-5xl mx-auto">
        <TodayHeader />
        <TodayStatsCard />
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <TodayAgendaCard />
            <TodayTasksCard />
            <FollowUpListCard />
          </div>
          <div className="flex flex-col gap-5">
            <TodayFocusCard />
            <TodayProjectsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
export default TodayRoot;
