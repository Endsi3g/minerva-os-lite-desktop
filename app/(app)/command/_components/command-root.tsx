'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  RefreshCw,
  Gauge,
  ChevronRight,
  Zap,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';

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

interface TodayStatsData {
  emails_sent: number;
  replies_received: number;
  agent_actions: number;
  appointments_created: number;
  leads_created: number;
  latest_actions: Array<{
    action_type: string;
    reasoning: string | null;
    lead_id: string | null;
    created_at?: string;
    lead_name?: string;
  }>;
}

interface NextActionData {
  pending_actions: AgentAction[];
  count: number;
}

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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? '#dc2626' : score >= 50 ? '#d97706' : '#7a7a76';
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black text-white shrink-0"
      style={{ background: color }}
    >
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
      <Icon className="h-3 w-3" />
      {entry.label}
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

export function CommandRoot() {
  const { leads, tasks, activeWorkspace } = useReach();

  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [nbaLeads, setNbaLeads] = useState<NbaLead[]>([]);
  const [nextActions, setNextActions] = useState<NextActionData | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStatsData | null>(null);
  const [loadingNba, setLoadingNba] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [calculatingScores, setCalculatingScores] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const niches = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.niche) set.add(l.niche); });
    return Array.from(set).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (selectedNiche && l.niche !== selectedNiche) return false;
      return true;
    });
  }, [leads, selectedNiche]);

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

  const urgentLeads = useMemo(() =>
    filteredLeads.filter(
      (l) => (l as any).nba_score >= 70 || l.replyStatus === 'positive'
    ),
    [filteredLeads]
  );

  const opportunityLeads = useMemo(() =>
    filteredLeads.filter(
      (l) =>
        (l as any).emailOpensCount >= 3 &&
        !(l as any).replyDetectedAt &&
        l.status !== 'Won' &&
        l.status !== 'Lost'
    ),
    [filteredLeads]
  );

  const blockedLeads = useMemo(() =>
    filteredLeads.filter(
      (l) =>
        ['Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation'].includes(l.status) &&
        l.updatedAt &&
        new Date(l.updatedAt).getTime() < sevenDaysAgo
    ),
    [filteredLeads, sevenDaysAgo]
  );

  const activeLeadsCount = useMemo(() =>
    leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').length,
    [leads]
  );

  const positiveRepliesCount = useMemo(() =>
    leads.filter((l) => l.replyStatus === 'positive').length,
    [leads]
  );

  const bookingsCount = useMemo(() =>
    leads.filter((l) => l.status === 'Meeting Booked').length,
    [leads]
  );

  const avgNbaScore = useMemo(() => {
    const scored = leads.filter((l) => (l as any).nba_score > 0);
    if (!scored.length) return 0;
    const total = scored.reduce((s, l) => s + ((l as any).nba_score ?? 0), 0);
    return Math.round(total / scored.length);
  }, [leads]);

  const overdueOrTodayTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    return tasks.filter((t) => {
      if (t.completed) return false;
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due <= new Date() || due.toDateString() === todayStr;
    });
  }, [tasks]);

  const nichesInBaisse = useMemo(() => {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const nicheMap: Record<string, number> = {};
    leads.forEach((l) => {
      if (!l.niche) return;
      if (!nicheMap[l.niche]) nicheMap[l.niche] = 0;
      if (
        l.replyStatus === 'positive' &&
        l.updatedAt &&
        new Date(l.updatedAt).getTime() > fourteenDaysAgo
      ) {
        nicheMap[l.niche]++;
      }
    });
    return Object.values(nicheMap).filter((count) => count === 0).length;
  }, [leads]);

  const leadsWithoutContact = useMemo(() =>
    leads.filter(
      (l) =>
        l.status === 'New' &&
        l.createdAt &&
        new Date(l.createdAt).getTime() < threeDaysAgo
    ).length,
    [leads, threeDaysAgo]
  );

  const fetchNba = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingNba(true);
    try {
      const res = await fetch(getApiUrl(`/api/nba/score?workspace_id=${activeWorkspace.id}`));
      if (res.ok) {
        const data = await res.json();
        setNbaLeads(data.leads ?? []);
      }
    } catch {}
    finally { setLoadingNba(false); }
  }, [activeWorkspace]);

  const fetchNextActions = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingActions(true);
    try {
      const res = await fetch(getApiUrl(`/api/agent/next-action?workspace_id=${activeWorkspace.id}`));
      if (res.ok) {
        const data = await res.json();
        setNextActions(data);
      }
    } catch {}
    finally { setLoadingActions(false); }
  }, [activeWorkspace]);

  const fetchStats = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingStats(true);
    try {
      const res = await fetch(getApiUrl(`/api/agent/today-stats?workspace_id=${activeWorkspace.id}`));
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data);
      }
    } catch {}
    finally { setLoadingStats(false); }
  }, [activeWorkspace]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchNba(), fetchNextActions(), fetchStats()]);
  }, [fetchNba, fetchNextActions, fetchStats]);

  useEffect(() => {
    refreshAll().finally(() => setInitialLoading(false));
  }, [refreshAll]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    fetch(getApiUrl('/api/team/sla'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: activeWorkspace.id }),
    });
  }, [activeWorkspace?.id]);

  const handleApprove = async (actionId: string) => {
    if (!activeWorkspace) return;
    setApprovingId(actionId);
    try {
      await fetch(getApiUrl('/api/agent/next-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId, workspace_id: activeWorkspace.id }),
      });
      await fetchNextActions();
    } catch {}
    finally { setApprovingId(null); }
  };

  const handleCalculateScores = async () => {
    if (!activeWorkspace) return;
    setCalculatingScores(true);
    try {
      await fetch(getApiUrl('/api/nba/score'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id }),
      });
      await fetchNba();
    } catch {}
    finally { setCalculatingScores(false); }
  };

  const topNbaLeads = nbaLeads.slice(0, 5);

  if (initialLoading) {
    return (
      <div className="flex flex-col h-full bg-[#fafaf8] overflow-hidden">
        <div className="sticky top-0 z-10 bg-[#fafaf8] border-b border-[#e5e5e0] px-4 sm:px-6 py-3 shrink-0">
          <div className="h-6 w-40 rounded-lg bg-neutral-200 animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          <div className="h-32 rounded-xl bg-neutral-200 animate-pulse" />
          <div className="h-48 rounded-xl bg-neutral-200 animate-pulse" />
          <div className="h-24 rounded-xl bg-neutral-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="flex flex-col h-full bg-[#fafaf8] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#fafaf8] border-b border-[#e5e5e0] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[#059669] shrink-0" />
            <span className="text-lg font-black text-[#26251e] leading-none">Command Center</span>
          </div>
          <span className="hidden sm:inline text-[10px] font-bold text-[#7a7a76] bg-[#e5e5e0] rounded px-1.5 py-0.5">
            v8 · Revenue OS
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedNiche}
            onChange={(e) => setSelectedNiche(e.target.value)}
            className="text-xs border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 bg-white text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669] cursor-pointer"
          >
            <option value="">Toutes niches</option>
            {niches.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="text-xs border border-[#e5e5e0] rounded-lg px-2.5 py-1.5 bg-white text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669] cursor-pointer"
          >
            <option value="">Tous canaux</option>
            <option value="email">Email</option>
            <option value="call">Appel</option>
            <option value="terrain">Terrain</option>
          </select>

          <button
            onClick={refreshAll}
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-[#e5e5e0] bg-white text-[#7a7a76] hover:text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 p-4 sm:p-6">

          {/* Left column */}
          <div className="flex flex-col gap-5 min-w-0">

            {/* Block 1 — Priority Queue */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">
                File de priorité
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {/* A. Urgent */}
                <BucketCard>
                  <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#dc2626] pl-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#dc2626] shrink-0" />
                    <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">Urgent</span>
                    <span className="ml-auto text-[10px] font-bold text-[#dc2626]">{urgentLeads.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {urgentLeads.slice(0, 5).map((l) => (
                      <Link
                        key={l.id}
                        href={`/leads/${l.id}`}
                        className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-[#fef2f2] hover:bg-[#fee2e2] transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#26251e] truncate">{l.businessName}</p>
                          {(l as any).nba_score > 0 && (
                            <span className="text-[9px] font-bold text-[#dc2626]">
                              Score {(l as any).nba_score}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-3 w-3 text-[#dc2626] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                    {urgentLeads.length === 0 && (
                      <p className="text-[10px] text-[#7a7a76] mt-1">Aucun lead urgent</p>
                    )}
                    {urgentLeads.length > 5 && (
                      <Link href="/leads" className="text-[9px] font-bold text-[#dc2626] hover:underline">
                        + {urgentLeads.length - 5} autres
                      </Link>
                    )}
                  </div>
                </BucketCard>

                {/* B. Opportunité */}
                <BucketCard>
                  <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#d97706] pl-2">
                    <TrendingUp className="h-3.5 w-3.5 text-[#d97706] shrink-0" />
                    <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">Opportunité</span>
                    <span className="ml-auto text-[10px] font-bold text-[#d97706]">{opportunityLeads.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {opportunityLeads.slice(0, 5).map((l) => (
                      <Link
                        key={l.id}
                        href={`/leads/${l.id}`}
                        className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-[#fffbeb] hover:bg-[#fef3c7] transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#26251e] truncate">{l.businessName}</p>
                          <span className="text-[9px] font-bold text-[#d97706]">
                            A ouvert {(l as any).emailOpensCount}x
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-[#d97706] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                    {opportunityLeads.length === 0 && (
                      <p className="text-[10px] text-[#7a7a76] mt-1">Aucune opportunité</p>
                    )}
                    {opportunityLeads.length > 5 && (
                      <Link href="/leads" className="text-[9px] font-bold text-[#d97706] hover:underline">
                        + {opportunityLeads.length - 5} autres
                      </Link>
                    )}
                  </div>
                </BucketCard>

                {/* C. Bloqué */}
                <BucketCard>
                  <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#6b7280] pl-2">
                    <Clock className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                    <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">Bloqué</span>
                    <span className="ml-auto text-[10px] font-bold text-[#7a7a76]">{blockedLeads.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {blockedLeads.slice(0, 5).map((l) => (
                      <Link
                        key={l.id}
                        href={`/leads/${l.id}`}
                        className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-[#f9f9f8] hover:bg-[#f0f0ef] transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-[#26251e] truncate">{l.businessName}</p>
                          <span className="text-[9px] font-bold text-[#7a7a76]">
                            {daysSince(l.updatedAt)}j sans activité
                          </span>
                        </div>
                        <ChevronRight className="h-3 w-3 text-[#7a7a76] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                    {blockedLeads.length === 0 && (
                      <p className="text-[10px] text-[#7a7a76] mt-1">Aucun lead bloqué</p>
                    )}
                    {blockedLeads.length > 5 && (
                      <Link href="/leads" className="text-[9px] font-bold text-[#7a7a76] hover:underline">
                        + {blockedLeads.length - 5} autres
                      </Link>
                    )}
                  </div>
                </BucketCard>

                {/* D. À approuver */}
                <BucketCard>
                  <div className="flex items-center gap-1.5 border-l-[3px] border-l-[#059669] pl-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                    <span className="text-[10px] font-black text-[#26251e] uppercase tracking-wide">À approuver</span>
                    {nextActions && (
                      <span className="ml-auto text-[10px] font-bold text-[#059669]">{nextActions.count}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {loadingActions ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Loader2 className="h-3 w-3 animate-spin text-[#7a7a76]" />
                        <span className="text-[10px] text-[#7a7a76]">Chargement…</span>
                      </div>
                    ) : nextActions && (nextActions.pending_actions ?? []).length > 0 ? (
                      (nextActions.pending_actions ?? []).slice(0, 5).map((action) => (
                        <div
                          key={action.id}
                          className="flex flex-col gap-1 p-1.5 rounded-lg bg-[#f0fdf9] border border-[#059669]/20"
                        >
                          <p className="text-[10px] font-bold text-[#26251e] truncate">
                            {action.action_type}
                          </p>
                          {action.lead_name && (
                            <p className="text-[9px] text-[#7a7a76] truncate">{action.lead_name}</p>
                          )}
                          <button
                            onClick={() => handleApprove(action.id)}
                            disabled={approvingId === action.id}
                            className="self-start text-[9px] font-black text-[#059669] hover:text-[#047857] disabled:opacity-50 transition-colors"
                          >
                            {approvingId === action.id ? 'Approbation…' : 'Approuver →'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-[#7a7a76] mt-1">Aucune action en attente</p>
                    )}
                    {nextActions && (nextActions.pending_actions ?? []).length > 5 && (
                      <p className="text-[9px] font-bold text-[#059669]">
                        + {(nextActions.pending_actions ?? []).length - 5} autres
                      </p>
                    )}
                  </div>
                </BucketCard>

              </div>
            </section>

            {/* Block 2 — Next Best Actions */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">
                Prochaines meilleures actions
              </h2>

              {loadingNba ? (
                <div className="flex items-center gap-2 text-xs text-[#7a7a76] py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcul des scores NBA…
                </div>
              ) : topNbaLeads.length === 0 ? (
                <div className="rounded-xl border border-[#e5e5e0] bg-white p-6 flex flex-col items-center gap-3 text-center">
                  <Zap className="h-8 w-8 text-[#e5e5e0]" />
                  <p className="text-xs font-semibold text-[#7a7a76]">Aucun score NBA calculé</p>
                  <button
                    onClick={handleCalculateScores}
                    disabled={calculatingScores}
                    className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {calculatingScores && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Calculer les scores NBA
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {topNbaLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex items-center gap-3"
                    >
                      <ScoreBadge score={lead.nba_score} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#26251e] truncate">{lead.business_name}</p>
                        <p className="text-[10px] text-[#7a7a76] truncate">
                          {lead.niche}{lead.city ? ` · ${lead.city}` : ''}
                        </p>
                        {lead.nba_action && (
                          <p className="text-[10px] font-semibold text-[#26251e] mt-0.5 truncate">
                            {lead.nba_action}
                          </p>
                        )}
                      </div>
                      <ChannelBadge channel={lead.nba_channel} />
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex items-center justify-center h-7 w-7 rounded-lg bg-[#f4f4f3] hover:bg-[#e5e5e0] text-[#26251e] transition-colors shrink-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Block 3 — Operational State */}
            {overdueOrTodayTasks.length > 0 && (
              <section>
                <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">
                  Tâches du jour
                </h2>
                <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#e5e5e0]">
                  {overdueOrTodayTasks.slice(0, 8).map((task) => {
                    const isOverdue =
                      task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isOverdue ? 'bg-[#dc2626]' : 'bg-[#059669]'
                          )}
                        />
                        <p className="flex-1 text-xs text-[#26251e] truncate">{task.title}</p>
                        {task.dueDate && (
                          <span
                            className={cn(
                              'text-[9px] font-bold shrink-0',
                              isOverdue ? 'text-[#dc2626]' : 'text-[#7a7a76]'
                            )}
                          >
                            {new Date(task.dueDate).toLocaleDateString('fr-CA', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {overdueOrTodayTasks.length > 8 && (
                    <div className="px-3 py-2">
                      <Link href="/tasks" className="text-[10px] font-bold text-[#059669] hover:underline">
                        + {overdueOrTodayTasks.length - 8} autres tâches
                      </Link>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-4">

            {/* Block 4 — Performance KPIs */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">
                Performance
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Réponses positives', value: positiveRepliesCount, color: '#059669' },
                  { label: 'Leads actifs', value: activeLeadsCount, color: '#26251e' },
                  { label: 'Bookings', value: bookingsCount, color: '#d97706' },
                  { label: 'Score moyen NBA', value: avgNbaScore || '—', color: '#059669' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex flex-col gap-1"
                  >
                    <p className="text-[22px] font-black leading-none" style={{ color }}>
                      {value}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] leading-tight">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              {todayStats && todayStats.agent_actions > 0 && (() => {
                const suggested = todayStats.agent_actions;
                const accepted = todayStats.latest_actions?.length ?? 0;
                return (
                  <div className="mt-2 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] text-[#7a7a76] font-medium">Taux d&apos;acceptation NBA</span>
                    <span className="text-xs font-black text-[#059669]">
                      {accepted}/{suggested}
                    </span>
                  </div>
                );
              })()}
            </section>

            {/* Block 5 — Agent activity */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">
                Activité agent (aujourd&apos;hui)
              </h2>
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-3">
                {loadingStats ? (
                  <div className="flex items-center gap-2 text-xs text-[#7a7a76] py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Chargement…
                  </div>
                ) : todayStats && todayStats.latest_actions.length > 0 ? (
                  <div className="flex flex-col divide-y divide-[#e5e5e0]">
                    {todayStats.latest_actions.slice(0, 6).map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#059669] mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-[#26251e] truncate">
                            {action.action_type}
                          </p>
                          {action.lead_name && (
                            <p className="text-[9px] text-[#7a7a76] truncate">{action.lead_name}</p>
                          )}
                          {action.reasoning && (
                            <p className="text-[9px] text-[#7a7a76] truncate">{action.reasoning}</p>
                          )}
                        </div>
                        {action.created_at && (
                          <span className="text-[9px] text-[#7a7a76] shrink-0">
                            {timeAgo(action.created_at)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-[#7a7a76] py-2">Aucune activité enregistrée aujourd&apos;hui.</p>
                )}
              </div>
            </section>

            {/* Block 6 — Signal alerts */}
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#7a7a76] mb-3">
                Alertes signaux
              </h2>
              <div className="flex flex-col gap-2">

                <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#fef3c7] shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 text-[#d97706]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#26251e]">Niches en baisse</p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5">
                      {nichesInBaisse > 0
                        ? `${nichesInBaisse} niche${nichesInBaisse > 1 ? 's' : ''} sans réponse positive ces 14 derniers jours`
                        : 'Toutes les niches actives ont eu des réponses récentes'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#fafaf8] shrink-0">
                    <Mail className="h-3.5 w-3.5 text-[#7a7a76]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#26251e]">Séquences sous-performantes</p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5">
                      Consultez les analytics pour identifier les séquences à faible taux d&apos;ouverture.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#fef2f2] shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#dc2626]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#26251e]">Leads sans contact</p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5">
                      {leadsWithoutContact > 0
                        ? `${leadsWithoutContact} lead${leadsWithoutContact > 1 ? 's' : ''} au statut Nouveau depuis plus de 3 jours`
                        : 'Tous les nouveaux leads ont été contactés récemment'}
                    </p>
                  </div>
                </div>

              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
