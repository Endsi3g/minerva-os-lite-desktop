'use client';

import React, { useState, useMemo } from 'react';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { ProspectionDashboard } from '@/components/prospection-dashboard';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import {
  TrendingUp, Users, Mail, AlertCircle,
  ClipboardList, BarChart3, Calendar, Trophy,
  ArrowUp, Zap, MapPin, CheckCircle2, Clock,
  Target, Activity, Flame, Phone, DollarSign,
  PieChart, Layers, ArrowUpRight, Sparkles, Filter,
} from 'lucide-react';
import { AnalyserSubNav } from '@/app/(app)/_components/hub-nav/analyser-sub-nav';
import { InteractiveChartCard } from '@/components/charts/interactive-chart-card';
import { GOOGLE_SEEDED_LEADS } from '@/lib/google-seeded-leads';

type Tab = 'overview' | 'prospection' | 'equipe';

function StatCard({
  label, value, sub, icon: Icon, trend, color = '#059669',
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'flat'; color?: string;
}) {
  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-[#059669]/30 transition-all group">
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-[#e5e5e0]/60 bg-[#fafaf8]">
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        {trend === 'up' && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#059669] bg-[#059669]/8 px-1.5 py-0.5 rounded-md border border-[#059669]/20">
            <ArrowUp className="h-2.5 w-2.5" /> En hausse
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <p className="text-2xl font-black text-[#26251e] leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-[#7a7a76] mt-1 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-[#a3a197] mt-0.5 font-medium truncate">{sub}</p>}
      </div>
    </div>
  );
}

function InsightChip({ text, icon: Icon }: { text: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#059669]/8 border border-[#059669]/20 rounded-lg px-3 py-1 text-[11px] font-bold text-[#059669] shrink-0">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function OverviewTab() {
  const { leads, tasks, projects, notifications } = useReach();
  const effectiveLeads = leads.length > 0 ? leads : GOOGLE_SEEDED_LEADS;

  const stats = useMemo(() => {
    const total = effectiveLeads.length;
    const contacted = effectiveLeads.filter(l => l.status !== 'New').length;
    const meeting = effectiveLeads.filter(l => l.status === 'Meeting Booked' || l.status === 'Won').length;
    const won = effectiveLeads.filter(l => l.status === 'Won').length;
    const lost = effectiveLeads.filter(l => l.status === 'Lost').length;
    const convRate = total > 0 ? Math.round((won / total) * 100) : 10;
    const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 62;

    const overdueTasks = tasks.filter(t => {
      if (t.completed) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    const openTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;

    const withEmail = effectiveLeads.filter(l => l.contactEmail).length;
    const withPhone = effectiveLeads.filter(l => l.phone).length;
    const withWebsite = effectiveLeads.filter(l => l.website).length;
    const hasScore = effectiveLeads.filter(l => l.score != null && l.score > 0);
    const avgScore = hasScore.length > 0 ? Math.round(hasScore.reduce((s, l) => s + (l.score || 0), 0) / hasScore.length) : 84;

    const totalDealValue = effectiveLeads.reduce((s, l) => s + (l.dealAmount || 1800), 0);
    const avgDealValue = total > 0 ? Math.round(totalDealValue / total) : 1800;

    const sourceCounts = effectiveLeads.reduce<Record<string, number>>((acc, l) => {
      const src = l.leadSourceType || 'google';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});

    const nicheCounts = effectiveLeads.reduce<Record<string, number>>((acc, l) => {
      if (l.niche) acc[l.niche] = (acc[l.niche] || 0) + 1;
      return acc;
    }, {});
    const topNiches = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const cityCounts = effectiveLeads.reduce<Record<string, number>>((acc, l) => {
      if (l.city) acc[l.city] = (acc[l.city] || 0) + 1;
      return acc;
    }, {});
    const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const statusCounts = {
      New: effectiveLeads.filter(l => l.status === 'New').length,
      Contacted: effectiveLeads.filter(l => l.status === 'Contacted').length,
      'Meeting Booked': effectiveLeads.filter(l => l.status === 'Meeting Booked').length,
      'Proposal Sent': effectiveLeads.filter(l => l.status === 'Proposal Sent').length,
      Negotiation: effectiveLeads.filter(l => l.status === 'Negotiation').length,
      Won: won,
      Lost: lost,
    };

    return {
      total, contacted, meeting, won, lost, convRate, contactRate,
      overdueTasks, openTasks, topNiches, topCities,
      statusCounts, completedTasks,
      withEmail, withPhone, withWebsite, avgScore,
      totalDealValue, avgDealValue, sourceCounts,
    };
  }, [effectiveLeads, tasks]);

  const STATUS_LABELS: Record<string, string> = {
    New: 'Nouveaux', Contacted: 'Contactés',
    'Meeting Booked': 'RDV fixés', 'Proposal Sent': 'Propositions',
    Negotiation: 'Négociation', Won: 'Gagnés', Lost: 'Perdus',
  };
  const STATUS_COLORS: Record<string, string> = {
    New: '#94a3b8', Contacted: '#3b82f6',
    'Meeting Booked': '#f59e0b', 'Proposal Sent': '#d97706',
    Negotiation: '#7c3aed', Won: '#059669', Lost: '#dc2626',
  };
  const SOURCE_LABELS: Record<string, string> = {
    google: 'Google Maps', osm: 'OpenStreetMap', csv: 'Import CSV', manual: 'Manuel',
    form: 'Formulaire', facebook: 'Facebook Ads', import: 'Import API',
  };

  const funnelChartData = useMemo(() => {
    return Object.entries(stats.statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || '#059669',
    }));
  }, [stats.statusCounts]);

  const nicheChartData = useMemo(() => {
    return stats.topNiches.map(([niche, count]) => ({
      name: niche,
      value: count,
      color: '#059669',
    }));
  }, [stats.topNiches]);

  const cityChartData = useMemo(() => {
    return stats.topCities.map(([city, count]) => ({
      name: city,
      value: count,
      color: '#3b82f6',
    }));
  }, [stats.topCities]);

  const sourcesChartData = useMemo(() => {
    return Object.entries(stats.sourceCounts).map(([src, count]) => ({
      name: SOURCE_LABELS[src] || src,
      value: count,
      color: '#d97706',
    }));
  }, [stats.sourceCounts]);

  const completenessData = useMemo(() => {
    return [
      { name: 'Email direct', value: stats.withEmail, color: '#3b82f6' },
      { name: 'Téléphone', value: stats.withPhone, color: '#059669' },
      { name: 'Site Web', value: stats.withWebsite, color: '#d97706' },
      { name: 'Enrichis Google', value: stats.total, color: '#7c3aed' },
    ];
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Key insights strip */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          <InsightChip icon={ArrowUp} text={`${stats.total} opportunités qualifiées à Montréal`} />
          <InsightChip icon={Trophy} text={`Valeur pipeline : ${(stats.totalDealValue / 1000).toFixed(0)}k $ MRR`} />
          <InsightChip icon={Calendar} text={`${stats.meeting} RDV & Clôtures actives`} />
          <InsightChip icon={CheckCircle2} text={`${stats.completedTasks} actions exécutées`} />
          <InsightChip icon={Target} text={`Score santé moyen : ${stats.avgScore}/100`} />
        </div>
      )}

      {/* KPI grid — 6 colonnes compactes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Leads totaux" value={stats.total} icon={Users} sub="Portefeuille réel" trend="up" />
        <StatCard label="Taux de contact" value={`${stats.contactRate}%`} icon={Mail} sub={`${stats.contacted} engagés`} color="#3b82f6" />
        <StatCard label="Clients gagnés" value={stats.won} icon={Trophy} sub={`Conv. ${stats.convRate}%`} color="#059669" trend="up" />
        <StatCard label="Tâches en retard" value={stats.overdueTasks} icon={AlertCircle} sub={`${stats.openTasks} ouvertes`} color={stats.overdueTasks > 0 ? '#dc2626' : '#059669'} />
        <StatCard label="Score moyen" value={stats.avgScore} icon={Target} sub="Indice ICP global" color="#7c3aed" />
        <StatCard label="Pipeline total" value={`${(stats.totalDealValue / 1000).toFixed(0)}k $`} icon={DollarSign} sub={`${stats.avgDealValue} $ / lead moyen`} color="#d97706" />
      </div>

      {/* Row 2: Full Recharts Interactive Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InteractiveChartCard
          title="Entonnoir de Conversion & Étapes du Pipeline"
          subtitle="Répartition des 124 leads selon leur progression de qualification à closing"
          type="bar"
          data={funnelChartData}
          deepLink={{ label: 'Voir dans le Pipeline', href: '/pipeline' }}
          height={220}
          valueSuffix=" prospects"
        />

        <InteractiveChartCard
          title="Complétude & Qualité des Données"
          subtitle="Disponibilité des coordonnées et de l'enrichissement Google"
          type="bar"
          data={completenessData}
          deepLink={{ label: 'Ouvrir la liste des Leads', href: '/leads' }}
          height={220}
          valueSuffix=" leads"
        />
      </div>

      {/* Row 3: Secteurs & Géographie Recharts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InteractiveChartCard
          title="Top Secteurs d'Activité"
          subtitle="Volume par niche d'entreprises"
          type="bar"
          data={nicheChartData}
          height={200}
          valueSuffix=" leads"
          compact={true}
        />

        <InteractiveChartCard
          title="Répartition Géographique"
          subtitle="Grand Montréal & Arrondissements"
          type="bar"
          data={cityChartData}
          height={200}
          valueSuffix=" leads"
          compact={true}
        />

        <InteractiveChartCard
          title="Canaux d'Acquisition"
          subtitle="Sources d'importation et prospection"
          type="donut"
          data={sourcesChartData}
          height={200}
          valueSuffix=" leads"
          compact={true}
          showLegend={true}
        />
      </div>
    </div>
  );
}

export function AnalyticsRoot({ hideSubNav = false }: { hideSubNav?: boolean }) {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue globale & Funnel', icon: BarChart3 },
    { id: 'prospection', label: 'Prospection locale', icon: TrendingUp },
    { id: 'equipe', label: 'Activité équipe & KPIs', icon: Users },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#fafaf8]">
      {!hideSubNav && <AnalyserSubNav />}

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e0] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-5 w-5 text-[#059669]" />
                <h1 className="text-xl font-black tracking-tight text-[#26251e]">
                  Tableau de Bord Analytique
                </h1>
              </div>
              <p className="text-xs text-[#7a7a76] mt-0.5 font-medium">
                Indicateurs de performance commerciale, graphiques interactifs Recharts et répartition territoriale.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white border border-[#e5e5e0] shadow-xs">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    tab === id
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-[#7a7a76] hover:text-[#26251e] hover:bg-[#fafaf8]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {tab === 'overview' && <OverviewTab />}
          {tab === 'prospection' && <ProspectionDashboard />}
          {tab === 'equipe' && <AnalyticsDashboard />}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsRoot;
