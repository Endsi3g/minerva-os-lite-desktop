'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { TodayHeader } from './today-header';
import { TodayGoalsCard } from './today-goals-card';
import { TodayAgendaCard } from './today-agenda-card';
import { TodaySequenceStepsCard } from './today-sequence-steps-card';
import { FollowUpListCard } from './follow-up-list-card';
import { TodayOverviewCharts } from './today-overview-charts';
import { TodayHotProspectsCard } from './today-hot-prospects-card';
import { TodayTasksCard } from './today-tasks-card';
import { TodayFocusCard } from './today-focus-card';
import { TodayTeamActivityCard } from './today-team-activity-card';
import { TodayAiSuggestionsCard } from './today-ai-suggestions-card';
import { TodayProjectsCard } from './today-projects-card';
import { TodayStatsCard } from './today-stats-card';
import { TodaySetupBanner } from './today-setup-banner';
import { TodayGuestUpgradeBanner } from './today-guest-upgrade-banner';
import { TodayAestheticCanvas } from './today-aesthetic-canvas';
import { TodayGoogleCalendarCard } from './today-google-calendar-card';
import { InboxRoot } from '@/app/(app)/inbox/_components/inbox-root';
import { AgentFeed } from './agent-feed';
import { AgentPrioritiesCard } from './agent-priorities-card';
import { NextBestActionCard } from './next-best-action-card';
import { DailyDigestCard } from './daily-digest-card';
import { SpeedRunOverlay } from '@/components/speed-run-overlay';
import { PipelineStepper } from './pipeline-stepper';
import { GOOGLE_SEEDED_LEADS } from '@/lib/google-seeded-leads';

// Cockpit / Pilotage cards (moved to today component workspace)
import { StrategyMemoryCard } from './strategy-memory-card';
import { WeeklyReportCard } from './weekly-report-card';
import { SlaCard } from './sla-card';
import { AgentJournal } from './agent-journal';
import { BarChart2 } from 'lucide-react';

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
  Play,
  ChevronDown,
  Briefcase,
  Target,
  MoreVertical,
  Search,
  Bell,
  User,
  UserCheck,
  Check,
  Sparkles,
  Route
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useReach, type Campaign } from '@/lib/reach-context';

const GOAL_TYPE_LABELS: Record<NonNullable<Campaign['goalType']>, string> = {
  rdv: 'Remplir mon agenda',
  clients: 'Signer des clients',
  mrr: 'Faire croître le MRR',
};
const GOAL_TYPE_UNITS: Record<NonNullable<Campaign['goalType']>, string> = {
  rdv: 'RDV',
  clients: 'clients',
  mrr: '$ MRR',
};
import { useIsMobile } from '@/lib/use-is-mobile';
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
  action: AgentAction | null;
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

// ── Pilotage Stratégique ──────────────────────────────────────────────────────

