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
    const isNumbered = /^\d+\./.test(para.trim());
    const lines = para.split('\n').filter(Boolean);
    return (
      <div key={i} className={cn('space-y-1.5 border-l-2 pl-3.5 transition-colors duration-200', isNumbered ? 'border-[#059669]/25 hover:border-[#059669]' : 'border-transparent')}>
        {lines.map((line, j) => {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
          const cleanLine = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line;
          return (
            <p key={j} className={cn(
              "text-xs leading-relaxed text-[#4a4a45]",
              isNumbered && j === 0 ? "font-bold text-[#1c1b18] text-sm mb-1" : "",
              isBullet ? "flex items-start gap-2 before:content-['•'] before:text-[#059669] before:font-bold before:text-sm pl-2" : ""
            )}>
              {cleanLine}
            </p>
          );
        })}
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
    <div className="relative min-h-full overflow-x-hidden bg-[#fafaf8] selection:bg-[#059669]/10 text-[#26251e] font-sans">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/today" className="flex items-center justify-center h-10 w-10 rounded-xl border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] hover:shadow-xs transition-all shrink-0">
              <ArrowLeft className="h-4.5 w-4.5 text-[#26251e]" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-[#26251e] tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#059669]" />
                Bilan de la semaine
              </h1>
              <p className="text-xs text-[#7a7a76] mt-0.5 font-medium">{activeRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* History toggle */}
            <button
              onClick={() => setHistoryOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all shrink-0 shadow-xs hover:-translate-y-0.5 active:translate-y-0',
                historyOpen
                  ? 'border-[#059669] bg-[#059669]/8 text-[#059669]'
                  : 'border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#26251e]'
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Historique</span>
              {history.length > 0 && (
                <span className="bg-[#059669] text-white text-[9px] font-black px-2 py-0.5 rounded-full ml-1">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { fetchReport(); fetchActivity(); }}
              disabled={loadingReport || loadingActivity}
              className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] disabled:opacity-50 px-3.5 py-2.5 text-xs font-bold text-[#26251e] transition-all shrink-0 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
            >
              {loadingReport || loadingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* === HISTORY SIDEBAR === */}
          {historyOpen && (
            <div className="lg:w-60 shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="rounded-2xl border border-[#e5e5e0] bg-white/90 backdrop-blur-md overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#e5e5e0] bg-[#fafaf8]">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76]">Bilans précédents</p>
                </div>
                <div className="divide-y divide-[#e5e5e0]/60 max-h-[400px] overflow-y-auto">
                  {/* Current week */}
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className={cn(
                      'w-full text-left px-5 py-4 hover:bg-[#f4f4f3] transition-colors',
                      !selectedWeek ? 'bg-[#059669]/6 border-l-2 border-l-[#059669]' : 'border-l-2 border-l-transparent'
                    )}
                  >
                    <p className={cn('text-xs font-black', !selectedWeek ? 'text-[#059669]' : 'text-[#26251e]')}>
                      Cette semaine
                    </p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5 font-semibold">{dateRange}</p>
                  </button>

                  {history.length === 0 && (
                    <div className="px-5 py-6 text-center">
                      <p className="text-xs text-[#7a7a76]">Aucun bilan enregistré.</p>
                      <p className="text-[10px] text-[#b0b0a8] mt-1 font-semibold">Générez votre premier rapport.</p>
                    </div>
                  )}

                  {history.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedWeek(r)}
                      className={cn(
                        'w-full text-left px-5 py-4 hover:bg-[#f4f4f3] transition-colors flex items-center justify-between gap-2 border-l-2',
                        selectedWeek?.id === r.id ? 'bg-[#059669]/6 border-l-[#059669]' : 'border-l-transparent'
                      )}
                    >
                      <div className="min-w-0">
                        <p className={cn('text-xs font-black truncate', selectedWeek?.id === r.id ? 'text-[#059669]' : 'text-[#26251e]')}>
                          {formatWeekLabel(r.week_start, r.week_end)}
                        </p>
                        <p className="text-[10px] text-[#7a7a76] mt-0.5 font-semibold">
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
          <div className="flex-1 min-w-0 space-y-6">

            {/* Selected week banner */}
            {selectedWeek && (
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#059669]/8 border border-[#059669]/20 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <Clock className="h-4 w-4 text-[#059669] shrink-0" />
                <p className="text-xs font-bold text-[#059669]">
                  Bilan archivé — semaine du {formatWeekLabel(selectedWeek.week_start, selectedWeek.week_end)}
                </p>
                <button onClick={() => setSelectedWeek(null)} className="ml-auto text-[10px] text-[#7a7a76] hover:text-[#26251e] transition-colors font-black uppercase tracking-wider">
                  Semaine actuelle →
                </button>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'NBA accepté', value: activeMetrics ? `${activeMetrics.nbaAcceptanceRate}%` : '—', accent: activeMetrics && activeMetrics.nbaAcceptanceRate > 50 ? '#059669' : '#d97706', bg: 'from-emerald-50/40 to-transparent' },
                { label: 'Bookings', value: activeMetrics?.bookingsThisWeek ?? totals?.bookingsThisWeek ?? '—', accent: '#26251e', bg: 'from-stone-50/40 to-transparent' },
                { label: 'Réponses positives', value: activeMetrics?.positiveRepliesThisWeek ?? totals?.positiveRepliesThisWeek ?? '—', accent: '#26251e', bg: 'from-stone-50/40 to-transparent' },
                { label: 'Leads avancés', value: activeMetrics?.leadsAdvanced ?? '—', accent: '#26251e', bg: 'from-stone-50/40 to-transparent' },
                { label: 'Brouillons générés', value: totals?.draftsGenerated ?? '—', accent: '#26251e', bg: 'from-stone-50/40 to-transparent' },
                { label: 'Actions IA exécutées', value: activeMetrics?.nbaExecuted ?? totals?.actionsExecuted ?? '—', accent: '#059669', bg: 'from-emerald-50/40 to-transparent' },
              ].map(({ label, value, accent, bg }) => (
                <div key={label} className={cn(
                  "relative group overflow-hidden rounded-2xl border border-[#e5e5e0] bg-white p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#059669]/20 hover:-translate-y-0.5",
                  "bg-gradient-to-br"
                )} style={{ backgroundImage: bg ? undefined : `linear-gradient(to bottom right, ${accent}04, transparent)` }}>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76]">{label}</p>
                  <p className="text-3xl font-black leading-none mt-3 transition-transform duration-300 group-hover:scale-[1.02]" style={{ color: accent }}>{value}</p>
                </div>
              ))}
            </div>

            {activeMetrics?.topNiche && (
              <span className="inline-flex items-center gap-1.5 bg-[#059669]/8 text-[#059669] text-xs font-bold px-3 py-1.5 rounded-full border border-[#059669]/15 shadow-xs transition-all hover:bg-[#059669]/12">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Niche performante : <strong className="font-black underline decoration-dotted">{activeMetrics.topNiche}</strong>
              </span>
            )}

            {/* AI Report — premium card */}
            <div className="group rounded-2xl border border-[#e5e5e0] border-t-2 border-t-[#059669] bg-white/90 backdrop-blur-md p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between border-b border-[#f4f4f3] pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#059669]/8 flex items-center justify-center text-[#059669]">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#26251e]">Rapport Intelligence</h2>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#7a7a76] font-semibold bg-[#fafaf8] px-2 py-0.5 rounded-md border border-[#e5e5e0]/30">
                  <Sparkles className="h-3 w-3 text-[#059669] animate-pulse" />
                  Généré par IA
                </div>
              </div>
              
              {loadingReport && !activeReport && (
                <div className="space-y-3 pt-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 rounded bg-[#f4f4f3] animate-pulse" style={{ width: `${95 - i * 12}%` }} />
                  ))}
                </div>
              )}
              {reportError && !loadingReport && !selectedWeek && (
                <p className="text-xs text-[#7a7a76] font-semibold">Rapport non disponible — vérifiez vos paramètres IA.</p>
              )}
              {activeReport && (
                <div className="space-y-4 pt-1 text-[#3c3c3a] leading-relaxed selection:bg-[#059669]/10">
                  {renderReport(activeReport)}
                </div>
              )}
              {!activeReport && !loadingReport && !reportError && (
                <p className="text-xs text-[#7a7a76] font-semibold">Cliquez sur &quot;Actualiser&quot; pour générer le bilan de cette semaine.</p>
              )}
            </div>

            {/* Activity log — only shown for current week */}
            {!selectedWeek && (
              <div className="space-y-3 pt-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#7a7a76] px-1.5">
                  Journal complet des actions ({activity.length})
                </h2>

                {loadingActivity && activity.length === 0 && (
                  <div className="rounded-2xl border border-[#e5e5e0] bg-white/80 p-6 space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-[#f4f4f3] animate-pulse" />)}
                  </div>
                )}

                {!loadingActivity && activity.length === 0 && (
                  <div className="rounded-2xl border border-[#e5e5e0] bg-white/80 p-6">
                    <p className="text-xs text-[#7a7a76] font-semibold">Aucune action enregistrée cette semaine.</p>
                  </div>
                )}

                {grouped.map((group) => (
                  <div key={group.label} className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76] px-1.5 capitalize flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#7a7a76]" />
                      {group.label}
                    </p>
                    <div className="rounded-2xl border border-[#e5e5e0] bg-white/80 backdrop-blur-sm divide-y divide-[#f4f4f3] overflow-hidden shadow-xs">
                      {group.items.map((item) => {
                        const Icon = TOOL_ICONS[item.tool] ?? Sparkles;
                        return (
                          <div key={item.id} className="flex items-start gap-3.5 px-5 py-4 transition-all duration-300 hover:bg-[#fafaf8]/60">
                            <div className={cn(
                              'flex items-center justify-center h-9 w-9 rounded-xl shrink-0 transition-transform duration-300 hover:scale-105',
                              item.executed ? 'bg-[#059669]/8 text-[#059669]' : 'bg-stone-100/80 text-stone-500',
                            )}>
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-black text-[#26251e] leading-snug">{item.label}</p>
                                {item.leadId && item.leadName && (
                                  <Link href={`/leads/${item.leadId}`} className="text-[10px] font-black text-[#059669] hover:underline decoration-wavy flex items-center gap-0.5 bg-[#059669]/5 px-2 py-0.5 rounded-md">
                                    {item.leadName}
                                  </Link>
                                )}
                                <span className={cn(
                                  'text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border',
                                  item.executed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100',
                                )}>
                                  {item.executed ? 'Exécutée' : 'Suggérée'}
                                </span>
                              </div>
                              {item.reasoning && <p className="text-[11px] text-[#7a7a76] leading-relaxed max-w-2xl">{item.reasoning}</p>}
                            </div>
                            <span className="text-[9px] font-bold text-[#b0b0a8] shrink-0 whitespace-nowrap bg-[#f4f4f3]/40 px-2 py-0.5 rounded border border-[#e5e5e0]/30">
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
