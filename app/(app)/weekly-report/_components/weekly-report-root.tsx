'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3, RefreshCw, Loader2, ArrowLeft, Mail, ListTodo,
  ArrowRightLeft, UsersRound, BrainCircuit, PauseCircle, PlayCircle, Tag,
  MessageSquare, Inbox, Lightbulb, Send, Sparkles, ChevronRight, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeeklyMetrics {
  nbaAcceptanceRate: number;
  nbaSuggested: number;
  nbaExecuted: number;
  bookingsThisWeek: number;
  positiveRepliesThisWeek: number;
  leadsAdvanced: number;
  topNiche: string | null;
}

interface ActivityItem {
  id: string;
  tool: string;
  label: string;
  leadId: string | null;
  leadName: string | null;
  reasoning: string | null;
  dataSignals: string | null;
  executed: boolean;
  suggested: boolean;
  approved: boolean | null;
  createdAt: string;
}

interface ActivityTotals {
  actionsTotal: number;
  actionsExecuted: number;
  draftsGenerated: number;
  emailsSent: number;
  bookingsThisWeek: number;
  positiveRepliesThisWeek: number;
}

interface HistoryReport {
  id: string;
  week_start: string;
  week_end: string;
  report: string;
  metrics: WeeklyMetrics;
  created_at: string;
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  create_task: ListTodo,
  update_pipeline_stage: ArrowRightLeft,
  generate_email_draft: Mail,
  enroll_in_sequence: UsersRound,
  update_agent_memory: BrainCircuit,
  summarize_pipeline: BarChart3,
  pause_sequence: PauseCircle,
  resume_sequence: PlayCircle,
  tag_lead: Tag,
  classify_reply: MessageSquare,
  summarize_inbox: Inbox,
  suggest_follow_up: Lightbulb,
  send_email: Send,
};

/** Strip residual Markdown from AI-generated plain text (belt-and-suspenders) */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '') // # headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/\*(.+?)\*/g, '$1') // *italic*
    .replace(/^[-•]\s+/gm, '') // bullet list markers
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // inline code / fenced
    .trim();
}

