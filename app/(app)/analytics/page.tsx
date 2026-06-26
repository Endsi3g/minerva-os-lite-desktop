'use client';

import React, { useState, useMemo } from 'react';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { ProspectionDashboard } from '@/components/prospection-dashboard';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Users, Mail, CheckCircle2, AlertCircle,
  Folder, ClipboardList, BarChart3, Calendar, Trophy,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';

type Tab = 'overview' | 'prospection' | 'equipe';

function StatCard({
  label, value, sub, icon: Icon, trend, color = '#059669',
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'flat'; color?: string;
}) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {trend && trend !== 'flat' && (
          <span className={cn('flex items-center gap-0.5 text-[10px] font-bold', trend === 'up' ? 'text-[#059669]' : 'text-[#dc2626]')}>
            {trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-[#26251e] leading-none">{value}</p>
        <p className="text-[10px] font-semibold text-[#7a7a76] mt-1 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-[#7a7a76] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, color = '#059669' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#26251e] font-semibold w-32 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#e5e5e0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-[#26251e] w-8 text-right shrink-0">{value}</span>
    </div>
  );
}

function OverviewTab() {
  const { leads, tasks, projects, notifications } = useReach();

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

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentLeads = leads.filter(l => new Date(l.createdAt || 0).getTime() > sevenDaysAgo).length;

    // Top niches
    const nicheCounts = leads.reduce<Record<string, number>>((acc, l) => {
      if (l.niche) acc[l.niche] = (acc[l.niche] || 0) + 1;
      return acc;
    }, {});
    const topNiches = Object.entries(nicheCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Top cities
    const cityCounts = leads.reduce<Record<string, number>>((acc, l) => {
      if (l.city) acc[l.city] = (acc[l.city] || 0) + 1;
      return acc;
    }, {});
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    // Status breakdown
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
      statusCounts, unreadNotifs,
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

  const maxStatus = Math.max(...Object.values(stats.statusCounts));
  const maxNiche = stats.topNiches[0]?.[1] ?? 1;
  const maxCity = stats.topCities[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Leads totaux" value={stats.total} icon={Users} sub={`+${stats.recentLeads} cette semaine`} trend={stats.recentLeads > 0 ? 'up' : 'flat'} />
        <StatCard label="Taux de contact" value={`${stats.contactRate}%`} icon={Mail} sub={`${stats.contacted} contactés`} color="#3b82f6" />
        <StatCard label="Clients gagnés" value={stats.won} icon={Trophy} sub={`Conv. ${stats.convRate}%`} color="#059669" trend={stats.won > 0 ? 'up' : 'flat'} />
        <StatCard label="Tâches en retard" value={stats.overdueTasks} icon={AlertCircle} sub={`${stats.openTasks} ouvertes au total`} color={stats.overdueTasks > 0 ? '#dc2626' : '#059669'} />
      </div>

      {/* Funnel + notifs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Funnel de conversion</p>
          <div className="space-y-2.5">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <MiniBar key={status} label={STATUS_LABELS[status] || status} value={count} max={maxStatus} color={STATUS_COLORS[status] || '#059669'} />
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Centre de stats</p>
          <div className="space-y-3">
            {[
              { label: 'Projets actifs', value: projects.length, icon: Folder, color: '#6366f1' },
              { label: 'Tâches ouvertes', value: stats.openTasks, icon: ClipboardList, color: '#f59e0b' },
              { label: 'Notifications non lues', value: stats.unreadNotifs, icon: BarChart3, color: '#3b82f6' },
              { label: 'Leads en réunion', value: stats.meeting, icon: Calendar, color: '#059669' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon className="h-3 w-3" style={{ color }} />
                  </div>
                  <span className="text-xs text-[#555552] font-semibold">{label}</span>
                </div>
                <span className="text-sm font-black text-[#26251e]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Niches + Villes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.topNiches.length > 0 && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Top niches</p>
            <div className="space-y-2.5">
              {stats.topNiches.map(([niche, count]) => (
                <MiniBar key={niche} label={niche} value={count} max={maxNiche} color="#059669" />
              ))}
            </div>
          </div>
        )}
        {stats.topCities.length > 0 && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Top villes</p>
            <div className="space-y-2.5">
              {stats.topCities.map(([city, count]) => (
                <MiniBar key={city} label={city} value={count} max={maxCity} color="#3b82f6" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue globale', icon: BarChart3 },
    { id: 'prospection', label: 'Prospection', icon: TrendingUp },
    { id: 'equipe', label: 'Activité équipe', icon: Users },
  ];

  return (
    <div className="h-full overflow-y-auto min-h-0 bg-[#fafaf8]">
      <div className="flex flex-col gap-6 p-3 sm:p-4 md:p-6 w-full">

        {/* Header */}
        <div className="border-b border-[#e5e5e0] pb-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-[#059669]" />
            <h1 className="text-xl font-bold text-[#26251e]">Statistiques</h1>
          </div>
          <p className="text-xs text-[#7a7a76]">Toutes vos métriques app en un coup d'œil.</p>
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
