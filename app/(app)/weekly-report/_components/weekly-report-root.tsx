'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3, RefreshCw, Loader2, ArrowLeft, Mail, ListTodo,
  ArrowRightLeft, UsersRound, BrainCircuit, PauseCircle, PlayCircle, Tag,
  MessageSquare, Inbox, Lightbulb, Send, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { formatDistanceToNow } from 'date-fns';
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

function renderReport(text: string): React.ReactNode[] {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i} className="text-sm text-[#26251e] leading-relaxed">
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
      </p>
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

export function WeeklyReportRoot() {
  const { activeWorkspace } = useReach();

  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [reportError, setReportError] = useState(false);

  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [totals, setTotals] = useState<ActivityTotals | null>(null);

  const dateRange = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const fetchReport = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingReport(true);
    setReportError(false);
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
    } catch {
      setReportError(true);
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
      // Non-fatal — the AI report above still renders
    } finally {
      setLoadingActivity(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchReport();
    fetchActivity();
  }, [fetchReport, fetchActivity]);

  if (!activeWorkspace) return null;

  const grouped = groupByDay(activity);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/today" className="flex items-center justify-center h-9 w-9 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 text-[#26251e]" />
          </Link>
          <div>
            <h1 className="text-lg font-black text-[#26251e] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#059669]" />
              Bilan de la semaine
            </h1>
            <p className="text-xs text-[#7a7a76]">{dateRange}</p>
          </div>
        </div>
        <button
          onClick={() => { fetchReport(); fetchActivity(); }}
          disabled={loadingReport || loadingActivity}
          className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] disabled:opacity-50 px-3 py-2 text-xs font-bold text-[#26251e] transition-colors shrink-0"
        >
          {loadingReport || loadingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Actualiser
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'NBA accepté', value: metrics ? `${metrics.nbaAcceptanceRate}%` : '—', accent: metrics && metrics.nbaAcceptanceRate > 50 ? '#059669' : '#d97706' },
          { label: 'Bookings', value: metrics?.bookingsThisWeek ?? totals?.bookingsThisWeek ?? '—', accent: '#26251e' },
          { label: 'Réponses positives', value: metrics?.positiveRepliesThisWeek ?? totals?.positiveRepliesThisWeek ?? '—', accent: '#26251e' },
          { label: 'Leads avancés', value: metrics?.leadsAdvanced ?? '—', accent: '#26251e' },
          { label: 'Brouillons générés', value: totals?.draftsGenerated ?? '—', accent: '#26251e' },
          { label: 'Actions IA exécutées', value: totals?.actionsExecuted ?? '—', accent: '#059669' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl border border-[#e5e5e0] bg-white px-4 py-3 flex flex-col gap-1">
            <p className="text-2xl font-black leading-none" style={{ color: accent }}>{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
          </div>
        ))}
      </div>

      {metrics?.topNiche && (
        <span className="inline-flex items-center gap-1 bg-[#059669]/10 text-[#059669] text-xs font-bold px-2.5 py-1 rounded-full w-fit">
          Niche top de la semaine : {metrics.topNiche}
        </span>
      )}

      {/* Full AI report */}
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Rapport IA</h2>
        {loadingReport && !report && (
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 rounded bg-[#f4f4f3] animate-pulse" style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
        )}
        {reportError && !loadingReport && (
          <p className="text-xs text-[#7a7a76]">Rapport non disponible — vérifiez vos paramètres IA.</p>
        )}
        {report && <div className="space-y-1.5 pt-1">{renderReport(report)}</div>}
      </div>

      {/* Activity log */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] px-1">
          Journal complet des actions ({activity.length})
        </h2>

        {loadingActivity && activity.length === 0 && (
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-[#f4f4f3] animate-pulse" />)}
          </div>
        )}

        {!loadingActivity && activity.length === 0 && (
          <div className="rounded-xl border border-[#e5e5e0] bg-white p-5">
            <p className="text-xs text-[#7a7a76]">Aucune action enregistrée cette semaine.</p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] px-1 capitalize">{group.label}</p>
            <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#e5e5e0]">
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
    </div>
  );
}
