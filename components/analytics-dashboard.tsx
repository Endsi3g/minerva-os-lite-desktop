'use client';

import React, { useState, useMemo } from 'react';
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

export function AnalyticsDashboard() {
  const { t, locale } = useLanguage();
  const { leads, tasks } = useReach();

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

  // Mock workspace statistics calculated dynamically based on existing app state
  const kpiData = useMemo(() => {
    // total agents - calculate based on workspace/leads or seed
    const totalAgents = Math.max(3, Math.floor(leads.length * 0.4));
    const totalWorkflows = Math.max(5, tasks.length + 2);
    // users in workspace
    const totalUsers = 4; // Seeded team members count
    const totalGroups = 2; // general + marketing

    return {
      users: totalUsers,
      agents: totalAgents,
      workflows: totalWorkflows,
      groups: totalGroups
    };
  }, [leads, tasks]);

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

    // Generate daily steps
    const current = new Date(start);
    while (current <= end) {
      const daySeed = current.getDate() + current.getMonth() * 31;
      
      // Calculate dynamic pseudo-random counts based on date seed
      // to make the graphs look alive and responsive to filters
      const activeUsersBase = 2 + (daySeed % 3);
      const activeUsers = current.getDay() === 0 || current.getDay() === 6 
        ? Math.max(1, activeUsersBase - 2) // lower on weekend
        : activeUsersBase;

      const chatMessages = activeUsers * (5 + (daySeed % 12));
      const agentMessages = activeUsers * (3 + (daySeed % 7));

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

  const maxUsersVal = useMemo(() => {
    const vals = chartPoints.map(p => p.activeUsers);
    return vals.length > 0 ? Math.max(...vals, 4) : 4;
  }, [chartPoints]);

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

          {/* Date range picker popover */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/60 flex items-center gap-2"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd LLL yyyy", { locale: dateLocale })} -{" "}
                        {format(dateRange.to, "dd LLL yyyy", { locale: dateLocale })}
                      </>
                    ) : (
                      format(dateRange.from, "dd LLL yyyy", { locale: dateLocale })
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </span>
                <ChevronDown className="w-3 h-3 text-[#7a7a76]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-border/80 shadow-lg" align="end">
              <div className="flex flex-col sm:flex-row bg-popover rounded-lg">
                {/* Quick select pane */}
                <div className="flex sm:flex-col gap-1 p-3 border-b sm:border-b-0 sm:border-r border-border/50 text-left bg-muted/20">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block hidden sm:block">
                    Raccourcis
                  </span>
                  <button 
                    onClick={() => setQuickRange(7)} 
                    className="text-left px-2 py-1 text-xs font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    7 Derniers Jours
                  </button>
                  <button 
                    onClick={() => setQuickRange(30)} 
                    className="text-left px-2 py-1 text-xs font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    30 Derniers Jours
                  </button>
                  <button 
                    onClick={() => setQuickRange(90)} 
                    className="text-left px-2 py-1 text-xs font-semibold rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    90 Derniers Jours
                  </button>
                </div>
                {/* Calendar grid */}
                <div className="p-1">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* User Card */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
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
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
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
            <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
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
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
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
      </div>

      {/* Visual Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Messages Chart: Chat vs Agent Stacked Column */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>{t('analytics.messages')}</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                Volume d&apos;activité cumulé du canal
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-primary" /> Chat
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#e5e5e2]" /> Agent
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
                            <p>Chat: {pt.chatMessages}</p>
                            <p>Agent: {pt.agentMessages}</p>
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

        {/* Active Users: Simple Column Chart */}
        <Card className="border border-border bg-card">
          <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('analytics.active_users')}</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                Utilisateurs uniques sur la plateforme
              </CardDescription>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Max: {summaryMetrics.maxActive}
            </span>
          </CardHeader>
          <CardContent className="p-4">
            {chartPoints.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-xs text-muted-foreground">
                Sélectionnez un intervalle valide
              </div>
            ) : (
              <div className="w-full">
                {/* SVG Column Chart */}
                <div className="relative h-60 w-full flex items-end gap-1.5 border-b border-border/80 pb-1">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[8px] text-muted-foreground/60 select-none pb-1">
                    <div className="border-b border-dashed border-border w-full text-right pr-1">{Math.round(maxUsersVal)}</div>
                    <div className="border-b border-dashed border-border w-full text-right pr-1">{Math.round(maxUsersVal * 0.66)}</div>
                    <div className="border-b border-dashed border-border w-full text-right pr-1">{Math.round(maxUsersVal * 0.33)}</div>
                    <div className="w-full text-right pr-1">0</div>
                  </div>

                  {/* Columns */}
                  <div className="flex-1 h-full flex items-end justify-around relative z-10 pt-4 px-3">
                    {chartPoints.map((pt, idx) => {
                      const userPercent = (pt.activeUsers / maxUsersVal) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative max-w-[24px]">
                          {/* Hover stats tooltip */}
                          <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-[#26251e] text-white text-[9px] font-semibold rounded-md py-1 px-2 pointer-events-none shadow-md z-30 whitespace-nowrap text-center">
                            <p className="font-bold text-[8px] uppercase tracking-wider text-[#e5e5e0] mb-0.5">{pt.label}</p>
                            <p>Actifs: {pt.activeUsers}</p>
                          </div>

                          {/* Pillar */}
                          <div className="w-full h-full">
                            <svg viewBox="0 0 24 100" preserveAspectRatio="none" className="w-full h-full">
                              {userPercent > 0 && (
                                <rect
                                  y={100 - userPercent}
                                  height={userPercent}
                                  width="24"
                                  className="fill-emerald-500 hover:fill-emerald-600 transition-all"
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

      </div>
    </div>
  );
}
