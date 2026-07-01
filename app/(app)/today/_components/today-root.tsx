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
import { NextBestActionCard } from './next-best-action-card';
import { DailyDigestCard } from './daily-digest-card';
import { LayoutDashboard, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useReach } from '@/lib/reach-context';
import { updateWidget } from '@/lib/widget-bridge';
import { V7StrategyModal } from '@/components/v7-strategy-modal';

export function TodayRoot() {
  const router = useRouter();
  const { leads, tasks, aiSuggestions, activeWorkspace } = useReach();
  const [showAestheticMode, setShowAestheticMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox'>('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('minerva_guide_seen')) {
      router.replace('/guide');
    }
  }, [router]);

  // Push fresh data to iOS home screen widget whenever leads/tasks change
  useEffect(() => {
    if (!leads.length) return;
    const today = new Date().toDateString();
    const hotLeads = leads.filter((l) => (l.score ?? 0) >= 80).length;
    const tasksToday = tasks.filter(
      (t) => !t.completed && t.dueDate && new Date(t.dueDate).toDateString() === today
    ).length;
    const leadsAddedToday = leads.filter(
      (l) => l.createdAt && new Date(l.createdAt).toDateString() === today
    ).length;
    const topAction = aiSuggestions?.[0];
    const channelToType = (ch: string): 'call' | 'email' | 'visit' | 'task' => {
      if (ch === 'Call') return 'call';
      if (ch === 'Email') return 'email';
      return 'task';
    };
    updateWidget({
      totalLeads: leads.length,
      hotLeads,
      tasksToday,
      leadsAddedToday,
      nextActionType: topAction ? channelToType(topAction.suggestedChannel) : '',
      nextActionLead: topAction?.leadName ?? '',
      nextActionDetail: topAction?.reasoning ?? '',
    });
  }, [leads, tasks, aiSuggestions]);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-[#e5e5e0] px-4 pt-3 pb-0 bg-[#fafaf8] shrink-0">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all mr-1 ${
            activeTab === 'dashboard'
              ? 'border-[#059669] text-[#26251e]'
              : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'inbox'
              ? 'border-[#059669] text-[#26251e]'
              : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
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
            {/* Prochaine meilleure action — prescriptif, branchée sur la boucle agent */}
            <NextBestActionCard />

            {/* Résumé du jour — stats temps réel de ce que Minerva a fait */}
            <DailyDigestCard />

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
      <V7StrategyModal />
    </div>
  );
}
export default TodayRoot;
