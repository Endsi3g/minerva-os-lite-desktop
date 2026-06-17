'use client';

import React from 'react';
import { TodayHeader } from './today-header';
import { TodayAgendaCard } from './today-agenda-card';
import { TodayFocusCard } from './today-focus-card';
import { FollowUpListCard } from './follow-up-list-card';
import { HotLeadsCard } from './hot-leads-card';
import { TodayTasksCard } from './today-tasks-card';
import { TodayProjectsCard } from './today-projects-card';
import { PipelineSummaryCard } from './pipeline-summary-card';
import { AiSuggestionsCard } from './ai-suggestions-card';
import { TodayQuickNoteCard } from './today-quick-note-card';
import { TodayStatsCard } from './today-stats-card';

export function TodayRoot() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-4 p-3 sm:p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <TodayHeader />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Main Operational Flow (Left Column) */}
          <div className="flex flex-col gap-6">
            <TodayAgendaCard />
            <TodayFocusCard />
            <FollowUpListCard />
            <HotLeadsCard />
            <TodayTasksCard />
          </div>

          {/* Side Info & Context panels (Right Column) */}
          <div className="flex flex-col gap-6">
            <TodayProjectsCard />
            <PipelineSummaryCard />
            <AiSuggestionsCard />
            <TodayQuickNoteCard />
            <TodayStatsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
export default TodayRoot;
