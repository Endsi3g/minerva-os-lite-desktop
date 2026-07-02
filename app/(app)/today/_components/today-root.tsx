'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
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

// Cockpit / Pilotage cards
import { StrategyMemoryCard } from '@/app/(app)/cockpit/_components/strategy-memory-card';
import { WeeklyReportCard } from '@/app/(app)/cockpit/_components/weekly-report-card';
import { SlaCard } from '@/app/(app)/cockpit/_components/sla-card';
import { AgentJournal } from '@/app/(app)/cockpit/_components/agent-journal';
import { MinervaOwl } from '@/components/minerva-owl';

import {
  LayoutDashboard,
  Mail,
  Gauge,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Play
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { updateWidget } from '@/lib/widget-bridge';
import { V7StrategyModal } from '@/components/v7-strategy-modal';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Helper types
interface AgentAction {
  id: string;
  action_type: string;
  reasoning: string | null;
  lead_id: string | null;
  lead_name?: string;
  created_at?: string;
}

interface NextActionData {
  pending_actions: AgentAction[];
  count: number;
}

interface NbaLead {
  id: string;
  business_name: string;
  niche: string;
  city: string;
  status: string;
  nba_score: number;
  nba_action: string | null;
  nba_reason: string | null;
  nba_channel: string | null;
}

export function TodayRoot() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leads, tasks, aiSuggestions, activeWorkspace } = useReach();
  
  const [showAestheticMode, setShowAestheticMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'pilotage'>('dashboard');

  // Unified Cockpit & Operations states
  const [nextActions, setNextActions] = useState<NextActionData | null>(null);
  const [nbaLeads, setNbaLeads] = useState<NbaLead[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingNba, setLoadingNba] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Sync tab with query parameters
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pilotage') {
      setActiveTab('pilotage');
    } else if (tabParam === 'inbox') {
      setActiveTab('inbox');
    } else {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

  // Guidelines guide trigger
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('minerva_guide_seen')) {
      router.replace('/guide');
    }
  }, [router]);

  // Fetch pending outreach approvals (outreach control center)
  const fetchNextActions = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingActions(true);
    try {
      const r = await fetch(getApiUrl(`/api/agent/next-action?workspace_id=${activeWorkspace.id}`));
      if (r.ok) setNextActions(await r.json());
    } catch {}
    finally { setLoadingActions(false); }
  }, [activeWorkspace]);

  // Fetch NBA scores
  const fetchNba = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingNba(true);
    try {
      const r = await fetch(getApiUrl(`/api/nba/score?workspace_id=${activeWorkspace.id}`));
      if (r.ok) {
        const data = await r.json();
        setNbaLeads(data.leads ?? []);
      }
    } catch {}
    finally { setLoadingNba(false); }
  }, [activeWorkspace]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchNextActions(), fetchNba()]);
  }, [fetchNextActions, fetchNba]);

  useEffect(() => {
    if (activeWorkspace) {
      refreshAll();
    }
  }, [activeWorkspace, refreshAll]);

  // Approve action draft handler
  const handleApprove = async (actionId: string) => {
    if (!activeWorkspace) return;
    setApprovingId(actionId);
    try {
      const res = await fetch(getApiUrl('/api/agent/next-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId, workspace_id: activeWorkspace.id })
      });
      if (res.ok) {
        toast.success('Action approuvée et exécutée');
        await fetchNextActions();
      } else {
        toast.error("Erreur lors de l'approbation");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setApprovingId(null);
    }
  };

  // Refresh scoring
  const handleRefreshScoring = async () => {
    if (!activeWorkspace || refreshing) return;
    setRefreshing(true);
    try {
      await fetch(getApiUrl('/api/nba/score'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id })
      });
      await refreshAll();
      toast.success('Données et scores synchronisés');
    } catch {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setRefreshing(false);
    }
  };

  // Push fresh data to iOS home screen widget
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

  // KPI Calculations
  const contactedLeads = useMemo(() => leads.filter((l) => l.status !== 'New').length, [leads]);
  const bookedLeads = useMemo(() => leads.filter((l) => l.status === 'Meeting Booked').length, [leads]);
  const bookingRate = useMemo(() => contactedLeads > 0 ? ((bookedLeads / contactedLeads) * 100).toFixed(1) : '0.0', [contactedLeads, bookedLeads]);
  
  const positiveReplies = useMemo(() => leads.filter((l) => l.replyStatus === 'positive').length, [leads]);
  const totalReplies = useMemo(() => leads.filter((l) => l.replyStatus).length, [leads]);
  const positiveReplyRate = useMemo(() => totalReplies > 0 ? ((positiveReplies / totalReplies) * 100).toFixed(0) : '0', [positiveReplies, totalReplies]);

  const scoredLeads = useMemo(() => leads.filter((l) => (l as any).nba_score > 0), [leads]);
  const avgNbaScore = useMemo(() => scoredLeads.length ? Math.round(scoredLeads.reduce((s, l) => s + ((l as any).nba_score ?? 0), 0) / scoredLeads.length) : 0, [scoredLeads]);

  const activeLeadsCount = useMemo(() => leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').length, [leads]);

  // Canonical 7-Phase Journey lead counts
  const phaseCounts = useMemo(() => {
    return {
      step1: leads.filter(l => l.status === 'New').length,
      step2: leads.filter(l => l.status === 'Contacted' && !l.replyStatus).length,
      step3: leads.filter(l => l.status === 'Contacted' && l.replyStatus && l.replyStatus !== 'positive').length,
      step4: leads.filter(l => l.status === 'Contacted' && l.replyStatus === 'positive').length,
      step5: leads.filter(l => l.status === 'Meeting Booked').length,
      step6: leads.filter(l => l.status === 'Proposal Sent' || l.status === 'Negotiation').length,
      step7: leads.filter(l => l.status === 'Won').length,
    };
  }, [leads]);

  return (
    <ErrorBoundary>
      <div className="h-full overflow-hidden flex flex-col">
        {/* Unified Tab Bar */}
        <div className="flex items-center justify-between border-b border-[#e5e5e0] px-4 pt-3 pb-0 bg-[#fafaf8] shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                router.push('/today');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all mr-1 ${
                activeTab === 'dashboard'
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Opérations & Cockpit
            </button>
            <button
              onClick={() => {
                setActiveTab('inbox');
                router.push('/today?tab=inbox');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all mr-1 ${
                activeTab === 'inbox'
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Boîte de réception
            </button>
            <button
              onClick={() => {
                setActiveTab('pilotage');
                router.push('/today?tab=pilotage');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'pilotage'
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              Pilotage stratégique
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={handleRefreshScoring}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e0] hover:bg-[#e5e5e2] disabled:opacity-60 px-2.5 py-1 text-xs font-bold text-[#26251e] bg-white transition-all shadow-sm"
            >
              {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span>Mettre à jour</span>
            </button>
          </div>
        </div>

        {/* Unified Screens View routing */}
        <div className="flex-1 overflow-y-auto relative bg-[#fafaf8]">
          <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

          <div className="relative z-10 w-full h-full flex flex-col">
            {activeTab === 'inbox' && (
              <div className="flex-1 h-full overflow-hidden">
                <InboxRoot />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-5 p-4 sm:p-6 md:p-8">
                {/* Banner Setup */}
                <TodaySetupBanner />

                {/* Banner Header */}
                <TodayHeader onAestheticToggle={() => setShowAestheticMode(true)} />

                {/* Unified KPI Metrics bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">Leads Actifs</span>
                    <span className="text-2xl font-black text-[#26251e]">{activeLeadsCount}</span>
                  </div>
                  <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">Taux de Booking</span>
                    <span className="text-2xl font-black text-[#26251e]">{bookingRate}%</span>
                  </div>
                  <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">Réponses Positives</span>
                    <span className="text-2xl font-black text-[#26251e]">{positiveReplyRate}%</span>
                  </div>
                  <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">Score NBA Moyen</span>
                    <span className="text-2xl font-black text-[#26251e]">{avgNbaScore} pts</span>
                  </div>
                </div>

                {/* Monthly Goals */}
                <TodayGoalsCard />

                {/* Canonical 7-Phase Journey map */}
                <div className="bg-white border border-[#e5e5e0] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Parcours client en 7 phases</h3>
                    <span className="text-[10px] font-bold text-[#7a7a76]">{leads.length} prospects au total</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center relative">
                    {[
                      { label: 'Initial Email', val: phaseCounts.step1 },
                      { label: 'Relance', val: phaseCounts.step2 },
                      { label: 'Appel/Intérêt', val: phaseCounts.step3 },
                      { label: 'Réponse (+)', val: phaseCounts.step4 },
                      { label: 'RDV Booké', val: phaseCounts.step5 },
                      { label: 'Proposition', val: phaseCounts.step6 },
                      { label: 'Gagné', val: phaseCounts.step7 },
                    ].map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center relative z-10">
                        <div className="w-8 h-8 rounded-full border border-[#e5e5e0] bg-[#fafaf8] flex items-center justify-center font-black text-xs text-[#26251e] mb-1">
                          {step.val}
                        </div>
                        <span className="text-[9px] font-bold text-[#7a7a76] uppercase truncate w-full px-1">{step.label}</span>
                      </div>
                    ))}
                    {/* Background connector line */}
                    <div className="absolute top-4 left-4 right-4 h-[1px] bg-[#e5e5e0] z-0" />
                  </div>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  {/* Left column */}
                  <div className="flex flex-col gap-5">
                    {/* Outreach Control Center - approvals */}
                    <div className="bg-white border border-[#e5e5e0] rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-4.5 w-4.5 text-[#059669]" />
                        <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Outreach Control Center — Approbations</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        {loadingActions ? (
                          <div className="flex items-center gap-1.5 py-4 text-xs text-[#7a7a76]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Chargement des actions en attente...
                          </div>
                        ) : nextActions && nextActions.pending_actions.length > 0 ? (
                          nextActions.pending_actions.map((act) => (
                            <div key={act.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f0fdf9] border border-[#059669]/20 shadow-sm">
                              <div>
                                <p className="text-xs font-bold text-[#26251e]">{act.action_type}</p>
                                <p className="text-[10px] text-[#7a7a76] mt-0.5">{act.reasoning ?? "Aucun motif fourni par l'agent"}</p>
                                {act.lead_name && <p className="text-[10px] font-semibold text-[#059669] mt-1">Lead: {act.lead_name}</p>}
                              </div>
                              <button
                                onClick={() => handleApprove(act.id)}
                                disabled={approvingId === act.id}
                                className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 transition-all flex items-center gap-1"
                              >
                                {approvingId === act.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                Approuver
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[#7a7a76] py-3">Aucun projet de relance ou action de l'agent en attente d'approbation.</p>
                        )}
                      </div>
                    </div>

                    <TodayAgendaCard />
                    <TodayGoogleCalendarCard />
                    <TodaySequenceStepsCard />
                    <FollowUpListCard />
                    <TodayTasksCard />
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-5">
                    {/* Minerva Agent Feed */}
                    <AgentFeed />
                    
                    <NextBestActionCard />
                    <DailyDigestCard />
                    <AgentPrioritiesCard />
                    <TodayFocusCard />
                    <TodayAiSuggestionsCard />
                    <TodayActivityFeedCard />
                    <TodayTeamActivityCard />
                    <TodayStatsCard />
                    <TodayProjectsCard />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pilotage' && (
              <div className="flex flex-col gap-5 p-4 sm:p-6 md:p-8">
                {/* Strategy Header */}
                <div className="flex items-center gap-3 border-b border-[#e5e5e0] pb-5">
                  <div className="w-10 h-10 shrink-0">
                    <MinervaOwl state="analyse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-sans font-bold text-[#26251e]">Pilotage stratégique</h2>
                    <p className="text-xs text-[#7a7a76] mt-0.5">Pilotez et analysez la mémoire, la performance et la charge d'équipe</p>
                  </div>
                </div>

                {/* Two Column Strategy layout */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  {/* Left Column */}
                  <div className="flex flex-col gap-5">
                    <StrategyMemoryCard />
                    <WeeklyReportCard />
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-5">
                    <SlaCard />
                    <AgentJournal />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showAestheticMode && (
          <TodayAestheticCanvas onClose={() => setShowAestheticMode(false)} />
        )}

        <V7StrategyModal />
      </div>
    </ErrorBoundary>
  );
}

export default TodayRoot;
