'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquareCheck,
  CalendarCheck2,
  TrendingUp,
  Users,
  RefreshCw,
  Zap,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import { StrategyMemoryCard } from './strategy-memory-card';
import { WeeklyReportCard } from './weekly-report-card';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}

function StatCard({ label, value, sub, icon: Icon, accent = '#059669' }: StatCardProps) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}15` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p className="text-[28px] font-black text-[#26251e] leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-[#7a7a76] mt-1.5 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-[#a3a197] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface TodayStatsData {
  emails_sent: number;
  replies_received: number;
  agent_actions: number;
  appointments_created: number;
  leads_created: number;
  latest_actions: Array<{ action_type: string; reasoning: string | null; lead_id: string | null }>;
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

export function CockpitRoot() {
  const { leads, tasks, activeWorkspace } = useReach();
  const [todayStats, setTodayStats] = useState<TodayStatsData | null>(null);
  const [nbaLeads, setNbaLeads] = useState<NbaLead[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingNba, setLoadingNba] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const positiveReplies = leads.filter((l) => l.replyStatus === 'positive').length;

  const contactedLeads = leads.filter(
    (l) => l.status !== 'New'
  ).length;
  const bookedLeads = leads.filter((l) => l.status === 'Meeting Booked').length;
  const bookingRate =
    contactedLeads > 0 ? ((bookedLeads / contactedLeads) * 100).toFixed(1) : '0.0';

  const wonLeads = leads.filter((l) => l.status === 'Won' && l.createdAt);
  let conversionSpeed = '—';
  if (wonLeads.length > 0) {
    const totalDays = wonLeads.reduce((sum, l) => {
      const created = new Date(l.createdAt).getTime();
      const updated = new Date(l.updatedAt).getTime();
      return sum + Math.max(0, (updated - created) / (1000 * 60 * 60 * 24));
    }, 0);
    conversionSpeed = `${(totalDays / wonLeads.length).toFixed(0)}j`;
  }

  const activeLeads = leads.filter(
    (l) => l.status !== 'Won' && l.status !== 'Lost'
  ).length;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const stagnantLeads = leads.filter((l) => {
    if (!l.updatedAt) return false;
    return new Date(l.updatedAt).getTime() < sevenDaysAgo && l.status !== 'Won' && l.status !== 'Lost';
  }).length;

  const openNoReply = leads.filter(
    (l) =>
      (l as any).emailOpensCount >= 3 &&
      !l.replyDetectedAt
  ).length;

  const fetchTodayStats = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingStats(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/agent/today-stats?workspace_id=${activeWorkspace.id}`)
      );
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data);
      }
    } catch {
    } finally {
      setLoadingStats(false);
    }
  }, [activeWorkspace]);

  const fetchNbaLeads = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingNba(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/nba/score?workspace_id=${activeWorkspace.id}`)
      );
      if (res.ok) {
        const data = await res.json();
        setNbaLeads(data.leads ?? []);
      }
    } catch {
    } finally {
      setLoadingNba(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchTodayStats();
    fetchNbaLeads();
  }, [fetchTodayStats, fetchNbaLeads]);

  const handleRefresh = async () => {
    if (!activeWorkspace || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([
        fetch(getApiUrl('/api/nba/score'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: activeWorkspace.id }),
        }),
        fetch(getApiUrl('/api/nba/insights'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: activeWorkspace.id }),
        }),
      ]);
      await Promise.all([fetchTodayStats(), fetchNbaLeads()]);
      toast.success('Cockpit mis à jour');
    } catch {
      toast.error('Erreur lors du rafraîchissement');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAnalyzeInsights = async () => {
    if (!activeWorkspace) return;
    try {
      await fetch(getApiUrl('/api/nba/insights'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id }),
      });
      toast.success('Analyse en cours — résultats disponibles dans quelques instants');
    } catch {
      toast.error('Erreur lors de l\'analyse');
    }
  };

  const actionTypeCounts: Record<string, number> = {};
  if (todayStats?.latest_actions) {
    for (const a of todayStats.latest_actions) {
      actionTypeCounts[a.action_type] = (actionTypeCounts[a.action_type] ?? 0) + 1;
    }
  }
  const maxCount = Math.max(1, ...Object.values(actionTypeCounts));

  const ACTION_LABELS: Record<string, string> = {
    generate_email_draft: 'Email de relance',
    create_task: 'Tâche créée',
    update_pipeline_stage: 'Pipeline mis à jour',
    enroll_in_sequence: 'Séquence démarrée',
    plan_field_route: 'Visite terrain',
    update_agent_memory: 'Mémoire agent',
  };

  const nbaScoreBadgeStyle = (score: number) => {
    if (score >= 75) return 'bg-[#dcfce7] text-[#059669]';
    if (score >= 50) return 'bg-[#fef9c3] text-[#a16207]';
    return 'bg-[#fee2e2] text-[#dc2626]';
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 p-4 sm:p-6 xl:p-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#26251e] tracking-tight">Cockpit commercial</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">Pilotez votre stratégie en temps réel</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-60 px-3 py-2 text-xs font-bold text-white transition-colors shrink-0"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Actualiser
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Réponses positives"
            value={positiveReplies}
            sub="Leads ayant répondu positivement"
            icon={MessageSquareCheck}
          />
          <StatCard
            label="Taux de booking"
            value={`${bookingRate}%`}
            sub={`${bookedLeads} RDV sur ${contactedLeads} contactés`}
            icon={CalendarCheck2}
          />
          <StatCard
            label="Vitesse de conversion"
            value={conversionSpeed}
            sub={wonLeads.length > 0 ? `Sur ${wonLeads.length} deal(s) gagnés` : 'Aucun deal gagné'}
            icon={TrendingUp}
          />
          <StatCard
            label="Leads actifs"
            value={activeLeads}
            sub="Hors Won et Lost"
            icon={Users}
          />
        </div>

        <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#059669]" />
            <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Séquences performantes</h2>
          </div>

          {loadingStats ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 rounded-lg bg-[#f4f4f3] animate-pulse" />
              ))}
            </div>
          ) : Object.keys(actionTypeCounts).length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-xs text-[#7a7a76]">
              <Zap className="h-3.5 w-3.5" />
              Aucune action agent aujourd&apos;hui — lancez un cycle pour voir les données
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(actionTypeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-[11px] text-[#555552] w-36 shrink-0 truncate">
                      {ACTION_LABELS[type] ?? type}
                    </span>
                    <div className="flex-1 h-5 bg-[#f4f4f3] rounded-md overflow-hidden">
                      <div
                        className="h-full bg-[#059669] rounded-md transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-[#26251e] w-4 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-[#059669]" />
            <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Signaux d&apos;alerte</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#e5e5e0] p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#26251e]">Taux de réponse par niche</p>
              <p className="text-[10px] text-[#7a7a76]">Analyse les performances par secteur</p>
              <button
                onClick={handleAnalyzeInsights}
                className="mt-auto flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857] transition-colors"
              >
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

        <StrategyMemoryCard />

        <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-[#059669]" />
            <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">Actions NBA en attente</h2>
          </div>

          {loadingNba ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-[#f4f4f3] animate-pulse" />
              ))}
            </div>
          ) : nbaLeads.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-xs text-[#7a7a76]">
              <Zap className="h-3.5 w-3.5" />
              Aucun lead NBA calculé — cliquez Actualiser pour lancer le scoring
            </div>
          ) : (
            <div className="divide-y divide-[#f4f4f3]">
              {nbaLeads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#26251e] truncate">{lead.business_name}</p>
                    {lead.nba_reason && (
                      <p className="text-[10px] text-[#7a7a76] truncate">{lead.nba_reason}</p>
                    )}
                  </div>
                  {lead.nba_action && (
                    <span className="text-[10px] text-[#555552] shrink-0 hidden sm:block max-w-[120px] truncate">
                      {lead.nba_action}
                    </span>
                  )}
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                      nbaScoreBadgeStyle(lead.nba_score ?? 0)
                    )}
                  >
                    {lead.nba_score ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <WeeklyReportCard />

      </div>
    </div>
  );
}

export default CockpitRoot;
