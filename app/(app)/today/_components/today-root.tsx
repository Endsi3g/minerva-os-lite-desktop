'use client';

import React from 'react';
import { TodayHeader } from './today-header';
import { TodayGoalsCard } from './today-goals-card';
import { TodayAgendaCard } from './today-agenda-card';
import { TodaySequenceStepsCard } from './today-sequence-steps-card';
import { FollowUpListCard } from './follow-up-list-card';
import { TodayTasksCard } from './today-tasks-card';
import { TodayFocusCard } from './today-focus-card';
import { TodayActivityFeedCard } from './today-activity-feed-card';
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
        {/* Greeting + add actions */}
        <TodayHeader />

        {/* Objectifs mensuels — barre compacte pleine largeur */}
        <TodayGoalsCard />

        {/* Main cockpit grid: left (wider) + right (sidebar) */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">

          {/* ── Colonne gauche : actions du jour ── */}
          <div className="flex flex-col gap-5">
            {/* Leads à contacter aujourd'hui + RDV */}
            <TodayAgendaCard />

            {/* Emails planifiés par les séquences */}
            <TodaySequenceStepsCard />

            {/* Leads en retard / à relancer */}
            <FollowUpListCard />

            {/* Tâches locales + Todoist */}
            <TodayTasksCard />
          </div>

          {/* ── Colonne droite : contexte & stats ── */}
          <div className="flex flex-col gap-5">
            {/* Focus du jour */}
            <TodayFocusCard />

            {/* Activité récente des leads */}
            <TodayActivityFeedCard />

            {/* Stats funnel + séquences */}
            <TodayStatsCard />

            {/* Projets actifs */}
            <TodayProjectsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
export default TodayRoot;