function PilotageTab({ leads, tasks }: { leads: any[]; tasks: any[] }) {
  const totalLeads = leads.length;
  const clients = leads.filter(l => l.status === 'Client' || l.status === 'Won').length;
  const activeLeads = leads.filter(l => l.status !== 'Client' && l.status !== 'Won' && l.status !== 'Perdu').length;
  const doneTasks = tasks.filter(t => t.completed || t.status === 'completed').length;

  const kpis = [
    { icon: Users,        label: 'Leads actifs',   value: activeLeads, color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
    { icon: CheckCircle2, label: 'Tâches réalisées', value: doneTasks,   color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
    { icon: TrendingUp,   label: 'Clients gagnés',  value: clients,     color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
    { icon: Gauge,        label: 'Total pipeline',  value: totalLeads,  color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 shrink-0">
          <BarChart2 className="h-5 w-5 text-brand-accent-emerald" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground leading-tight">Pilotage stratégique</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Mémoire, performance et charge d'équipe en temps réel</p>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: bg }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground leading-none">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <StrategyMemoryCard />
          <WeeklyReportCard />
        </div>
        <div className="flex flex-col gap-5">
          <SlaCard />
          <AgentJournal />
        </div>
      </div>
    </div>
  );
}

// ── Main TodayRoot ─────────────────────────────────────────────────────────────

export function TodayRoot() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leads, tasks, aiSuggestions, activeWorkspace, campaigns, isDataReady, user, addLead, addTask } = useReach();
  
  const [showAestheticMode, setShowAestheticMode] = useState(false);
  const [showSpeedRun, setShowSpeedRun] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'pilotage'>('dashboard');
  const isMobile = useIsMobile();
  const [mobileExpanded, setMobileExpanded] = useState(false);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('minerva_guide_seen')) {
      router.replace('/setup');
    }
  }, [router]);

  const guestSeededRef = useRef(false);
  useEffect(() => {
    if (guestSeededRef.current) return;
    if (!user?.is_anonymous || !activeWorkspace || !isDataReady) return;
    if (leads.length > 0) return;
    if (typeof window !== 'undefined' && localStorage.getItem('minerva_guest_seeded')) return;
    guestSeededRef.current = true;
    if (typeof window !== 'undefined') localStorage.setItem('minerva_guest_seeded', '1');

    const today = new Date().toISOString().split('T')[0];
    (async () => {
      try {
        await addLead({
          businessName: 'Café du Montréal', contactName: 'Marc-Antoine Roy', contactEmail: 'marc@cafemontreal.ca',
          niche: 'Cafétéria', city: 'Montréal', source: 'Démo', status: 'New', temperature: 'Warm',
          nextAction: 'Envoyer un premier email', nextActionDate: today,
        });
        await addLead({
          businessName: "Boulangerie L'Épi d'Or", contactName: 'Sophie Tremblay', contactEmail: 'sophie@epidor.ca',
          niche: 'Boulangerie', city: 'Québec', source: 'Démo', status: 'Contacted', temperature: 'Hot',
          nextAction: 'Relancer par téléphone', nextActionDate: today,
        });
        await addTask('Relancer Café du Montréal', 'Follow-up', today);
      } catch (e) {
        console.error('Échec du seed de démo invité:', e);
      }
    })();
  }, [user, activeWorkspace, isDataReady, leads.length, addLead, addTask]);

  // Fetch pending outreach approvals
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
  const effectiveLeads = leads;
  const contactedLeads = useMemo(() => effectiveLeads.filter((l) => l.status !== 'New').length, [effectiveLeads]);
  const totalReplies = useMemo(() => effectiveLeads.filter((l) => l.replyStatus).length, [effectiveLeads]);
  const activeLeadsCount = useMemo(() => effectiveLeads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').length, [effectiveLeads]);

  const now = new Date();
  const leadsThisMonth = useMemo(() => effectiveLeads.filter((l) => {
    if (!l.createdAt) return true;
    const d = new Date(l.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length, [effectiveLeads]);
  const leadsLastMonth = useMemo(() => {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return effectiveLeads.filter((l) => {
      if (!l.createdAt) return false;
      const d = new Date(l.createdAt);
      return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
    }).length;
  }, [effectiveLeads]);
  const leadsMonthDelta = leadsThisMonth - leadsLastMonth;
  const contactRate = useMemo(() => effectiveLeads.length > 0 ? Math.round((contactedLeads / effectiveLeads.length) * 100) : 0, [effectiveLeads.length, contactedLeads]);
  const activePipelineValue = useMemo(() => effectiveLeads
    .filter((l) => l.status !== 'Won' && l.status !== 'Lost')
    .reduce((sum, l) => sum + (l.dealAmount ?? 1800), 0), [effectiveLeads]);
  const responseRate = useMemo(() => contactedLeads > 0 ? Math.round((totalReplies / contactedLeads) * 100) : 0, [contactedLeads, totalReplies]);

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

  const activePrograms = useMemo(() => {
    return campaigns
      .filter((c) => c.status === 'active' && c.goalType)
      .map((c) => {
        const programLeads = leads.filter((l) => l.campaignId === c.id);
        const current = c.goalType === 'clients'
          ? programLeads.filter((l) => l.status === 'Won').length
          : c.goalType === 'rdv'
            ? programLeads.filter((l) => l.status === 'Meeting Booked').length
            : programLeads.filter((l) => l.status === 'Won').reduce((sum, l) => sum + (l.dealAmount ?? 0), 0);
        const target = c.targetValue ?? 0;
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : null;
        return { campaign: c, current, target, pct };
      });
  }, [campaigns, leads]);

  const campaignStats = useMemo(() => {
    const activeProgram = activePrograms.find(p => p.pct !== null);
    if (activeProgram) {
      const campaignLeads = leads.filter(l => l.campaignId === activeProgram.campaign.id);
      const prospectes = campaignLeads.length;
      const contacted = campaignLeads.filter(l => l.status !== 'New').length;
      
      const startDate = activeProgram.campaign.createdAt ? new Date(activeProgram.campaign.createdAt) : new Date();
      const daysDiff = Math.max(1, Math.round((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        name: activeProgram.campaign.name,
        pct: activeProgram.pct ?? 0,
        progressPct: activeProgram.pct ?? 0,
        prospectes: prospectes || 14,
        days: daysDiff || 3,
        emailsEnvoyes: contacted * 2 || 24
      };
    }

    const prospectesGlobal = leads.length;
    const contactedGlobal = leads.filter(l => l.status !== 'New').length;
    const won = leads.filter(l => l.status === 'Won').length;
    const pctGlobal = leads.length > 0 ? Math.min(100, Math.round((won / leads.length) * 100)) : 40;

    return {
      name: 'Prospection globale',
      pct: pctGlobal || 35,
      progressPct: pctGlobal || 35,
      prospectes: prospectesGlobal || 28,
      days: 5,
      emailsEnvoyes: contactedGlobal * 2 || 86
    };
  }, [activePrograms, leads]);

  return (
    <ErrorBoundary>
      <div className="h-full overflow-hidden flex flex-col bg-background text-foreground">
        {/* Unified Tab Bar (TopNavigationTabs) */}
        <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 pt-2 pb-0 bg-card shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                router.push('/today');
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-brand-accent-emerald border-b-2 border-brand-accent-emerald bg-brand-accent-emeraldLight/40 font-semibold'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent font-medium'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Opérations & Cockpit
            </button>
            <button
              onClick={() => {
                setActiveTab('inbox');
                router.push('/today?tab=inbox');
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'inbox'
                  ? 'text-brand-accent-emerald border-b-2 border-brand-accent-emerald bg-brand-accent-emeraldLight/40 font-semibold'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent font-medium'
              }`}
            >
              <Mail className="h-4 w-4" />
              Boîte de réception
            </button>
            <button
              onClick={() => {
                setActiveTab('pilotage');
                router.push('/today?tab=pilotage');
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'pilotage'
                  ? 'text-brand-accent-emerald border-b-2 border-brand-accent-emerald bg-brand-accent-emeraldLight/40 font-semibold'
                  : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent font-medium'
              }`}
            >
              <Gauge className="h-4 w-4" />
              Pilotage stratégique
            </button>
          </div>

          <div className="flex items-center gap-2 pb-1.5 shrink-0 ml-2">
            <button
              onClick={handleRefreshScoring}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-foreground bg-card transition-all shadow-2xs cursor-pointer"
            >
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-accent-emerald" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Mettre à jour</span>
            </button>
          </div>
        </div>

        {/* Unified Screens View routing */}
        <div className="flex-1 overflow-y-auto relative bg-background">
          <div className="relative z-10 w-full h-full flex flex-col">
            {activeTab === 'inbox' && (
              <div className="flex-1 h-full overflow-hidden">
                <InboxRoot />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-5 p-3.5 sm:p-6 md:p-8 max-w-full">
                {isMobile ? (
                  /* High Fidelity Redesigned Mobile Dashboard matching Mockup image */
                  <div className="flex flex-col gap-4 text-left w-full overflow-hidden">
                    {/* Header: Avatar, Greeting, and Notification Bell */}
                    <div className="flex items-center justify-between py-1 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-card flex items-center justify-center shrink-0 shadow-2xs">
                          {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-xs text-foreground">
                              {(user?.user_metadata?.name || user?.email?.split('@')[0] || 'ME').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold leading-none">Bonjour,</p>
                          <h2 className="text-sm font-black text-foreground tracking-tight mt-0.5">
                            {user?.user_metadata?.name || user?.email?.split('@')[0] || 'James'}!
                          </h2>
                        </div>
                      </div>
                      
                      <button className="w-9 h-9 flex items-center justify-center bg-card border border-border rounded-full text-foreground hover:bg-accent relative shadow-2xs active:scale-95 transition-all cursor-pointer">
                        <Bell className="w-4 h-4 text-foreground" />
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-brand-accent-emerald" />
                      </button>
                    </div>

                    {/* Search bar prospect list link */}
                    <div className="relative shrink-0 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                      <input
                        type="text"
                        placeholder="Rechercher un prospect..."
                        onClick={() => router.push('/leads')}
                        className="w-full h-9 pl-9 pr-4 text-xs bg-muted border-0 rounded-full focus:outline-none placeholder:text-muted-foreground font-semibold cursor-pointer text-foreground"
                      />
                    </div>

                    {/* Mobile Speed Run Hero CTA */}
                    <button
                      onClick={() => setShowSpeedRun(true)}
                      className="w-full relative overflow-hidden rounded-2xl bg-[#0F2E22] text-white p-4 shadow-lg border border-emerald-500/20 active:scale-98 transition-all text-left cursor-pointer"
                    >
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
                            <Zap className="w-4 h-4 fill-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">Speed Run Commercial</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <p className="text-[10px] text-gray-300 font-medium">
                              {leads.length > 0 ? `${leads.length} leads prêts à valider` : 'Validez vos actions en 3 min'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold bg-white hover:bg-gray-100 text-[#0F2E22] px-3 py-1.5 rounded-xl shrink-0 shadow-sm flex items-center gap-1">
                          Lancer <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>

                    {/* Widget "Progression de la campagne" (Clean Dark Card) */}
                    <div className="bg-[#182a22] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-900/30 relative overflow-hidden flex flex-col gap-4">
                      <div className="flex justify-between items-start z-10">
                        <span className="text-xs font-black tracking-tight uppercase tracking-wider text-emerald-100/90 truncate">
                          {campaignStats.name}
                        </span>
                        <button className="text-emerald-100/50 hover:text-white transition-colors cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-x-4 gap-y-1.5 text-[9px] text-emerald-100/80 font-bold uppercase tracking-wide flex-wrap z-10">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#10b981]" /> {campaignStats.prospectes} Prospectés</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#10b981]" /> {campaignStats.days} {campaignStats.days > 1 ? 'Jours' : 'Jour'}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[#10b981]" /> {campaignStats.emailsEnvoyes >= 1000 ? `${(campaignStats.emailsEnvoyes / 1000).toFixed(1)}k` : campaignStats.emailsEnvoyes} Emails</span>
                      </div>

                      {/* Lower part: Semi-Circular Gauge & CTA button */}
                      <div className="flex items-center justify-between gap-4 mt-1 z-10">
                        {/* Gauge container */}
                        <div className="flex flex-col items-center justify-center relative w-24 h-14 shrink-0 overflow-hidden pt-1">
                          <svg className="w-24 h-24 transform -rotate-90 origin-center" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.15)" strokeWidth="8" fill="none" strokeDasharray="238.76" strokeDashoffset="119.38" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray="238.76" strokeDashoffset={238.76 - (119.38 * (campaignStats.progressPct / 100))} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                          </svg>
                          <div className="absolute top-4 flex flex-col items-center justify-center">
                            <span className="text-base font-black leading-none">{campaignStats.progressPct}%</span>
                            <span className="text-[7px] uppercase font-bold text-emerald-100/70 mt-0.5">Atteint</span>
                          </div>
                        </div>

                        {/* CTA button */}
                        <button
                          onClick={() => router.push('/campaigns')}
                          className="flex items-center gap-1 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-[10px] font-bold tracking-tight shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <span>Voir la campagne</span>
                          <ArrowRight className="w-3 h-3 text-[#10b981]" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Action Cards List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-extrabold text-foreground tracking-tight">Actions recommandées</span>
                        <span className="text-[10px] font-bold text-muted-foreground">3 urgentes</span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { title: 'Relance 5 prospects suite démo', time: '5 mins', action: 'Générer brouillons' },
                          { title: 'Confirmer tournée terrain Laval', time: '15 mins', action: 'Ouvrir carte' },
                          { title: 'Appel de relance planifié', time: '10 mins', action: '3 relances requises' },
                        ].map((task, idx) => (
                          <div key={idx} className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-brand-accent-emerald/40 transition-all cursor-pointer">
                            <div className="space-y-1 min-w-0">
                              <p className="text-xs font-extrabold text-foreground truncate">{task.title}</p>
                              <div className="flex items-center gap-2.5 text-[9px] text-muted-foreground font-bold">
                                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-brand-accent-emerald" /> {task.time}</span>
                                <span className="flex items-center gap-0.5"><Mail className="w-3 h-3 text-brand-accent-emerald" /> {task.action}</span>
                              </div>
                            </div>
                            
                            {/* Member avatar initials placeholder */}
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0 font-extrabold text-[10px] text-foreground">
                              {user?.email?.slice(0, 2).toUpperCase() || 'ME'}
                            </div>
                          </div>
                        ))}

                        {/* IA Optimisation Tip Footer Banner */}
                        <div className="bg-muted/40 border border-dashed border-border rounded-2xl px-3 py-2.5 flex items-center justify-center gap-2 mt-1 select-none">
                          <Zap className="w-3.5 h-3.5 text-brand-accent-emerald shrink-0" />
                          <span className="text-[10px] text-muted-foreground font-bold text-center">
                            Optimisez votre prospection automatiquement avec Minerva AI
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Desktop Dashboard Layout */
                  <div className="space-y-5 animate-in fade-in duration-300 text-left">
                    <TodayHeader onAestheticToggle={() => setShowAestheticMode(true)} />
                    
                    {/* KpiGrid (4 Colonnes — Spécification Exacte) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Card 1 */}
                      <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Leads générés ce mois-ci</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-bold text-foreground">
                              {leadsThisMonth}
                            </span>
                            {/* Sparkline micro-bars */}
                            <div className="flex items-end gap-1 h-6">
                              <div className="w-[3px] h-3 rounded-full bg-brand-accent-emerald/20" />
                              <div className="w-[3px] h-4 rounded-full bg-brand-accent-emerald/40" />
                              <div className="w-[3px] h-3 rounded-full bg-brand-accent-emerald/40" />
                              <div className="w-[3px] h-5 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-6 rounded-full bg-brand-accent-emerald" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {leadsMonthDelta >= 0 ? `+${leadsMonthDelta}` : leadsMonthDelta} vs mois dernier
                          </span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Taux de contact</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-bold text-foreground">
                              {contactRate}%
                            </span>
                            <div className="flex items-end gap-1 h-6">
                              <div className="w-[3px] h-2 rounded-full bg-brand-accent-emerald/20" />
                              <div className="w-[3px] h-4 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-5 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-3 rounded-full bg-brand-accent-emerald/40" />
                              <div className="w-[3px] h-6 rounded-full bg-brand-accent-emerald" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {contactedLeads} prospects contactés
                          </span>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Valeur pipeline actif</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-bold text-foreground">
                              {activePipelineValue.toLocaleString('fr-CA')} $
                            </span>
                            <div className="flex items-end gap-1 h-6">
                              <div className="w-[3px] h-3 rounded-full bg-brand-accent-emerald/20" />
                              <div className="w-[3px] h-4 rounded-full bg-brand-accent-emerald/40" />
                              <div className="w-[3px] h-6 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-5 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-6 rounded-full bg-brand-accent-emerald" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {activeLeadsCount} opportunités actives
                          </span>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between shadow-2xs">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Taux de réponse</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-bold text-foreground">
                              {responseRate}%
                            </span>
                            <div className="flex items-end gap-1 h-6">
                              <div className="w-[3px] h-2 rounded-full bg-brand-accent-emerald/20" />
                              <div className="w-[3px] h-3 rounded-full bg-brand-accent-emerald/20" />
                              <div className="w-[3px] h-4 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-6 rounded-full bg-brand-accent-emerald" />
                              <div className="w-[3px] h-5 rounded-full bg-brand-accent-emerald" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {totalReplies} réponses enregistrées
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Full-Format Interactive Recharts Overview */}
                    <TodayOverviewCharts />

                    {/* Pipeline Stepper (7 Étapes) */}
                    <PipelineStepper />

                    {/* Prospects chauds + Relances en retard */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <TodayHotProspectsCard />
                      <FollowUpListCard />
                    </div>
                  </div>
                )}

                {/* Outreach Control Center - approvals */}
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4.5 w-4.5 text-brand-accent-emerald" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Outreach Control Center — Approbations</h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    {loadingActions ? (
                      <div className="flex items-center gap-1.5 py-4 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-accent-emerald" />
                        Chargement des actions en attente...
                      </div>
                    ) : nextActions?.action ? (
                      <div key={nextActions.action.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{nextActions.action.action_type}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{nextActions.action.reasoning ?? "Aucun motif fourni par l'agent"}</p>
                          {nextActions.action.lead_name && <p className="text-[10px] font-semibold text-brand-accent-emerald mt-1 truncate">Lead: {nextActions.action.lead_name}</p>}
                        </div>
                        <button
                          onClick={() => handleApprove(nextActions.action!.id)}
                          disabled={approvingId === nextActions.action.id}
                          className="bg-brand-accent-emerald hover:bg-brand-accent-emeraldHover disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {approvingId === nextActions.action.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Approuver
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-3">Aucun projet de relance ou action de l'agent en attente d'approbation.</p>
                    )}
                  </div>
                </div>

                {/* Tâches du jour */}
                <TodayTasksCard />

                {/* Mobile Expand / Collapse toggle */}
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setMobileExpanded(v => !v)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground active:bg-muted/60 transition-colors cursor-pointer"
                  >
                    {mobileExpanded ? 'Voir moins' : 'Voir plus (agenda, IA, statistiques…)'}
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', mobileExpanded && 'rotate-180')} />
                  </button>
                )}

                {(!isMobile || mobileExpanded) && (
                  <>
                    {/* Canonical 7-Phase Journey map */}
                    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Parcours client en 7 phases</h3>
                        <span className="text-[10px] font-bold text-muted-foreground">{leads.length} prospects au total</span>
                      </div>
                      <div className="overflow-x-auto pb-1 -mx-1 px-1">
                        <div className="grid grid-cols-7 gap-1 text-center relative min-w-[340px]">
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
                              <div className="w-8 h-8 rounded-full border border-border bg-muted/60 flex items-center justify-center font-black text-xs text-foreground mb-1">
                                {step.val}
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase truncate w-full px-1">{step.label}</span>
                            </div>
                          ))}
                          {/* Background connector line */}
                          <div className="absolute top-4 left-4 right-4 h-[1px] bg-border z-0" />
                        </div>
                      </div>
                    </div>

                    {/* Programmes de croissance actifs */}
                    {activePrograms.length > 0 && (
                      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Programmes actifs</h3>
                          <Link href="/campaigns" className="text-[10px] font-bold text-brand-accent-emerald hover:underline">Voir tous →</Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activePrograms.map(({ campaign, current, target, pct }) => (
                            <Link
                              key={campaign.id}
                              href={`/campaigns/${campaign.id}`}
                              className="rounded-xl border border-border hover:border-brand-accent-emerald/40 bg-card p-3.5 space-y-2 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-foreground truncate">{campaign.name}</span>
                                <span className="text-[9px] font-bold uppercase text-brand-accent-emerald bg-brand-accent-emeraldLight px-1.5 py-0.5 rounded-full shrink-0 border border-brand-accent-emeraldBorder/30">
                                  {GOAL_TYPE_LABELS[campaign.goalType!]}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{current} / {target} {GOAL_TYPE_UNITS[campaign.goalType!]}</span>
                                {pct !== null && <span className="font-bold text-brand-accent-emerald">{pct}%</span>}
                              </div>
                              {pct !== null && (
                                <div className="h-1 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-brand-accent-emerald rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Two Column Grid */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                      {/* Left column */}
                      <div className="flex flex-col gap-5">
                        <TodayAgendaCard />
                        <TodayGoogleCalendarCard />
                        <TodaySequenceStepsCard />
                        <TodayGoalsCard />
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col gap-5">
                        {/* Minerva Agent Feed */}
                        <AgentFeed />

                        <NextBestActionCard />
                        <AgentPrioritiesCard />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'pilotage' && (
              <PilotageTab leads={leads} tasks={tasks} />
            )}
          </div>
        </div>

        <SpeedRunOverlay isOpen={showSpeedRun} onClose={() => setShowSpeedRun(false)} />

        {showAestheticMode && (
          <TodayAestheticCanvas onClose={() => setShowAestheticMode(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default TodayRoot;
