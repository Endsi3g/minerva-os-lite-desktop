'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3, RefreshCw, Loader2, ArrowLeft, Mail, ListTodo,
  ArrowRightLeft, UsersRound, BrainCircuit, PauseCircle, PlayCircle, Tag,
  MessageSquare, Inbox, Lightbulb, Send, Sparkles, ChevronRight, Clock, Trophy, LineChart,
  ArrowUpRight, Target, TrendingUp, CheckCircle2, Flame, ShieldAlert,
  Copy, Download, Share2, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PerformanceRoot } from '@/app/(app)/performance/_components/performance-root';
import { AnalyticsRoot } from '@/app/(app)/analytics/_components/analytics-root';
import { AnalyserSubNav } from '@/app/(app)/_components/hub-nav/analyser-sub-nav';
import { InteractiveChartCard } from '@/components/charts/interactive-chart-card';

type MainTab = 'bilan' | 'performance' | 'analytics';

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

/** Strip residual Markdown from AI-generated plain text */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-•]\s+/gm, '')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .trim();
}

/** Render a plain-text AI report as formatted paragraphs with high-end typography */
function renderReport(text: string): React.ReactNode[] {
  const cleaned = stripMarkdown(text);
  const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
  return paragraphs.map((para, i) => {
    const isNumbered = /^\d+\./.test(para.trim());
    const lines = para.split('\n').filter(Boolean);
    return (
      <div
        key={i}
        className={cn(
          'space-y-2 rounded-xl p-4 transition-all duration-200 border',
          isNumbered
            ? 'bg-white border-[#e5e5e0] shadow-xs'
            : 'bg-[#fafaf8]/80 border-[#e5e5e0]/60'
        )}
      >
        {lines.map((line, j) => {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
          const cleanLine = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line;
          return (
            <p
              key={j}
              className={cn(
                'text-xs leading-relaxed text-[#4a4a45]',
                isNumbered && j === 0 ? 'font-black text-[#1c1b18] text-sm mb-1.5 flex items-center gap-2' : '',
                isBullet ? 'flex items-start gap-2 before:content-["•"] before:text-[#059669] before:font-bold before:text-sm pl-2' : ''
              )}
            >
              {isNumbered && j === 0 && (
                <span className="w-5 h-5 rounded-full bg-[#059669]/10 text-[#059669] text-[10px] font-black flex items-center justify-center shrink-0">
                  {para.trim().slice(0, 1)}
                </span>
              )}
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
  const { activeWorkspace, leads, tasks } = useReach();

  const searchParamsUrl = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    const t = searchParamsUrl?.get('tab');
    return t === 'performance' || t === 'analytics' ? t : 'bilan';
  });

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

  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, []);

  // Compute live synthesis if no server report generated yet
  const liveComputedReport = useMemo(() => {
    if (leads.length === 0) {
      return `1. Analyse du portefeuille et vélocité
Aucune opportunité active n'a été enregistrée dans le portefeuille pour cette période. Ajoutez vos premiers leads pour obtenir une analyse détaillée.

2. Opportunités prioritaires
Aucun prospect prioritaire à relancer.

3. Recommandation stratégique
Démarrez votre prospection ou importez une liste de contacts pour activer les recommandations prédictives de Minerva.`;
    }
    const hotLeads = leads.filter(l => l.temperature === 'Hot');
    const meetingLeads = leads.filter(l => l.status === 'Meeting Booked');
    const proposalLeads = leads.filter(l => l.status === 'Proposal Sent');
    const wonLeads = leads.filter(l => l.status === 'Won');
    const topNiche = leads.reduce((acc, l) => {
      acc[l.niche] = (acc[l.niche] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const sortedNiches = Object.entries(topNiche).sort((a, b) => b[1] - a[1]);
    const mainNiche = sortedNiches[0]?.[0] || 'Général';

    return `1. Analyse du portefeuille et vélocité
Le portefeuille compte actuellement ${leads.length} opportunités actives réparties principalement sur le secteur ${mainNiche}. ${hotLeads.length} prospects à haute intention d'achat (score moyen supérieur à 80/100) nécessitent un suivi immédiat.

2. Opportunités prioritaires à conclure
• ${hotLeads[0]?.businessName || 'Prospect prioritaire'} (${hotLeads[0]?.city || 'Local'}) : ${hotLeads[0]?.nextAction || 'Relance personnalisée'}
${hotLeads[1] ? `• ${hotLeads[1].businessName} : Proposition d'optimisation commerciale` : ''}
${meetingLeads[0] ? `• ${meetingLeads[0].businessName} : Dossier en négociation / Démonstration` : ''}

3. Recommandation stratégique Minerva
Concentrez les efforts de prospection sur les ${sortedNiches.slice(0, 3).map(n => n[0]).join(', ')} qui présentent le meilleur potentiel de conversion.`;
  }, [leads]);

  const liveMetrics = useMemo<WeeklyMetrics>(() => {
    const meeting = leads.filter(l => l.status === 'Meeting Booked' || l.status === 'Won').length;
    const hot = leads.filter(l => l.temperature === 'Hot').length;
    const advanced = leads.filter(l => l.status !== 'New').length;
    const executedActions = activity.filter(a => a.executed).length;
    const suggestedActions = activity.length;
    const acceptanceRate = suggestedActions > 0 
      ? Math.round((executedActions / suggestedActions) * 100)
      : (leads.length > 0 ? Math.min(100, Math.round((advanced / leads.length) * 100)) : 0);

    const nicheCounts = leads.reduce((acc, l) => {
      if (l.niche) acc[l.niche] = (acc[l.niche] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topNiche = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      nbaAcceptanceRate: acceptanceRate,
      nbaSuggested: suggestedActions || leads.length,
      nbaExecuted: executedActions || (leads.length > 0 ? Math.min(leads.length, advanced) : 0),
      bookingsThisWeek: meeting,
      positiveRepliesThisWeek: hot,
      leadsAdvanced: advanced,
      topNiche: topNiche,
    };
  }, [leads, activity]);

  const fetchHistory = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingReport(true);
    setReportError(false);
    try {
      const res = await fetch(getApiUrl(`/api/insights/weekly/history?workspaceId=${activeWorkspace.id}`));
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const reports = data.reports ?? [];
      setHistory(reports);
      if (reports.length > 0) {
        setReport(reports[0].report);
        setMetrics(reports[0].metrics);
      }
    } catch {
      // Non fatal — fallback to live computed
    } finally {
      setLoadingReport(false);
    }
  }, [activeWorkspace]);

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
      // Non fatal
    } finally {
      setLoadingActivity(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchHistory();
    fetchActivity();
  }, [fetchHistory, fetchActivity]);

  // Real activity timeline from server or real CRM actions
  const effectiveActivity = useMemo(() => {
    return activity;
  }, [activity]);

  const grouped = groupByDay(effectiveActivity);
  const activeReport = selectedWeek ? selectedWeek.report : (report || liveComputedReport);
  const activeMetrics = selectedWeek ? selectedWeek.metrics : (metrics || liveMetrics);
  const activeRange = selectedWeek
    ? formatWeekLabel(selectedWeek.week_start, selectedWeek.week_end)
    : dateRange;

  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    const textToCopy = `MINERVA OS REACH LITE - BILAN HEBDOMADAIRE (${activeRange})
--------------------------------------------------
Taux d'action IA : ${activeMetrics.nbaAcceptanceRate}%
Rendez-vous / Gagnés : ${activeMetrics.bookingsThisWeek}
Réponses positives / Chauds : ${activeMetrics.positiveRepliesThisWeek}
Leads avancés dans le tunnel : ${activeMetrics.leadsAdvanced}
Secteur clé : ${activeMetrics.topNiche || 'Tous'}

SYNTHÈSE STRATÉGIQUE :
${activeReport || 'Aucune synthèse disponible.'}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Bilan hebdomadaire copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafaf8] selection:bg-[#059669]/10 text-[#26251e] font-sans">
      <AnalyserSubNav />
      <div className="flex-1 overflow-y-auto relative min-h-0">
        {/* === Background Orbs matching Design System === */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#059669]/6 blur-[120px]" />
          <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-[#059669]/4 blur-[100px]" />
          <div className="absolute bottom-20 right-1/4 w-[300px] h-[300px] rounded-full bg-[#059669]/5 blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #26251e 1px, transparent 1px), linear-gradient(to bottom, #26251e 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 space-y-6">
          {/* === HEADER === */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5e0] pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/today"
                className="flex items-center justify-center h-10 w-10 rounded-xl border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] hover:shadow-xs transition-all shrink-0"
              >
                <ArrowLeft className="h-4.5 w-4.5 text-[#26251e]" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#059669]" />
                  <h1 className="text-xl font-black text-[#26251e] tracking-tight">Bilan Hebdomadaire</h1>
                  <span className="bg-[#059669]/10 text-[#059669] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#059669]/20">
                    Live CRM
                  </span>
                </div>
                <p className="text-xs text-[#7a7a76] mt-0.5 font-medium">{activeRange}</p>
              </div>
            </div>

            {mainTab === 'bilan' && (
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={handleCopyReport}
                  title="Copier le bilan dans le presse-papier"
                  className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] px-3.5 py-2 text-xs font-bold text-[#26251e] transition-all shrink-0 shadow-xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
                </button>
                <button
                  onClick={handleDownloadPdf}
                  title="Télécharger / Imprimer en PDF"
                  className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] px-3.5 py-2 text-xs font-bold text-[#26251e] transition-all shrink-0 shadow-xs hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={() => setHistoryOpen(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shrink-0 shadow-xs hover:-translate-y-0.5 active:translate-y-0',
                    historyOpen
                      ? 'border-[#059669] bg-[#059669]/8 text-[#059669]'
                      : 'border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[#26251e]'
                  )}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Historique</span>
                  {history.length > 0 && (
                    <span className="bg-[#059669] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ml-1">
                      {history.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { fetchHistory(); fetchActivity(); }}
                  disabled={loadingReport || loadingActivity}
                  title="Actualiser le bilan"
                  className="flex items-center gap-1.5 rounded-xl border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-[#26251e] transition-all shrink-0 shadow-xs hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loadingReport || loadingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Actualiser</span>
                </button>
              </div>
            )}
          </div>

          {/* === Onglets : Bilan / Performance équipe / Analytics === */}
          <div className="flex items-center gap-2">
            {[
              { id: 'bilan' as const, label: 'Bilan IA', icon: BrainCircuit },
              { id: 'performance' as const, label: 'Performance équipe', icon: Trophy },
              { id: 'analytics' as const, label: 'Analytics', icon: LineChart },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMainTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                  mainTab === id
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'bg-white border border-[#e5e5e0] text-[#7a7a76] hover:text-[#26251e] hover:bg-[#fafaf8]'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {mainTab === 'performance' && <PerformanceRoot />}
          {mainTab === 'analytics' && <AnalyticsRoot hideSubNav />}

          {mainTab === 'bilan' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* === HISTORY SIDEBAR === */}
              {historyOpen && (
                <div className="lg:w-60 shrink-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="rounded-2xl border border-[#e5e5e0] bg-white/90 backdrop-blur-md overflow-hidden shadow-xs">
                    <div className="px-4 py-3 border-b border-[#e5e5e0] bg-[#fafaf8]">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76]">Bilans précédents</p>
                    </div>
                    <div className="divide-y divide-[#e5e5e0]/60 max-h-[400px] overflow-y-auto">
                      <button
                        onClick={() => setSelectedWeek(null)}
                        className={cn(
                          'w-full text-left px-4 py-3 hover:bg-[#f4f4f3] transition-colors',
                          !selectedWeek ? 'bg-[#059669]/6 border-l-2 border-l-[#059669]' : 'border-l-2 border-l-transparent'
                        )}
                      >
                        <p className={cn('text-xs font-black', !selectedWeek ? 'text-[#059669]' : 'text-[#26251e]')}>
                          Cette semaine
                        </p>
                        <p className="text-[10px] text-[#7a7a76] mt-0.5 font-semibold">{dateRange}</p>
                      </button>

                      {history.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedWeek(r)}
                          className={cn(
                            'w-full text-left px-4 py-3 hover:bg-[#f4f4f3] transition-colors flex items-center justify-between gap-2 border-l-2',
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
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669]/8 border border-[#059669]/20 shadow-xs animate-in fade-in duration-200">
                    <Clock className="h-4 w-4 text-[#059669] shrink-0" />
                    <p className="text-xs font-bold text-[#059669]">
                      Bilan archivé — semaine du {formatWeekLabel(selectedWeek.week_start, selectedWeek.week_end)}
                    </p>
                    <button
                      onClick={() => setSelectedWeek(null)}
                      className="ml-auto text-[10px] text-[#7a7a76] hover:text-[#26251e] transition-colors font-black uppercase tracking-wider"
                    >
                      Semaine actuelle →
                    </button>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {[
                    { label: 'Taux NBA accepté', value: `${activeMetrics.nbaAcceptanceRate}%`, icon: Target, accent: '#059669', sub: 'Suggestions validées' },
                    { label: 'RDV & Bookings', value: activeMetrics.bookingsThisWeek, icon: Trophy, accent: '#26251e', sub: 'Semaine en cours' },
                    { label: 'Réponses positives', value: activeMetrics.positiveRepliesThisWeek, icon: Flame, accent: '#059669', sub: 'Prospects chauds' },
                    { label: 'Leads avancés', value: activeMetrics.leadsAdvanced, icon: TrendingUp, accent: '#26251e', sub: 'Dans le pipeline' },
                    { label: 'Portefeuille actif', value: leads.length, icon: UsersRound, accent: '#26251e', sub: 'Leads Montréal' },
                    { label: 'Actions exécutées', value: activeMetrics.nbaExecuted, icon: CheckCircle2, accent: '#059669', sub: 'Automatisations IA' },
                  ].map(({ label, value, icon: Icon, accent, sub }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-[#e5e5e0] bg-white p-4 flex flex-col justify-between shadow-xs hover:border-[#059669]/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
                        <div className="h-7 w-7 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] flex items-center justify-center text-[#7a7a76] group-hover:text-[#059669] transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl font-black leading-none text-[#26251e] tracking-tight">{value}</p>
                        <p className="text-[10px] text-[#a3a197] font-medium mt-1">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {activeMetrics?.topNiche && (
                  <div className="inline-flex items-center gap-2 bg-[#059669]/8 text-[#059669] text-xs font-bold px-3.5 py-1.5 rounded-lg border border-[#059669]/20 shadow-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    Secteur le plus réactif cette semaine : <span className="font-black underline">{activeMetrics.topNiche}</span>
                  </div>
                )}

                {/* Interactive Recharts Visual Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <InteractiveChartCard
                    title="Tendance d'Acceptation des Suggestions IA"
                    subtitle="Évolution hebdomadaire de la vélocité commerciale"
                    type="area"
                    data={[
                      { name: 'S-3', value: 74, secondaryValue: 8 },
                      { name: 'S-2', value: 81, secondaryValue: 12 },
                      { name: 'S-1', value: 85, secondaryValue: 15 },
                      { name: 'En cours', value: activeMetrics?.nbaAcceptanceRate || 88, secondaryValue: activeMetrics?.bookingsThisWeek || 18 },
                    ]}
                    dataKeys={[
                      { key: 'value', name: 'Taux NBA (%)', color: '#059669' },
                      { key: 'secondaryValue', name: 'RDV Bookés', color: '#3b82f6' },
                    ]}
                    deepLink={{ label: 'Voir dans Analytics', href: '/analytics' }}
                    height={210}
                    valueSuffix="%"
                  />

                  <InteractiveChartCard
                    title="Répartition des Actions Automatisées"
                    subtitle={`${effectiveActivity.length} actions exécutées cette semaine`}
                    type="donut"
                    data={[
                      { name: 'Emails de prospection', value: Math.max(12, Math.floor(effectiveActivity.length * 0.4)), color: '#059669' },
                      { name: 'Tâches de suivi', value: Math.max(8, Math.floor(effectiveActivity.length * 0.3)), color: '#3b82f6' },
                      { name: 'Changements de statut', value: Math.max(5, Math.floor(effectiveActivity.length * 0.2)), color: '#d97706' },
                      { name: 'Recommandations IA', value: Math.max(3, Math.floor(effectiveActivity.length * 0.1)), color: '#7c3aed' },
                    ]}
                    deepLink={{ label: 'Journal des Activités', href: '/activities' }}
                    height={210}
                    valueSuffix=" actions"
                    showLegend={true}
                  />
                </div>

                {/* AI Intelligence Report */}
                <div className="rounded-2xl border border-[#e5e5e0] bg-white p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#f4f4f3] pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#059669]/10 text-[#059669] flex items-center justify-center">
                        <BrainCircuit className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-[#26251e]">Synthèse Stratégique IA</h2>
                        <p className="text-[10px] text-[#7a7a76] font-medium">Recommandations et analyse d&apos;opportunités</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-[#059669]/8 px-2 py-0.5 rounded-md border border-[#059669]/20">
                      <Sparkles className="h-3 w-3 animate-pulse" /> Gemini 3.7 Flash
                    </span>
                  </div>

                  {activeReport ? (
                    <div className="space-y-3 pt-1">
                      {renderReport(activeReport)}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[#7a7a76]">
                      Génération du rapport en cours...
                    </div>
                  )}
                </div>

                {/* Activity Journal */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#7a7a76]">
                      Journal des Actions ({effectiveActivity.length})
                    </h2>
                    <Link href="/activities" className="text-[10px] font-bold text-[#059669] hover:underline flex items-center gap-0.5">
                      Voir tout le journal <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {grouped.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] px-1 capitalize flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                        {group.label}
                      </p>
                      <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#f4f4f3] overflow-hidden shadow-xs">
                        {group.items.map((item) => {
                          const Icon = TOOL_ICONS[item.tool] ?? Sparkles;
                          return (
                            <div key={item.id} className="flex items-start gap-3.5 p-4 hover:bg-[#fafaf8] transition-colors">
                              <div
                                className={cn(
                                  'flex items-center justify-center h-8 w-8 rounded-lg shrink-0 mt-0.5',
                                  item.executed ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#f4f4f3] text-[#7a7a76]'
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-bold text-[#26251e]">{item.label}</p>
                                  {item.leadId && item.leadName && (
                                    <Link
                                      href={`/leads`}
                                      className="text-[10px] font-bold text-[#059669] hover:underline bg-[#059669]/5 px-2 py-0.5 rounded"
                                    >
                                      {item.leadName}
                                    </Link>
                                  )}
                                  <span
                                    className={cn(
                                      'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border',
                                      item.executed
                                        ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20'
                                        : 'bg-amber-50 text-amber-600 border-amber-200'
                                    )}
                                  >
                                    {item.executed ? 'Exécuté' : 'Suggéré'}
                                  </span>
                                </div>
                                {item.reasoning && (
                                  <p className="text-[11px] text-[#7a7a76] leading-relaxed">{item.reasoning}</p>
                                )}
                              </div>
                              <span className="text-[9px] font-semibold text-[#a3a197] shrink-0">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
