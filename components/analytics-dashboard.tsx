'use client';

import React, { useState, useMemo } from 'react';
import Heatmap from '@/components/8starlabs-ui/heatmap';
import { 
  Calendar as CalendarIcon, 
  Download, 
  Users, 
  Bot, 
  Zap, 
  Network,
  ChevronDown,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr, enUS, de } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/lib/language-context';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';

export function AnalyticsDashboard() {
  const { t, locale } = useLanguage();
  const { leads, tasks, workspacesList, campaigns } = useReach();

  // Date locale mapping
  const dateLocale = useMemo(() => {
    if (locale === 'fr') return fr;
    if (locale === 'de') return de;
    return enUS;
  }, [locale]);

  // Group By State: day | week | month
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Date Range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Quick selectors
  const setQuickRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date()
    });
    setIsCalendarOpen(false);
  };

  const kpiData = useMemo(() => {
    const distinctOwners = new Set(leads.map((l) => l.owner).filter(Boolean)).size;
    const totalUsers = Math.max(1, distinctOwners);
    const totalWorkflows = tasks.filter((t) => !t.completed).length;
    const totalGroups = Math.max(1, workspacesList.length);
    const customAgentCount = (() => {
      try {
        const stored = localStorage.getItem('minerva_agents');
        return stored ? JSON.parse(stored).length : 0;
      } catch { return 0; }
    })();
    const wonLeads = leads.filter(l => l.status === 'Won').length;

    return {
      users: totalUsers,
      agents: 3 + customAgentCount,
      workflows: totalWorkflows,
      groups: totalGroups,
      totalLeads: leads.length,
      wonLeads,
    };
  }, [leads, tasks, workspacesList]);

  // Leads-by-status breakdown for pipeline chart
  const pipelineBreakdown = useMemo(() => {
    const statuses: Lead['status'][] = ['New', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
    const labels: Record<Lead['status'], string> = {
      'New': 'Nouveau',
      'Contacted': 'Contacté',
      'Meeting Booked': 'RDV',
      'Proposal Sent': 'Proposition',
      'Negotiation': 'Négociation',
      'Won': 'Gagné',
      'Lost': 'Perdu',
    };
    const colors: Record<Lead['status'], string> = {
      'New': '#a1a1aa',
      'Contacted': '#60a5fa',
      'Meeting Booked': '#f59e0b',
      'Proposal Sent': '#7c3aed',
      'Negotiation': '#d97706',
      'Won': '#059669',
      'Lost': '#ef4444',
    };
    const total = leads.length || 1;
    return statuses.map(s => ({
      status: s,
      label: labels[s],
      count: leads.filter(l => l.status === s).length,
      pct: Math.round((leads.filter(l => l.status === s).length / total) * 100),
      color: colors[s],
    })).filter(s => s.count > 0);
  }, [leads]);

  const byNiche = useMemo(() => {
    const groups: Record<string, { total: number; contacted: number; won: number }> = {};
    for (const lead of leads) {
      const key = lead.niche;
      if (!key) continue;
      if (!groups[key]) groups[key] = { total: 0, contacted: 0, won: 0 };
      groups[key].total++;
      if (lead.status !== 'New') groups[key].contacted++;
      if (lead.status === 'Won') groups[key].won++;
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.total - a.total).slice(0, 8)
      .map(([key, data]) => ({ key, ...data, convPct: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0 }));
  }, [leads]);

  const byCity = useMemo(() => {
    const groups: Record<string, { total: number; contacted: number; won: number }> = {};
    for (const lead of leads) {
      const key = lead.city;
      if (!key) continue;
      if (!groups[key]) groups[key] = { total: 0, contacted: 0, won: 0 };
      groups[key].total++;
      if (lead.status !== 'New') groups[key].contacted++;
      if (lead.status === 'Won') groups[key].won++;
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.total - a.total).slice(0, 8)
      .map(([key, data]) => ({ key, ...data, convPct: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0 }));
  }, [leads]);

  const byOwner = useMemo(() => {
    const groups: Record<string, { total: number; contacted: number; won: number }> = {};
    for (const lead of leads) {
      const key = lead.owner;
      if (!key) continue;
      if (!groups[key]) groups[key] = { total: 0, contacted: 0, won: 0 };
      groups[key].total++;
      if (lead.status !== 'New') groups[key].contacted++;
      if (lead.status === 'Won') groups[key].won++;
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.total - a.total).slice(0, 8)
      .map(([key, data]) => ({ key, ...data, convPct: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0 }));
  }, [leads]);

  const byCampaign = useMemo(() => {
    const groups: Record<string, { total: number; contacted: number; won: number }> = {};
    for (const lead of leads) {
      if (!lead.campaignId) continue;
      const key = campaigns.find(c => c.id === lead.campaignId)?.name ?? lead.campaignId;
      if (!groups[key]) groups[key] = { total: 0, contacted: 0, won: 0 };
      groups[key].total++;
      if (lead.status !== 'New') groups[key].contacted++;
      if (lead.status === 'Won') groups[key].won++;
    }
    return Object.entries(groups).sort(([, a], [, b]) => b.total - a.total).slice(0, 8)
      .map(([key, data]) => ({ key, ...data, convPct: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0 }));
  }, [leads, campaigns]);

  // Build real aggregations from leads and tasks
  const realDataByDay = useMemo(() => {
    const byDay: Record<string, { leadsCreated: number; tasksCompleted: number; owners: Set<string> }> = {};
    for (const lead of leads) {
      const day = lead.createdAt?.split('T')[0];
      if (!day) continue;
      if (!byDay[day]) byDay[day] = { leadsCreated: 0, tasksCompleted: 0, owners: new Set() };
      byDay[day].leadsCreated++;
      if (lead.owner) byDay[day].owners.add(lead.owner);
    }
    for (const task of tasks) {
      if (!task.completed) continue;
      const day = (task as any).updatedAt?.split('T')[0] ?? task.dueDate;
      if (!day) continue;
      if (!byDay[day]) byDay[day] = { leadsCreated: 0, tasksCompleted: 0, owners: new Set() };
      byDay[day].tasksCompleted++;
    }
    return byDay;
  }, [leads, tasks]);

  // Heatmap data: count days with at least 1 prospection OR 1 task completed
  const heatmapData = useMemo(() => {
    return Object.entries(realDataByDay)
      .filter(([, d]) => d.leadsCreated > 0 || d.tasksCompleted > 0)
      .map(([date, d]) => ({ date, value: d.leadsCreated + d.tasksCompleted }));
  }, [realDataByDay]);

  // Generate historical data points within date range
  const chartPoints = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const points: {
      date: Date;
      label: string;
      activeUsers: number;
      chatMessages: number;
      agentMessages: number;
      totalMessages: number;
    }[] = [];

    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);

    // Generate daily steps using real lead/task data
    const current = new Date(start);
    while (current <= end) {
      const dayKey = format(current, 'yyyy-MM-dd');
      const dayData = realDataByDay[dayKey];
      const chatMessages = dayData?.leadsCreated ?? 0;
      const agentMessages = dayData?.tasksCompleted ?? 0;
      const activeUsers = dayData ? Math.max(1, dayData.owners.size) : 0;

      points.push({
        date: new Date(current),
        label: format(current, 'dd MMM', { locale: dateLocale }),
        activeUsers,
        chatMessages,
        agentMessages,
        totalMessages: chatMessages + agentMessages
      });

      // Increment day
      current.setDate(current.getDate() + 1);
    }

    // Aggregate by day / week / month
    if (groupBy === 'day') {
      return points;
    } else if (groupBy === 'week') {
      // Group by week start
      const weeks: Record<string, typeof points> = {};
      points.forEach(p => {
        const weekNum = format(p.date, 'yyyy-II'); // Year and Week of Year
        if (!weeks[weekNum]) weeks[weekNum] = [];
        weeks[weekNum].push(p);
      });

      return Object.keys(weeks).map(wk => {
        const group = weeks[wk];
        const first = group[0];
        const last = group[group.length - 1];
        
        // sum messages, average users
        const chatMessages = group.reduce((sum, p) => sum + p.chatMessages, 0);
        const agentMessages = group.reduce((sum, p) => sum + p.agentMessages, 0);
        const activeUsers = Math.max(...group.map(p => p.activeUsers)); // Max concurrent users

        return {
          date: first.date,
          label: `${format(first.date, 'dd MMM', { locale: dateLocale })} - ${format(last.date, 'dd MMM', { locale: dateLocale })}`,
          activeUsers,
          chatMessages,
          agentMessages,
          totalMessages: chatMessages + agentMessages
        };
      });
    } else {
      // Group by month
      const months: Record<string, typeof points> = {};
      points.forEach(p => {
        const monthKey = format(p.date, 'yyyy-MM');
        if (!months[monthKey]) months[monthKey] = [];
        months[monthKey].push(p);
      });

      return Object.keys(months).map(m => {
        const group = months[m];
        const first = group[0];
        
        const chatMessages = group.reduce((sum, p) => sum + p.chatMessages, 0);
        const agentMessages = group.reduce((sum, p) => sum + p.agentMessages, 0);
        const activeUsers = Math.max(...group.map(p => p.activeUsers));

        return {
          date: first.date,
          label: format(first.date, 'MMMM yyyy', { locale: dateLocale }),
          activeUsers,
          chatMessages,
          agentMessages,
          totalMessages: chatMessages + agentMessages
        };
      });
    }
  }, [dateRange, groupBy, dateLocale]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (chartPoints.length === 0) return;

    // Build header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Label,Active Users,Chat Messages,Agent Messages,Total Messages\n";

    // Add rows
    chartPoints.forEach(p => {
      csvContent += `"${p.label}",${p.activeUsers},${p.chatMessages},${p.agentMessages},${p.totalMessages}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `minerva_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Peak metrics
  const summaryMetrics = useMemo(() => {
    const totalChat = chartPoints.reduce((sum, p) => sum + p.chatMessages, 0);
    const totalAgent = chartPoints.reduce((sum, p) => sum + p.agentMessages, 0);
    const maxActive = chartPoints.length > 0 
      ? Math.max(...chartPoints.map(p => p.activeUsers)) 
      : 0;

    return {
      totalMessages: totalChat + totalAgent,
      totalChat,
      totalAgent,
      maxActive
    };
  }, [chartPoints]);

  // Max value calculation for custom SVG bar rendering heights
  const maxMessagesVal = useMemo(() => {
    const vals = chartPoints.map(p => p.totalMessages);
    return vals.length > 0 ? Math.max(...vals, 10) : 10;
  }, [chartPoints]);

  // unused after pipeline chart replaced active-users chart

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filters header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">{t('analytics.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grouping switcher */}
          <div className="flex items-center bg-[#e5e5e2]/50 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-border/60">
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setGroupBy(mode)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                  groupBy === mode 
                    ? "bg-white dark:bg-neutral-900 text-foreground shadow-xs" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(`analytics.${mode}`)}
              </button>
            ))}
          </div>

          {/* Export to CSV Button */}
          <Button 
            onClick={handleExportCSV}
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-semibold border-border/60 hover:bg-[#e5e5e2]/30 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('analytics.export')}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* User Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#10b981]/10 text-[#10b981]">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('analytics.users')}
              </span>
              <span className="text-xl font-bold text-foreground block tracking-tight leading-none mt-1">
                {kpiData.users}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Agents Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#26251e]/10 text-[#26251e]">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('analytics.agents')}
              </span>
              <span className="text-xl font-bold text-foreground block tracking-tight leading-none mt-1">
                {kpiData.agents}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Workflows Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#10b981]/10 text-[#10b981]">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('analytics.workflows')}
              </span>
              <span className="text-xl font-bold text-foreground block tracking-tight leading-none mt-1">
                {kpiData.workflows}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Groups Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#26251e]/10 text-[#26251e]">
              <Network className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                {t('analytics.groups')}
              </span>
              <span className="text-xl font-bold text-foreground block tracking-tight leading-none mt-1">
                {kpiData.groups}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Leads Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Leads CRM
              </span>
              <span className="text-xl font-bold text-foreground block tracking-tight leading-none mt-1">
                {kpiData.totalLeads}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Won Leads Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Clients gagnés
              </span>
              <span className="text-xl font-bold text-emerald-600 block tracking-tight leading-none mt-1">
                {kpiData.wonLeads}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Activity Chart: Leads créés + Tâches complétées */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>Activité</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                Leads créés + tâches complétées par période
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-primary" /> Leads
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#e5e5e2]" /> Tâches
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {chartPoints.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                Sélectionnez un intervalle valide
              </div>
            ) : (
              <div className="w-full">
                {/* SVG Visual Stacked Chart */}
                <div className="relative h-60 w-full flex items-end gap-1.5 border-b border-border/80 pb-1">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] text-muted-foreground/60 select-none pb-1">
                    <div className="border-b border-dashed border-border w-full text-right pr-1">{Math.round(maxMessagesVal)}</div>
                    <div className="border-b border-dashed border-border w-full text-right pr-1">{Math.round(maxMessagesVal * 0.66)}</div>
                    <div className="border-b border-dashed border-border w-full text-right pr-1">{Math.round(maxMessagesVal * 0.33)}</div>
                    <div className="w-full text-right pr-1">0</div>
                  </div>

                  {/* Columns */}
                  <div className="flex-1 h-full flex items-end justify-around relative z-10 pt-4 px-3">
                    {chartPoints.map((pt, idx) => {
                      const chatPercent = (pt.chatMessages / maxMessagesVal) * 100;
                      const agentPercent = (pt.agentMessages / maxMessagesVal) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative max-w-[24px]">
                          {/* Hover stats tooltip */}
                          <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[#26251e] text-white text-[9px] font-semibold rounded-md py-1 px-2 pointer-events-none shadow-md z-30 whitespace-nowrap text-center">
                            <p className="font-bold text-[8px] uppercase tracking-wider text-[#e5e5e0] mb-0.5">{pt.label}</p>
                            <p>Leads: {pt.chatMessages}</p>
                            <p>Tâches: {pt.agentMessages}</p>
                            <p className="border-t border-neutral-700 mt-0.5 pt-0.5 font-bold">Total: {pt.totalMessages}</p>
                          </div>

                          {/* Stacked Pillar */}
                          <div className="w-full h-full">
                            <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="w-full h-full">
                              {agentPercent > 0 && (
                                <rect
                                  y={100 - agentPercent - chatPercent}
                                  height={agentPercent}
                                  width="24"
                                  className="fill-[#e5e5e2] dark:fill-neutral-800 hover:brightness-95 transition-all"
                                  rx="1"
                                />
                              )}
                              {chatPercent > 0 && (
                                <rect
                                  y={100 - chatPercent}
                                  height={chatPercent}
                                  width="24"
                                  className="fill-primary hover:brightness-95 transition-all"
                                  rx="1"
                                />
                              )}
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X Axis Labels */}
                <div className="flex justify-between items-center text-[8px] font-bold text-muted-foreground uppercase tracking-wider pt-2 px-6">
                  <span>{chartPoints[0].label}</span>
                  <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.label}</span>
                  <span>{chartPoints[chartPoints.length - 1].label}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline breakdown: leads by status */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pipeline par statut</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                Répartition réelle de vos leads
              </CardDescription>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Users className="w-3 h-3" /> {leads.length} leads total
            </span>
          </CardHeader>
          <CardContent className="p-4">
            {pipelineBreakdown.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                Aucun lead dans cet espace de travail
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                {pipelineBreakdown.map(({ status, label, count, pct, color }) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-[90px] shrink-0 text-[11px] font-semibold text-muted-foreground text-right">{label}</span>
                    <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="w-[52px] shrink-0 text-[11px] font-bold text-foreground text-right">
                      {count} <span className="font-normal text-muted-foreground">({pct}%)</span>
                    </span>
                  </div>
                ))}
                {/* Conversion rate */}
                {leads.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Taux de conversion</span>
                    <span className="font-bold text-emerald-600">
                      {Math.round((leads.filter(l => l.status === 'Won').length / leads.length) * 100)}% gagnés
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Breakdowns grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {([
          { title: 'Par niche', data: byNiche, emptyMsg: 'Aucun lead avec niche renseignée' },
          { title: 'Par ville', data: byCity, emptyMsg: 'Aucun lead avec ville renseignée' },
          { title: 'Par propriétaire', data: byOwner, emptyMsg: 'Aucun lead assigné' },
          { title: 'Par campagne', data: byCampaign, emptyMsg: 'Aucun lead lié à une campagne' },
        ] as const).map(({ title, data, emptyMsg }) => {
          const maxTotal = data.length > 0 ? Math.max(...data.map(d => d.total)) : 1;
          return (
            <Card key={title} className="border border-border bg-card">
              <CardHeader className="p-4 pb-2 border-b border-border/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {data.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">{emptyMsg}</div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.map(({ key, total, contacted, won, convPct }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-[110px] shrink-0 text-[10px] font-semibold text-muted-foreground truncate text-right" title={key}>{key}</span>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.round((total / maxTotal) * 100)}%` }} />
                          </div>
                          <div className="h-1.5 bg-muted/20 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((won / Math.max(total, 1)) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="w-[64px] shrink-0 text-right">
                          <span className="text-[10px] font-bold text-foreground">{total}</span>
                          <span className="text-[9px] text-muted-foreground"> · {contacted}c</span>
                          {convPct > 0 && (
                            <span className="ml-1 text-[9px] font-bold text-emerald-600">{convPct}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity heatmap */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground">Activité quotidienne</CardTitle>
          <CardDescription className="text-xs">
            Jours où vous avez prospecté ou complété au moins une tâche (12 derniers mois).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Heatmap
            data={heatmapData}
            startDate={subDays(new Date(), 364)}
            endDate={new Date()}
            colorMode="interpolate"
            maxColor="#059669"
            minColor="#d1fae5"
            daysOfTheWeek="MWF"
            dateDisplayFunction={(date) => date.toLocaleDateString(locale === 'fr' ? 'fr-CA' : locale === 'de' ? 'de-DE' : 'en-CA')}
            valueDisplayFunction={(v) => `${v} action(s)`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
