'use client';

import React, { useState } from 'react';
import { TodayHeader } from './today-header';
import { TodayGoalsCard } from './today-goals-card';
import { TodayAgendaCard } from './today-agenda-card';
import { TodaySequenceStepsCard } from './today-sequence-steps-card';
import { FollowUpListCard } from './follow-up-list-card';
import { TodayTasksCard } from './today-tasks-card';
import { TodayFocusCard } from './today-focus-card';
import { TodayActivityFeedCard } from './today-activity-feed-card';
import { TodayTeamActivityCard } from './today-team-activity-card';
import { TodayProjectsCard } from './today-projects-card';
import { TodayStatsCard } from './today-stats-card';
import { TodaySetupBanner } from './today-setup-banner';
import { TodayAestheticCanvas } from './today-aesthetic-canvas';
import { InboxRoot } from '@/app/(app)/inbox/_components/inbox-root';
import { LayoutDashboard, Mail } from 'lucide-react';

export function TodayRoot() {
  const [showAestheticMode, setShowAestheticMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox'>('dashboard');

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-4 pt-3 pb-0 bg-background shrink-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all mr-1 ${
            activeTab === 'dashboard'
              ? 'border-[#f54e00] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'inbox'
              ? 'border-[#f54e00] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Boîte de réception
        </button>
      </div>

      {activeTab === 'inbox' ? (
        <div className="flex-1 overflow-hidden">
          <InboxRoot />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto relative">
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
        {/* Setup checklist banner (hidden once dismissed or complete) */}
        <TodaySetupBanner />

        {/* Greeting + add actions */}
        <TodayHeader onAestheticToggle={() => setShowAestheticMode(true)} />

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

            {/* Activité de l'équipe (flux d'événements réels du workspace) */}
            <TodayTeamActivityCard />

            {/* Stats funnel + séquences */}
            <TodayStatsCard />

            {/* Projets actifs */}
            <TodayProjectsCard />
          </div>
        </div>
      </div>

      {showAestheticMode && (
        <TodayAestheticCanvas onClose={() => setShowAestheticMode(false)} />
      )}
    </div>
      )}
    </div>
  );
}
export default TodayRoot;
