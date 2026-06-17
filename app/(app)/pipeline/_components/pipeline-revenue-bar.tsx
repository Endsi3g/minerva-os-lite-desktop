'use client';

import { useMemo } from 'react';
import { DollarSign, TrendingUp, CheckCircle2, LayoutGrid } from 'lucide-react';
import type { Lead } from '@/lib/mock-data';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'New':            { color: '#a8a29e', label: 'Nouveau' },
  'Contacted':      { color: '#3b82f6', label: 'Contacté' },
  'Meeting Booked': { color: '#f59e0b', label: 'RDV fixé' },
  'Won':            { color: '#059669', label: 'Gagné' },
};

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M $`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k $`;
  return `${Math.round(n)} $`;
}

interface PipelineRevenueBarProps {
  leads: Lead[];
}

export function PipelineRevenueBar({ leads }: PipelineRevenueBarProps) {
  const stats = useMemo(() => {
    const active = leads.filter(l => (l.dealAmount ?? 0) > 0 && l.status !== 'Lost');
    const won    = leads.filter(l => (l.dealAmount ?? 0) > 0 && l.status === 'Won');

    const pipeline = active.reduce((s, l) => s + (l.dealAmount ?? 0), 0);
    const forecast  = active.reduce((s, l) => s + (l.dealAmount ?? 0) * ((l.dealProbability ?? 50) / 100), 0);
    const wonTotal  = won.reduce((s, l) => s + (l.dealAmount ?? 0), 0);

    const byStatus: Record<string, number> = {};
    for (const l of active) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + (l.dealAmount ?? 0);
    }

    return { pipeline, forecast, wonTotal, count: active.length, byStatus };
  }, [leads]);

  if (stats.count === 0) return null;

  const barTotal = stats.pipeline || 1;

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white px-5 py-3.5 shadow-sm shrink-0">
      {/* KPI row */}
      <div className="flex flex-wrap gap-5 mb-3">
        <KpiChip
          icon={<DollarSign className="h-3.5 w-3.5" />}
          iconBg="bg-[#f54e00]/10 text-[#f54e00]"
          label="Pipeline brut"
          value={formatAmount(stats.pipeline)}
        />
        <KpiChip
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          iconBg="bg-[#3b82f6]/10 text-[#3b82f6]"
          label="Forecast pondéré"
          value={formatAmount(stats.forecast)}
        />
        <KpiChip
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          iconBg="bg-[#059669]/10 text-[#059669]"
          label="Deals gagnés"
          value={formatAmount(stats.wonTotal)}
        />
        <KpiChip
          icon={<LayoutGrid className="h-3.5 w-3.5" />}
          iconBg="bg-[#f59e0b]/10 text-[#f59e0b]"
          label="Deals actifs"
          value={String(stats.count)}
        />
      </div>

      {/* Stacked progress bar */}
      <div className="space-y-1.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#f4f4f3]">
          {Object.entries(stats.byStatus).map(([status, amount]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            return (
              <div
                key={status}
                style={{ width: `${(amount / barTotal) * 100}%`, backgroundColor: cfg.color }}
                title={`${cfg.label} — ${formatAmount(amount)}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.byStatus).map(([status, amount]) => {
            const cfg = STATUS_CONFIG[status];
            if (!cfg) return null;
            return (
              <div key={status} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                <span className="text-[10px] text-[#78716c] font-medium">{cfg.label} — {formatAmount(amount)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiChip({ icon, iconBg, label, value }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#a8a29e] uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className="text-base font-bold text-[#26251e] leading-tight">{value}</p>
      </div>
    </div>
  );
}
