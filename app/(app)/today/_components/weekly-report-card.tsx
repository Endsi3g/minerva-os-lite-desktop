'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';

interface WeeklyMetrics {
  nbaAcceptanceRate: number;
  nbaSuggested: number;
  nbaExecuted: number;
  bookingsThisWeek: number;
  positiveRepliesThisWeek: number;
  leadsAdvanced: number;
  topNiche: string | null;
}

function renderReport(text: string): React.ReactNode[] {
  return text.split('\n').filter(Boolean).map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i} className="text-xs text-[#26251e] leading-relaxed">
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
      </p>
    );
  });
}

export function WeeklyReportCard() {
  const { activeWorkspace } = useReach();
  const weekKey = new Date().toISOString().slice(0, 7);
  const cacheKey = `minerva_weekly_cache_${weekKey}`;

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const dateRange = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  const fetchReport = useCallback(async (force = false) => {
    if (!activeWorkspace) return;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { report: r, metrics: m } = JSON.parse(cached);
          setReport(r);
          setMetrics(m);
          return;
        } catch {}
      }
    }
    setLoading(true);
    setError(false);
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
      localStorage.setItem(cacheKey, JSON.stringify({ report: data.report, metrics: data.metrics }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, cacheKey]);

  useEffect(() => {
    fetchReport(false);
  }, [fetchReport]);

  if (!activeWorkspace) return null;

  const reportLines = report ? report.split('\n').filter(Boolean) : [];
  const previewLines = reportLines.slice(0, 2);
  const hasMore = reportLines.length > 2;

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#059669]" />
          <div>
            <p className="text-xs font-bold text-[#26251e]">Bilan de la semaine</p>
            <p className="text-[10px] text-[#7a7a76]">{dateRange}</p>
          </div>
        </div>
        <button
          onClick={() => fetchReport(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] hover:bg-[#f0f0ef] disabled:opacity-50 px-2.5 py-1.5 text-[10px] font-bold text-[#26251e] transition-colors shrink-0"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {report ? 'Actualiser' : 'Générer'}
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: 'NBA accepté',
              value: `${metrics.nbaAcceptanceRate}%`,
              accent: metrics.nbaAcceptanceRate > 50 ? '#059669' : '#d97706',
            },
            { label: 'Bookings', value: metrics.bookingsThisWeek, accent: '#26251e' },
            { label: 'Réponses positives', value: metrics.positiveRepliesThisWeek, accent: '#26251e' },
            { label: 'Leads avancés', value: metrics.leadsAdvanced, accent: '#26251e' },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className="rounded-lg border border-[#e5e5e0] bg-[#fafaf8] px-3 py-2 flex flex-col gap-0.5"
            >
              <p className="text-[18px] font-black leading-none" style={{ color: accent }}>
                {value}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {metrics?.topNiche && (
        <div>
          <span className="inline-flex items-center gap-1 bg-[#059669]/10 text-[#059669] text-[10px] font-bold px-2 py-0.5 rounded-full">
            Niche top de la semaine : {metrics.topNiche}
          </span>
        </div>
      )}

      {loading && !report && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 rounded bg-[#f4f4f3] animate-pulse" style={{ width: `${90 - i * 10}%` }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] px-3 py-2">
          <p className="text-[10px] text-[#7a7a76]">
            Rapport non disponible — vérifiez vos paramètres IA.
          </p>
          <button
            onClick={() => fetchReport(true)}
            className="text-[10px] font-bold text-[#059669] hover:text-[#047857] shrink-0 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-1.5">
          <div className={cn('space-y-1 overflow-hidden', !expanded && 'max-h-12')}>
            {(expanded ? renderReport(report) : renderReport(previewLines.join('\n')))}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[10px] font-bold text-[#059669] hover:text-[#047857] transition-colors mt-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Lire le bilan complet
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
