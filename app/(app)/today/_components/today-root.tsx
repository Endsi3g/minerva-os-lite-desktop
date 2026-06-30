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
import { TodayAiSuggestionsCard } from './today-ai-suggestions-card';
import { TodayProjectsCard } from './today-projects-card';
import { TodayStatsCard } from './today-stats-card';
import { TodaySetupBanner } from './today-setup-banner';
import { TodayAestheticCanvas } from './today-aesthetic-canvas';
import { TodayGoogleCalendarCard } from './today-google-calendar-card';
import { InboxRoot } from '@/app/(app)/inbox/_components/inbox-root';
import { AgentFeed } from './agent-feed';
import { AgentPrioritiesCard } from './agent-priorities-card';
import { LayoutDashboard, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function TodayRoot() {
  const router = useRouter();
  const [showAestheticMode, setShowAestheticMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox'>('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('minerva_guide_seen')) {
      router.replace('/guide');
    }
  }, [router]);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-4 pt-3 pb-0 bg-background shrink-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all mr-1 ${
            activeTab === 'dashboard'
              ? 'border-[#059669] text-foreground'
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
              ? 'border-[#059669] text-foreground'
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
      <div className="flex-1 overflow-y-auto relative bg-[#fafaf8]">
      {/* grid background pattern overlay */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

      <div className="relative z-10 flex flex-col gap-4 p-3 sm:p-4 md:p-6 xl:p-8 w-full">
        {/* Setup checklist banner (hidden once dismissed or complete) */}
        <TodaySetupBanner />

        {/* Greeting + add actions */}
        <TodayHeader onAestheticToggle={() => setShowAestheticMode(true)} />

        {/* Objectifs mensuels — barre compacte pleine largeur */}
        <TodayGoalsCard />

        {/* Main cockpit grid: left (wider) + right (sidebar) */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">

          {/* ── Colonne gauche : actions du jour ── */}
          <div className="flex flex-col gap-5">
            {/* Leads à contacter aujourd'hui + RDV */}
            <TodayAgendaCard />

            {/* Google Calendar — événements du jour */}
            <TodayGoogleCalendarCard />

            {/* Emails planifiés par les séquences */}
            <TodaySequenceStepsCard />

            {/* Leads en retard / à relancer */}
            <FollowUpListCard />

            {/* Tâches locales + Todoist */}
            <TodayTasksCard />
          </div>

          {/* ── Colonne droite : contexte & stats ── */}
          <div className="flex flex-col gap-5">
            {/* Priorités du jour — leads froids à relancer, alimenté par l'agent */}
            <AgentPrioritiesCard />

            {/* Agent Feed — activité IA temps réel (notifications) */}
            <AgentFeed />

            {/* Focus du jour */}
            <TodayFocusCard />

            {/* Intelligence comportementale (bilans IA + relances suggérées) */}
            <TodayAiSuggestionsCard />

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
