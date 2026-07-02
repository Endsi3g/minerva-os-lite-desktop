'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  MessageSquareCheck, CalendarCheck2, TrendingUp, Users,
  RefreshCw, Zap, AlertTriangle, BarChart3, ArrowRight,
  Loader2, Telescope, Gauge, Mail, Phone, MapPin,
  CheckCircle2, Clock, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import { StrategyMemoryCard } from './strategy-memory-card';
import { WeeklyReportCard } from './weekly-report-card';
import { SlaCard } from './sla-card';
import { AgentJournal } from './agent-journal';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TodayStatsData {
  emails_sent: number;
  replies_received: number;
  agent_actions: number;
  appointments_created: number;
  leads_created: number;
  latest_actions: Array<{ action_type: string; reasoning: string | null; lead_id: string | null; created_at?: string; lead_name?: string }>;
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

type Tab = 'operations' | 'pilotage';

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysSince(date: string | undefined | null): number {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function timeAgo(date: string | undefined | null): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return new Date(date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent = '#059669' }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: string;
}) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[28px] font-black text-[#26251e] leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-[#7a7a76] mt-1.5 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-[#a3a197] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#dc2626' : score >= 50 ? '#d97706' : '#7a7a76';
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black text-white shrink-0" style={{ background: color }}>
      {score}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return null;
  const map: Record<string, { icon: React.ElementType; label: string }> = {
    email: { icon: Mail, label: 'Email' },
    call: { icon: Phone, label: 'Appel' },
    visite: { icon: MapPin, label: 'Visite' },
    terrain: { icon: MapPin, label: 'Terrain' },
  };
  const entry = map[channel.toLowerCase()] ?? { icon: Zap, label: channel };
  const Icon = entry.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#7a7a76] bg-[#f4f4f3] border border-[#e5e5e0] rounded px-1.5 py-0.5">
      <Icon className="h-3 w-3" />{entry.label}
    </span>
  );
}

function BucketCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex flex-col gap-2 min-h-[120px]">
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CockpitRoot() {
  const { leads, tasks, activeWorkspace } = useReach();
  const [tab, setTab] = useState<Tab>('operations');

  // Shared state
  const [nbaLeads, setNbaLeads] = useState<NbaLead[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStatsData | null>(null);
  const [nextActions, setNextActions] = useState<NextActionData | null>(null);
  const [loadingNba, setLoadingNba] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [calculatingScores, setCalculatingScores] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filters (Opérations tab)
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');

  // ── Derived (shared) ──
  const positiveReplies = leads.filter((l) => l.replyStatus === 'positive').length;
  const contactedLeads = leads.filter((l) => l.status !== 'New').length;
  const bookedLeads = leads.filter((l) => l.status === 'Meeting Booked').length;
  const bookingRate = contactedLeads > 0 ? ((bookedLeads / contactedLeads) * 100).toFixed(1) : '0.0';
  const wonLeads = leads.filter((l) => l.status === 'Won' && l.createdAt);
  let conversionSpeed = '—';
  if (wonLeads.length > 0) {
    const totalDays = wonLeads.reduce((s, l) => s + Math.max(0, (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) / 86400000), 0);
    conversionSpeed = `${(totalDays / wonLeads.length).toFixed(0)}j`;
  }
  const activeLeadsCount = leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').length;
  const avgNbaScore = useMemo(() => {
    const scored = leads.filter((l) => (l as any).nba_score > 0);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, l) => s + ((l as any).nba_score ?? 0), 0) / scored.length);
  }, [leads]);

  // ── Derived (Opérations tab) ──
  const niches = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.niche) set.add(l.niche); });
    return Array.from(set).sort();
  }, [leads]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

  const filteredLeads = useMemo(() =>
    leads.filter((l) => (!selectedNiche || l.niche === selectedNiche)),
    [leads, selectedNiche]
  );

  const urgentLeads = useMemo(() =>
    filteredLeads.filter((l) => (l as any).nba_score >= 70 || l.replyStatus === 'positive'),
    [filteredLeads]
  );
  const opportunityLeads = useMemo(() =>
    filteredLeads.filter((l) => (l as any).emailOpensCount >= 3 && !(l as any).replyDetectedAt && l.status !== 'Won' && l.status !== 'Lost'),
    [filteredLeads]
  );
  const blockedLeads = useMemo(() =>
    filteredLeads.filter((l) => ['Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation'].includes(l.status) && l.updatedAt && new Date(l.updatedAt).getTime() < sevenDaysAgo),
    [filteredLeads, sevenDaysAgo]
  );
  const overdueOrTodayTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    return tasks.filter((t) => !t.completed && t.dueDate && (new Date(t.dueDate) <= new Date() || new Date(t.dueDate).toDateString() === todayStr));
  }, [tasks]);
  const nichesInBaisse = useMemo(() => {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const nicheMap: Record<string, number> = {};
    leads.forEach((l) => {
      if (!l.niche) return;
      nicheMap[l.niche] = nicheMap[l.niche] ?? 0;
      if (l.replyStatus === 'positive' && l.updatedAt && new Date(l.updatedAt).getTime() > fourteenDaysAgo) nicheMap[l.niche]++;
    });
    return Object.values(nicheMap).filter((c) => c === 0).length;
  }, [leads]);
  const leadsWithoutContact = useMemo(() =>
    leads.filter((l) => l.status === 'New' && l.createdAt && new Date(l.createdAt).getTime() < threeDaysAgo).length,
    [leads, threeDaysAgo]
  );

  // ── Derived (Pilotage tab) ──
  const stagnantLeads = leads.filter((l) => l.updatedAt && new Date(l.updatedAt).getTime() < sevenDaysAgo && l.status !== 'Won' && l.status !== 'Lost').length;
  const openNoReply = leads.filter((l) => (l as any).emailOpensCount >= 3 && !l.replyDetectedAt).length;
  const actionTypeCounts: Record<string, number> = {};
  if (todayStats?.latest_actions) {
    for (const a of todayStats.latest_actions) actionTypeCounts[a.action_type] = (actionTypeCounts[a.action_type] ?? 0) + 1;
  }
  const maxCount = Math.max(1, ...Object.values(actionTypeCounts));
  const ACTION_LABELS: Record<string, string> = {
    generate_email_draft: 'Email de relance', create_task: 'Tâche créée',
    update_pipeline_stage: 'Pipeline mis à jour', enroll_in_sequence: 'Séquence démarrée',
    plan_field_route: 'Visite terrain', update_agent_memory: 'Mémoire agent',
  };
  const nbaScoreBadgeStyle = (score: number) => {
    if (score >= 75) return 'bg-[#dcfce7] text-[#059669]';
    if (score >= 50) return 'bg-[#fef9c3] text-[#a16207]';
    return 'bg-[#fee2e2] text-[#dc2626]';
  };

  // ── Fetches ──
  const fetchNba = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingNba(true);
    try {
      const r = await fetch(getApiUrl(`/api/nba/score?workspace_id=${activeWorkspace.id}`));
      if (r.ok) setNbaLeads((await r.json()).leads ?? []);
    } finally { setLoadingNba(false); }
  }, [activeWorkspace]);

  const fetchStats = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingStats(true);
    try {
      const r = await fetch(getApiUrl(`/api/agent/today-stats?workspace_id=${activeWorkspace.id}`));
      if (r.ok) setTodayStats(await r.json());
    } finally { setLoadingStats(false); }
  }, [activeWorkspace]);

  const fetchNextActions = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingActions(true);
    try {
      const r = await fetch(getApiUrl(`/api/agent/next-action?workspace_id=${activeWorkspace.id}`));
      if (r.ok) setNextActions(await r.json());
    } finally { setLoadingActions(false); }
  }, [activeWorkspace]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchNba(), fetchStats(), fetchNextActions()]);
  }, [fetchNba, fetchStats, fetchNextActions]);

  useEffect(() => {
    refreshAll().finally(() => setInitialLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    fetch(getApiUrl('/api/team/sla'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: activeWorkspace.id }) });
  }, [activeWorkspace?.id]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch(getApiUrl('/api/nba/score'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: activeWorkspace?.id }) });
      await fetch(getApiUrl('/api/nba/insights'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: activeWorkspace?.id }) });
      await refreshAll();
      toast.success('Revenue OS mis à jour');
    } catch { toast.error('Erreur lors du rafraîchissement'); }
    finally { setRefreshing(false); }
  };

  const handleApprove = async (actionId: string) => {
    if (!activeWorkspace) return;
    setApprovingId(actionId);
    try {
      await fetch(getApiUrl('/api/agent/next-action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action_id: actionId, workspace_id: activeWorkspace.id }) });
      await fetchNextActions();
    } finally { setApprovingId(null); }
  };

  const handleCalculateScores = async () => {
    if (!activeWorkspace) return;
    setCalculatingScores(true);
    try {
      await fetch(getApiUrl('/api/nba/score'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: activeWorkspace.id }) });
      await fetchNba();
    } finally { setCalculatingScores(false); }
  };

  const handleAnalyzeInsights = async () => {
    if (!activeWorkspace) return;
    try {
      await fetch(getApiUrl('/api/nba/insights'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: activeWorkspace.id }) });
      toast.success('Analyse en cours — résultats dans quelques instants');
    } catch { toast.error('Erreur lors de l\'analyse'); }
  };

  const topNbaLeads = nbaLeads.slice(0, 5);

  // ── Loading ──
  if (initialLoading) {
    return (
      <div className="flex flex-col h-full bg-[#fafaf8] overflow-hidden">
        <div className="sticky top-0 z-10 bg-[#fafaf8] border-b border-[#e5e5e0] px-4 sm:px-6 py-3">
          <div className="h-6 w-40 rounded-lg bg-neutral-200 animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map((i) => <div key={i} className="h-24 rounded-xl bg-neutral-200 animate-pulse" />)}
          </div>
          <div className="h-48 rounded-xl bg-neutral-200 animate-pulse" />
          <div className="h-32 rounded-xl bg-neutral-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (leads.length === 0) {
    return (
      <ErrorBoundary>
        <div className="h-full overflow-y-auto bg-[#fafaf8] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm p-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#05966915' }}>
              <Telescope className="h-7 w-7" style={{ color: '#059669' }} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#26251e]">Revenue OS vide</h2>
              <p className="text-xs text-[#7a7a76] mt-1">Commencez par prospecter des leads pour voir les priorités et scores NBA en temps réel.</p>
            </div>
            <Link href="/prospecting" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors" style={{ background: '#059669' }}>
              Scraper des leads <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ── Render ──
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-[#fafaf8] overflow-hidden">

        {/* ── Sticky Header ── */}
        <div className="sticky top-0 z-10 bg-[#fafaf8] border-b border-[#e5e5e0] shrink-0">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2.5">
              <Gauge className="h-5 w-5 text-[#059669] shrink-0" />
              <span className="text-lg font-black text-[#26251e] leading-none">Revenue OS</span>
              <span className="hidden sm:inline text-[10px] font-bold text-[#7a7a76] bg-[#e5e5e0] rounded px-1.5 py-0.5">v8.6</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tab === 'operations' && (
                <>
                  <select value={selectedNiche} onChange={(e) => setSelectedNiche(e.target.value)}
                    className="text-xs border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 bg-white text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669]">
                    <option value="">Toutes niches</option>
                    {niches.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <select value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}
                    className="text-xs border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 bg-white text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669]">
                    <option value="">Tous canaux</option>
                    <option value="email">Email</option>
                    <option value="call">Appel</option>
                    <option value="terrain">Terrain</option>
                  </select>
                </>
              )}
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex items-center gap-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-[#e5e5e0] px-4 sm:px-6">
            {([
              { id: 'operations', label: 'Opérations', icon: Gauge },
              { id: 'pilotage', label: 'Pilotage stratégique', icon: BarChart3 },
            ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors',
                  tab === id ? 'border-[#059669] text-[#059669]' : 'border-transparent text-[#7a7a76] hover:text-[#26251e]')}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Opérations ── */}
        {tab === 'operations' && (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 p-4 sm:p-6">

              {/* Left */}
              <div className="flex flex-col gap-5 min-w-0">

                {/* File de priorité */}
                <section>
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">File de priorité</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                    <BucketCard>
                      <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#dc2626] pl-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-[#dc2626] shrink-0" />
                        <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">Urgent</span>
                        <span className="ml-auto text-[10px] font-bold text-[#dc2626]">{urgentLeads.length}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {urgentLeads.slice(0, 5).map((l) => (
                          <Link key={l.id} href={`/leads/${l.id}`}
                            className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-[#fef2f2] hover:bg-[#fee2e2] transition-colors group">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-[#26251e] truncate">{l.businessName}</p>
                              {(l as any).nba_score > 0 && <span className="text-[9px] font-bold text-[#dc2626]">Score {(l as any).nba_score}</span>}
                            </div>
                            <ChevronRight className="h-3 w-3 text-[#dc2626] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ))}
                        {urgentLeads.length === 0 && <p className="text-[10px] text-[#7a7a76] mt-1">Aucun lead urgent</p>}
                      </div>
                    </BucketCard>

                    <BucketCard>
                      <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#d97706] pl-2">
                        <TrendingUp className="h-3.5 w-3.5 text-[#d97706] shrink-0" />
                        <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">Opportunité</span>
                        <span className="ml-auto text-[10px] font-bold text-[#d97706]">{opportunityLeads.length}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {opportunityLeads.slice(0, 5).map((l) => (
                          <Link key={l.id} href={`/leads/${l.id}`}
                            className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-[#fffbeb] hover:bg-[#fef3c7] transition-colors group">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-[#26251e] truncate">{l.businessName}</p>
                              <span className="text-[9px] font-bold text-[#d97706]">A ouvert {(l as any).emailOpensCount}x</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-[#d97706] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ))}
                        {opportunityLeads.length === 0 && <p className="text-[10px] text-[#7a7a76] mt-1">Aucune opportunité</p>}
                      </div>
                    </BucketCard>

                    <BucketCard>
                      <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#6b7280] pl-2">
                        <Clock className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                        <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">Bloqué</span>
                        <span className="ml-auto text-[10px] font-bold text-[#7a7a76]">{blockedLeads.length}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {blockedLeads.slice(0, 5).map((l) => (
                          <Link key={l.id} href={`/leads/${l.id}`}
                            className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-[#f9f9f8] hover:bg-[#f0f0ef] transition-colors group">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-[#26251e] truncate">{l.businessName}</p>
                              <span className="text-[9px] font-bold text-[#7a7a76]">{daysSince(l.updatedAt)}j sans activité</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-[#7a7a76] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ))}
                        {blockedLeads.length === 0 && <p className="text-[10px] text-[#7a7a76] mt-1">Aucun lead bloqué</p>}
                      </div>
                    </BucketCard>

                    <BucketCard>
                      <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#059669] pl-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                        <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">À approuver</span>
                        {nextActions && <span className="ml-auto text-[10px] font-bold text-[#059669]">{nextActions.count}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {loadingActions ? (
                          <div className="flex items-center gap-1.5 mt-1"><Loader2 className="h-3 w-3 animate-spin text-[#7a7a76]" /><span className="text-[10px] text-[#7a7a76]">Chargement…</span></div>
                        ) : nextActions && (nextActions.pending_actions ?? []).length > 0 ? (
                          (nextActions.pending_actions ?? []).slice(0, 5).map((action) => (
                            <div key={action.id} className="flex flex-col gap-1 p-1.5 rounded-lg bg-[#f0fdf9] border border-[#059669]/20">
                              <p className="text-[10px] font-bold text-[#26251e] truncate">{action.action_type}</p>
                              {action.lead_name && <p className="text-[9px] text-[#7a7a76] truncate">{action.lead_name}</p>}
                              <button onClick={() => handleApprove(action.id)} disabled={approvingId === action.id}
                                className="self-start text-[9px] font-black text-[#059669] hover:text-[#047857] disabled:opacity-50 transition-colors">
                                {approvingId === action.id ? 'Approbation…' : 'Approuver →'}
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-[#7a7a76] mt-1">Aucune action en attente</p>
                        )}
                      </div>
                    </BucketCard>

                  </div>
                </section>

                {/* NBA top5 */}
                <section>
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">Prochaines meilleures actions</h2>
                  {loadingNba ? (
                    <div className="flex items-center gap-2 text-xs text-[#7a7a76] py-4"><Loader2 className="h-4 w-4 animate-spin" />Calcul des scores NBA…</div>
                  ) : topNbaLeads.length === 0 ? (
                    <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 flex flex-col items-center gap-3 text-center">
                      <Zap className="h-8 w-8 text-[#e5e5e0]" />
                      <p className="text-xs font-semibold text-[#7a7a76]">Aucun score NBA calculé</p>
                      <button onClick={handleCalculateScores} disabled={calculatingScores}
                        className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                        {calculatingScores && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Calculer les scores NBA
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {topNbaLeads.map((lead) => (
                        <div key={lead.id} className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex items-center gap-3">
                          <ScoreBadge score={lead.nba_score} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#26251e] truncate">{lead.business_name}</p>
                            <p className="text-[10px] text-[#7a7a76] truncate">{lead.niche}{lead.city ? ` · ${lead.city}` : ''}</p>
                            {lead.nba_action && <p className="text-[10px] font-semibold text-[#26251e] mt-0.5 truncate">{lead.nba_action}</p>}
                          </div>
                          <ChannelBadge channel={lead.nba_channel} />
                          <Link href={`/leads/${lead.id}`} className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#f4f4f3] hover:bg-[#e5e5e0] text-[#26251e] transition-colors shrink-0">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Tâches du jour */}
                {overdueOrTodayTasks.length > 0 && (
                  <section>
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">Tâches du jour</h2>
                    <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#e5e5e0]">
                      {overdueOrTodayTasks.slice(0, 8).map((task) => {
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                        return (
                          <div key={task.id} className="flex items-center gap-3 px-3 py-2">
                            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isOverdue ? 'bg-[#dc2626]' : 'bg-[#059669]')} />
                            <p className="flex-1 text-xs text-[#26251e] truncate">{task.title}</p>
                            {task.dueDate && (
                              <span className={cn('text-[9px] font-bold shrink-0', isOverdue ? 'text-[#dc2626]' : 'text-[#7a7a76]')}>
                                {new Date(task.dueDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {overdueOrTodayTasks.length > 8 && (
                        <div className="px-3 py-2"><Link href="/tasks" className="text-[10px] font-bold text-[#059669] hover:underline">+ {overdueOrTodayTasks.length - 8} autres tâches</Link></div>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {/* Right sidebar */}
              <div className="flex flex-col gap-4">
                <section>
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">Performance</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Réponses +', value: positiveReplies, color: '#059669' },
                      { label: 'Leads actifs', value: activeLeadsCount, color: '#26251e' },
                      { label: 'Bookings', value: bookedLeads, color: '#d97706' },
                      { label: 'Score moyen', value: avgNbaScore || '—', color: '#059669' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex flex-col gap-1">
                        <p className="text-[22px] font-black leading-none" style={{ color }}>{value}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] leading-tight">{label}</p>
                      </div>
                    ))}
                  </div>
                  {todayStats && todayStats.agent_actions > 0 && (
                    <div className="mt-2 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] px-3 py-2 flex items-center justify-between">
                      <span className="text-[10px] text-[#7a7a76] font-medium">Taux d&apos;acceptation NBA</span>
                      <span className="text-xs font-black text-[#059669]">{todayStats.latest_actions?.length ?? 0}/{todayStats.agent_actions}</span>
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">Activité agent (aujourd&apos;hui)</h2>
                  <div className="rounded-xl border border-[#e5e5e0] bg-white p-3">
                    {loadingStats ? (
                      <div className="flex items-center gap-2 text-xs text-[#7a7a76] py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement…</div>
                    ) : todayStats && todayStats.latest_actions.length > 0 ? (
                      <div className="flex flex-col divide-y divide-[#e5e5e0]">
                        {todayStats.latest_actions.slice(0, 6).map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#059669] mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-[#26251e] truncate">{action.action_type}</p>
                              {action.lead_name && <p className="text-[9px] text-[#7a7a76] truncate">{action.lead_name}</p>}
                              {action.reasoning && <p className="text-[9px] text-[#7a7a76] truncate">{action.reasoning}</p>}
                            </div>
                            {action.created_at && <span className="text-[9px] text-[#7a7a76] shrink-0">{timeAgo(action.created_at)}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#7a7a76] py-2">Aucune activité enregistrée aujourd&apos;hui.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">Alertes signaux</h2>
                  <div className="flex flex-col gap-2">
                    {[
                      { icon: TrendingUp, bg: '#fef3c7', color: '#d97706', title: 'Niches en baisse', body: nichesInBaisse > 0 ? `${nichesInBaisse} niche${nichesInBaisse > 1 ? 's' : ''} sans réponse positive ces 14j` : 'Toutes les niches ont eu des réponses récentes' },
                      { icon: Mail, bg: '#fafaf8', color: '#7a7a76', title: 'Séquences sous-performantes', body: 'Consultez les analytics pour identifier les séquences à faible taux d\'ouverture.' },
                      { icon: AlertTriangle, bg: '#fef2f2', color: '#dc2626', title: 'Leads sans contact', body: leadsWithoutContact > 0 ? `${leadsWithoutContact} lead${leadsWithoutContact > 1 ? 's' : ''} au statut Nouveau depuis 3j+` : 'Tous les nouveaux leads ont été contactés' },
                    ].map(({ icon: Icon, bg, color, title, body }) => (
                      <div key={title} className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div><p className="text-[10px] font-black text-[#26251e]">{title}</p><p className="text-[10px] text-[#7a7a76] mt-0.5">{body}</p></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Pilotage stratégique ── */}
        {tab === 'pilotage' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto flex flex-col gap-6 p-4 sm:p-6">

              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Réponses positives" value={positiveReplies} sub="Leads ayant répondu positivement" icon={MessageSquareCheck} />
                <StatCard label="Taux de booking" value={`${bookingRate}%`} sub={`${bookedLeads} RDV / ${contactedLeads} contactés`} icon={CalendarCheck2} />
                <StatCard label="Vitesse de conversion" value={conversionSpeed} sub={wonLeads.length > 0 ? `Sur ${wonLeads.length} deal(s) gagnés` : 'Aucun deal gagné'} icon={TrendingUp} />
                <StatCard label="Leads actifs" value={activeLeadsCount} sub="Hors Won et Lost" icon={Users} />
              </div>

              {/* Séquences performantes */}
              <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-[#059669]" />
                  <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Séquences performantes</h2>
                </div>
                {loadingStats ? (
                  <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-7 rounded-lg bg-[#f4f4f3] animate-pulse" />)}</div>
                ) : Object.keys(actionTypeCounts).length === 0 ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-[#7a7a76]"><Zap className="h-3.5 w-3.5" />Aucune action agent aujourd&apos;hui — lancez un cycle pour voir les données</div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(actionTypeCounts).sort(([,a],[,b]) => b - a).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-[11px] text-[#555552] w-36 shrink-0 truncate">{ACTION_LABELS[type] ?? type}</span>
                        <div className="flex-1 h-5 bg-[#f4f4f3] rounded-md overflow-hidden">
                          <div className="h-full bg-[#059669] rounded-md transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-[#26251e] w-4 text-right shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Signaux d'alerte */}
              <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-[#059669]" />
                  <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Signaux d&apos;alerte</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-[#e5e5e0] p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-[#26251e]">Taux de réponse par niche</p>
                    <p className="text-[10px] text-[#7a7a76]">Analyse les performances par secteur</p>
                    <button onClick={handleAnalyzeInsights} className="mt-auto flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857] transition-colors">
                      Analyser <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="rounded-lg border border-[#e5e5e0] p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-[#26251e]">Leads ouverts sans réponse</p>
                    <p className="text-[28px] font-black text-[#26251e] leading-none">{openNoReply}</p>
                    <p className="text-[10px] text-[#7a7a76]">3+ ouvertures sans reply détecté</p>
                  </div>
                  <div className="rounded-lg border border-[#e5e5e0] p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-[#26251e]">Stagnation pipeline</p>
                    <p className="text-[28px] font-black text-[#26251e] leading-none">{stagnantLeads}</p>
                    <p className="text-[10px] text-[#7a7a76]">Leads non mis à jour depuis 7j+</p>
                  </div>
                </div>
              </div>

              {/* NBA actions en attente */}
              <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-[#059669]" />
                  <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Actions NBA en attente</h2>
                </div>
                {loadingNba ? (
                  <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-10 rounded-lg bg-[#f4f4f3] animate-pulse" />)}</div>
                ) : nbaLeads.length === 0 ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-[#7a7a76]"><Zap className="h-3.5 w-3.5" />Aucun lead NBA calculé — cliquez Actualiser pour lancer le scoring</div>
                ) : (
                  <div className="divide-y divide-[#f4f4f3]">
                    {nbaLeads.slice(0, 5).map((lead) => (
                      <div key={lead.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#26251e] truncate">{lead.business_name}</p>
                          {lead.nba_reason && <p className="text-[10px] text-[#7a7a76] truncate">{lead.nba_reason}</p>}
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', nbaScoreBadgeStyle(lead.nba_score ?? 0))}>
                          {lead.nba_score ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <StrategyMemoryCard />
              <SlaCard />
              <WeeklyReportCard />
              <AgentJournal />
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
}

export default CockpitRoot;
