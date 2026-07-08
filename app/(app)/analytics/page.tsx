'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { ProspectionDashboard } from '@/components/prospection-dashboard';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Users, Mail, AlertCircle,
  ClipboardList, BarChart3, Calendar, Trophy,
  ArrowUp, Zap, MapPin, CheckCircle2,
} from 'lucide-react';

type Tab = 'overview' | 'prospection' | 'equipe';

function StatCard({
  label, value, sub, icon: Icon, trend, color = '#059669',
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'flat'; color?: string;
}) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40 rounded-b-xl"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {trend === 'up' && (
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#059669] bg-[#059669]/8 px-1.5 py-0.5 rounded-md">
            <ArrowUp className="h-3 w-3" /> Hausse
          </span>
        )}
      </div>
      <div>
        <p className="text-[28px] font-black text-[#26251e] leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-[#7a7a76] mt-1.5 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-[#a3a197] mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({
  label, value, max, color = '#059669', total,
}: {
  label: string; value: number; max: number; color?: string; total?: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const ofTotal = total && total > 0 ? Math.round((value / total) * 100) : null;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-[#26251e] font-semibold w-28 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#f0efea] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-black text-[#26251e] w-6 text-right">{value}</span>
        {ofTotal !== null && (
          <span className="text-[9px] font-semibold text-[#a3a197] w-8">({ofTotal}%)</span>
        )}
      </div>
    </div>
  );
}