/** Render a plain-text AI report as formatted paragraphs */
function renderReport(text: string): React.ReactNode[] {
  const cleaned = stripMarkdown(text);
  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
  return paragraphs.map((para, i) => {
    // Numbered items (1. 2. 3.) get slight emphasis styling
    const isNumbered = /^\d+\./.test(para.trim());
    const lines = para.split('\n').filter(Boolean);
    return (
      <div key={i} className={cn('space-y-0.5', isNumbered ? 'pl-0' : '')}>
        {lines.map((line, j) => (
          <p key={j} className="text-sm text-[#26251e] leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    );
  });
}

function groupByDay(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const groups: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    const label = new Date(item.createdAt).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
    (groups[label] ||= []).push(item);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  try {
    const s = parseISO(weekStart);
    const e = parseISO(weekEnd);
    return `${format(s, 'd MMM', { locale: fr })} – ${format(e, 'd MMM yyyy', { locale: fr })}`;
  } catch {
    return weekStart;
  }
}

export function WeeklyReportRoot() {
  const { activeWorkspace } = useReach();

  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [reportError, setReportError] = useState(false);

  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [totals, setTotals] = useState<ActivityTotals | null>(null);

  const [history, setHistory] = useState<HistoryReport[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<HistoryReport | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const dateRange = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const fetchHistory = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(getApiUrl(`/api/insights/weekly/history?workspaceId=${activeWorkspace.id}`));
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.reports ?? []);
    } catch { /* non-fatal */ }
  }, [activeWorkspace]);

  const fetchReport = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingReport(true);
    setReportError(false);
    setSelectedWeek(null);
    try {
      const res = await fetch(getApiUrl('/api/insights/weekly'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setReport(data.report ?? null);
      setMetrics(data.metrics ?? null);
      fetchHistory(); // refresh catalogue after generating
    } catch {
      setReportError(true);
    } finally {
      setLoadingReport(false);
    }
  }, [activeWorkspace, fetchHistory]);

  const fetchActivity = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingActivity(true);
    try {
      const res = await fetch(getApiUrl(`/api/insights/weekly/activity?workspaceId=${activeWorkspace.id}`));
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setActivity(data.activity ?? []);
      setTotals(data.totals ?? null);
    } catch {
      // Non-fatal — the AI report above still renders
    } finally {
      setLoadingActivity(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchReport();
    fetchActivity();
    fetchHistory();
  }, [fetchReport, fetchActivity, fetchHistory]);

  if (!activeWorkspace) return null;

  const grouped = groupByDay(activity);
  const activeReport = selectedWeek ? selectedWeek.report : report;
  const activeMetrics = selectedWeek ? selectedWeek.metrics : metrics;
  const activeRange = selectedWeek
    ? formatWeekLabel(selectedWeek.week_start, selectedWeek.week_end)
    : dateRange;

  return (
    <div className="relative min-h-full overflow-x-hidden bg-[#fafaf8]">
      {/* === Background visual matching Home/Team pages === */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {/* Radial orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#059669]/6 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-[#059669]/4 blur-[100px]" />
        <div className="absolute bottom-20 right-1/4 w-[300px] h-[300px] rounded-full bg-[#059669]/5 blur-[80px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #26251e 1px, transparent 1px), linear-gradient(to bottom, #26251e 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
        {/* === HEADER === */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/today" className="flex items-center justify-center h-9 w-9 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4 text-[#26251e]" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#26251e] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#059669]" />
                Bilan de la semaine
              </h1>
              <p className="text-xs text-[#7a7a76] mt-0.5">{activeRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* History toggle */}
            <button
              onClick={() => setHistoryOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors shrink-0',
                historyOpen
                  ? 'border-[#059669] bg-[#059669]/8 text-[#059669]'
                  : 'border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#26251e]'
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Historique</span>
              {history.length > 0 && (
                <span className="bg-[#059669] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { fetchReport(); fetchActivity(); }}
              disabled={loadingReport || loadingActivity}
              className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] disabled:opacity-50 px-3 py-2 text-xs font-bold text-[#26251e] transition-colors shrink-0"
            >
              {loadingReport || loadingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* === HISTORY SIDEBAR === */}
          {historyOpen && (
            <div className="lg:w-56 shrink-0">
              <div className="rounded-xl border border-[#e5e5e0] bg-white/80 backdrop-blur-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e5e5e0]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Bilans précédents</p>
                </div>
                <div className="divide-y divide-[#e5e5e0] max-h-[400px] overflow-y-auto">
                  {/* Current week */}
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-[#f4f4f3] transition-colors',
                      !selectedWeek ? 'bg-[#059669]/6' : ''
                    )}
                  >
                    <p className={cn('text-xs font-bold', !selectedWeek ? 'text-[#059669]' : 'text-[#26251e]')}>
                      Cette semaine
                    </p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5">{dateRange}</p>
                  </button>

                  {history.length === 0 && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-[#7a7a76]">Aucun bilan enregistré.</p>
                      <p className="text-[10px] text-[#b0b0a8] mt-1">Générez votre premier rapport ci-contre.</p>
                    </div>
                  )}

                  {history.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedWeek(r)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-[#f4f4f3] transition-colors flex items-center justify-between gap-2',
                        selectedWeek?.id === r.id ? 'bg-[#059669]/6' : ''
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn('text-xs font-bold truncate', selectedWeek?.id === r.id ? 'text-[#059669]' : 'text-[#26251e]')}>
                          {formatWeekLabel(r.week_start, r.week_end)}
                        </p>
                        <p className="text-[10px] text-[#7a7a76] mt-0.5">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-[#b0b0a8] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === MAIN CONTENT === */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Selected week banner */}
            {selectedWeek && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669]/8 border border-[#059669]/20">
                <Clock className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                <p className="text-xs font-bold text-[#059669]">
                  Bilan archivé — semaine du {formatWeekLabel(selectedWeek.week_start, selectedWeek.week_end)}
                </p>
                <button onClick={() => setSelectedWeek(null)} className="ml-auto text-[10px] text-[#7a7a76] hover:text-[#26251e] transition-colors font-bold">
                  Semaine actuelle →
                </button>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'NBA accepté', value: activeMetrics ? `${activeMetrics.nbaAcceptanceRate}%` : '—', accent: activeMetrics && activeMetrics.nbaAcceptanceRate > 50 ? '#059669' : '#d97706' },
                { label: 'Bookings', value: activeMetrics?.bookingsThisWeek ?? totals?.bookingsThisWeek ?? '—', accent: '#26251e' },
                { label: 'Réponses positives', value: activeMetrics?.positiveRepliesThisWeek ?? totals?.positiveRepliesThisWeek ?? '—', accent: '#26251e' },
                { label: 'Leads avancés', value: activeMetrics?.leadsAdvanced ?? '—', accent: '#26251e' },
                { label: 'Brouillons générés', value: totals?.draftsGenerated ?? '—', accent: '#26251e' },
                { label: 'Actions IA exécutées', value: activeMetrics?.nbaExecuted ?? totals?.actionsExecuted ?? '—', accent: '#059669' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="rounded-xl border border-[#e5e5e0] bg-white/80 backdrop-blur-sm px-4 py-3 flex flex-col gap-1">
                  <p className="text-2xl font-black leading-none" style={{ color: accent }}>{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
                </div>
              ))}
            </div>

            {activeMetrics?.topNiche && (
              <span className="inline-flex items-center gap-1 bg-[#059669]/10 text-[#059669] text-xs font-bold px-2.5 py-1 rounded-full w-fit">
                <Sparkles className="h-3 w-3" />
                Niche top : {activeMetrics.topNiche}
              </span>
            )}

            {/* AI Report — plain text */}
            <div className="rounded-xl border border-[#e5e5e0] bg-white/80 backdrop-blur-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-[#059669]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Rapport IA</h2>
              </div>
              {loadingReport && !activeReport && (
                <div className="space-y-2 pt-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 rounded bg-[#f4f4f3] animate-pulse" style={{ width: `${90 - i * 10}%` }} />
                  ))}
                </div>
              )}
              {reportError && !loadingReport && !selectedWeek && (
                <p className="text-xs text-[#7a7a76]">Rapport non disponible — vérifiez vos paramètres IA.</p>
              )}
              {activeReport && (
                <div className="space-y-3 pt-1">
                  {renderReport(activeReport)}
                </div>
              )}
              {!activeReport && !loadingReport && !reportError && (
                <p className="text-xs text-[#7a7a76]">Cliquez sur "Actualiser" pour générer le bilan de cette semaine.</p>
              )}
            </div>

            {/* Activity log — only shown for current week */}
            {!selectedWeek && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] px-1">
                  Journal complet des actions ({activity.length})
                </h2>

                {loadingActivity && activity.length === 0 && (
                  <div className="rounded-xl border border-[#e5e5e0] bg-white/80 p-5 space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-[#f4f4f3] animate-pulse" />)}
                  </div>
                )}

                {!loadingActivity && activity.length === 0 && (
                  <div className="rounded-xl border border-[#e5e5e0] bg-white/80 p-5">
                    <p className="text-xs text-[#7a7a76]">Aucune action enregistrée cette semaine.</p>
                  </div>
                )}

                {grouped.map((group) => (
                  <div key={group.label} className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] px-1 capitalize">{group.label}</p>
                    <div className="rounded-xl border border-[#e5e5e0] bg-white/80 divide-y divide-[#e5e5e0]">
                      {group.items.map((item) => {
                        const Icon = TOOL_ICONS[item.tool] ?? Sparkles;
                        return (
                          <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                            <div className={cn(
                              'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
                              item.executed ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#f4f4f3] text-[#7a7a76]',
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-[#26251e]">{item.label}</p>
                                {item.leadId && item.leadName && (
                                  <Link href={`/leads/${item.leadId}`} className="text-[10px] font-bold text-[#059669] hover:text-[#047857] transition-colors">
                                    {item.leadName}
                                  </Link>
                                )}
                                <span className={cn(
                                  'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                                  item.executed ? 'bg-[#059669]/10 text-[#059669]' : 'bg-amber-50 text-amber-600',
                                )}>
                                  {item.executed ? 'Exécutée' : 'Suggérée'}
                                </span>
                              </div>
                              {item.reasoning && <p className="text-[11px] text-[#7a7a76] mt-0.5 leading-relaxed">{item.reasoning}</p>}
                            </div>
                            <span className="text-[10px] text-[#7a7a76] shrink-0 whitespace-nowrap">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