function InsightChip({ text, icon: Icon }: { text: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#059669]/8 border border-[#059669]/20 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#059669] shrink-0">
      <Icon className="h-3 w-3 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function MiniMetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="flex flex-col gap-1 bg-[#fafaf8] border border-[#e5e5e0] rounded-lg p-3">
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon className="h-3 w-3" style={{ color }} />
      </div>
      <p className="text-xl font-black text-[#26251e] leading-none mt-1">{value}</p>
      <p className="text-[9px] font-bold text-[#7a7a76] uppercase tracking-wider leading-tight">{label}</p>
    </div>
  );
}

function OverviewTab() {
  const { leads, tasks, projects, notifications, isDataReady } = useReach();

  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status !== 'New').length;
    const meeting = leads.filter(l => l.status === 'Meeting Booked' || l.status === 'Won').length;
    const won = leads.filter(l => l.status === 'Won').length;
    const lost = leads.filter(l => l.status === 'Lost').length;
    const convRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;

    const overdueTasks = tasks.filter(t => {
      if (t.completed) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    const openTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentLeads = leads.filter(l => new Date(l.createdAt || 0).getTime() > sevenDaysAgo).length;

    const nicheCounts = leads.reduce<Record<string, number>>((acc, l) => {
      if (l.niche) acc[l.niche] = (acc[l.niche] || 0) + 1;
      return acc;
    }, {});
    const topNiches = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const cityCounts = leads.reduce<Record<string, number>>((acc, l) => {
      if (l.city) acc[l.city] = (acc[l.city] || 0) + 1;
      return acc;
    }, {});
    const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const statusCounts = {
      New: leads.filter(l => l.status === 'New').length,
      Contacted: leads.filter(l => l.status === 'Contacted').length,
      'Meeting Booked': meeting - won,
      Won: won,
      Lost: lost,
    };

    const unreadNotifs = notifications.filter(n => !n.isRead).length;

    return {
      total, contacted, meeting, won, lost, convRate, contactRate,
      overdueTasks, openTasks, recentLeads, topNiches, topCities,
      statusCounts, unreadNotifs, completedTasks,
    };
  }, [leads, tasks, projects, notifications]);

  const STATUS_LABELS: Record<string, string> = {
    New: 'Nouveaux', Contacted: 'Contactés',
    'Meeting Booked': 'RDV fixés', Won: 'Gagnés', Lost: 'Perdus',
  };
  const STATUS_COLORS: Record<string, string> = {
    New: '#7a7a76', Contacted: '#3b82f6',
    'Meeting Booked': '#f59e0b', Won: '#059669', Lost: '#dc2626',
  };

  const maxStatus = Math.max(...Object.values(stats.statusCounts), 1);
  const maxNiche = stats.topNiches[0]?.[1] ?? 1;
  const maxCity = stats.topCities[0]?.[1] ?? 1;

  if (!isDataReady) {
    return (
      <div className="kpi-container">
        <div className="kpi-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#e5e5e0] rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Key insights strip */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.recentLeads > 0 && (
            <InsightChip icon={ArrowUp} text={`+${stats.recentLeads} leads cette semaine`} />
          )}
          {stats.convRate > 0 && (
            <InsightChip icon={Trophy} text={`Taux de conversion ${stats.convRate}%`} />
          )}
          {stats.meeting > 0 && (
            <InsightChip icon={Calendar} text={`${stats.meeting} RDV en cours`} />
          )}
          {stats.completedTasks > 0 && (
            <InsightChip icon={CheckCircle2} text={`${stats.completedTasks} tâches complétées`} />
          )}
        </div>
      )}

      {/* KPI grid */}
      <div className="kpi-container">
        <div className="kpi-grid">
          <StatCard label="Leads totaux" value={stats.total} icon={Users} sub={`+${stats.recentLeads} cette semaine`} trend={stats.recentLeads > 0 ? 'up' : 'flat'} />
          <StatCard label="Taux de contact" value={`${stats.contactRate}%`} icon={Mail} sub={`${stats.contacted} contactés`} color="#3b82f6" />
          <StatCard label="Clients gagnés" value={stats.won} icon={Trophy} sub={`Conv. ${stats.convRate}%`} color="#059669" trend={stats.won > 0 ? 'up' : 'flat'} />
          <StatCard label="Tâches en retard" value={stats.overdueTasks} icon={AlertCircle} sub={`${stats.openTasks} ouvertes au total`} color={stats.overdueTasks > 0 ? '#dc2626' : '#059669'} />
        </div>
      </div>

      {/* Funnel + mini metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[#059669]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#26251e]">Funnel de conversion</p>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <MiniBar
                key={status}
                label={STATUS_LABELS[status] || status}
                value={count}
                max={maxStatus}
                color={STATUS_COLORS[status] || '#059669'}
                total={stats.total}
              />
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[#7a7a76]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#26251e]">Activité</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniMetricCard label="Projets actifs" value={projects.length} icon={ClipboardList} color="#6366f1" />
            <MiniMetricCard label="Tâches ouvertes" value={stats.openTasks} icon={AlertCircle} color="#f59e0b" />
            <MiniMetricCard label="Notifs non lues" value={stats.unreadNotifs} icon={BarChart3} color="#3b82f6" />
            <MiniMetricCard label="En réunion" value={stats.meeting} icon={Calendar} color="#059669" />
          </div>
        </div>
      </div>

      {/* Niches + Villes */}
      {(stats.topNiches.length > 0 || stats.topCities.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.topNiches.length > 0 && (
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-[#059669]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[#26251e]">Top niches</p>
              </div>
              <div className="space-y-2.5">
                {stats.topNiches.map(([niche, count]) => (
                  <MiniBar key={niche} label={niche} value={count} max={maxNiche} color="#059669" total={stats.total} />
                ))}
              </div>
            </div>
          )}
          {stats.topCities.length > 0 && (
            <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#3b82f6]" />
                <p className="text-xs font-bold uppercase tracking-wider text-[#26251e]">Top villes</p>
              </div>
              <div className="space-y-2.5">
                {stats.topCities.map(([city, count]) => (
                  <MiniBar key={city} label={city} value={count} max={maxCity} color="#3b82f6" total={stats.total} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="bg-white border border-[#e5e5e0] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
          <BarChart3 className="h-10 w-10 text-[#e5e5e0]" />
          <p className="text-sm font-bold text-[#26251e]">Aucune donnée disponible</p>
          <p className="text-xs text-[#7a7a76] max-w-xs leading-relaxed">
            Ajoutez des leads via la prospection pour voir vos statistiques apparaître ici.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  useEffect(() => { document.title = 'Statistiques — Minerva'; }, []);
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue globale', icon: BarChart3 },
    { id: 'prospection', label: 'Prospection', icon: TrendingUp },
    { id: 'equipe', label: 'Activité équipe', icon: Users },
  ];

  return (
    <div className="h-full overflow-y-auto min-h-0 bg-[#fafaf8]">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-6 w-full">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e5e5e0] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 text-[#059669]" />
              <h1 className="text-xl font-bold text-[#26251e]">Statistiques</h1>
            </div>
            <p className="text-xs text-[#7a7a76]">Vue en temps réel de toutes vos métriques CRM.</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#059669]/8 border border-[#059669]/20 text-[#059669] text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
            Live
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all',
                tab === id
                  ? 'bg-white text-[#26251e] shadow-xs border border-[#e5e5e0]'
                  : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'prospection' && <ProspectionDashboard />}
        {tab === 'equipe' && <AnalyticsDashboard />}
      </div>
    </div>
  );
}
