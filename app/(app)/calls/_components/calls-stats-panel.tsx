'use client';

import React, { useEffect, useState } from 'react';
import {
  PhoneCall, PhoneMissed, CalendarCheck2, Timer, Flame, ThumbsDown,
  Percent, Trophy, Loader2, BarChart3,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';

type Period = 'today' | '7d' | '30d' | 'all';

const PERIOD_LABEL: Record<Period, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
  all: 'Tout',
};

interface Totals {
  totalCalls: number;
  connected: number;
  connectRate: number;
  meetingsBooked: number;
  meetingRate: number;
  closeRate: number;
  notInterested: number;
  absent: number;
  visitedOnly: number;
  hotLeads: number;
  avgDurationSeconds: number;
  totalDurationSeconds: number;
}

interface DailyPoint { date: string; count: number; connected: number; }

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarBase64: string | null;
  totalCalls: number;
  connected: number;
  meetingsBooked: number;
  connectRate: number;
  avgDurationSeconds: number;
}

interface StatsResponse {
  totals: Totals;
  daily: DailyPoint[];
  leaderboard: LeaderboardEntry[];
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 space-y-1.5">
      <div className={cn('flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider', accent ? 'text-[#059669]' : 'text-[#7a7a76]')}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-black tabular-nums text-[#26251e]">{value}</span>
        {sub && <span className="text-[10px] text-[#7a7a76]">{sub}</span>}
      </div>
    </div>
  );
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="h-7 w-7 rounded-full object-cover border border-[#e5e5e0] shrink-0" />;
  }
  return (
    <div className="h-7 w-7 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center text-[9px] font-black text-[#26251e] shrink-0">
      {initials}
    </div>
  );
}

export function CallsStatsPanel({ workspaceId }: { workspaceId: string }) {
  const [period, setPeriod] = useState<Period>('7d');
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    setLoading(true);
    fetch(getApiUrl(`/api/calls/stats?workspace_id=${workspaceId}&period=${period}`))
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId, period]);

  const totals = data?.totals;
  const daily = data?.daily ?? [];
  const leaderboard = data?.leaderboard ?? [];
  const maxDaily = Math.max(1, ...daily.map((d) => d.count));

  return (
    <div className="border border-[#e5e5e0] rounded-xl bg-[#fafaf8] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-bold text-[#26251e]">
          <BarChart3 className="h-3.5 w-3.5 text-[#059669]" />
          Performance des appels
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#e5e5e0] bg-white p-0.5">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors',
                period === p ? 'bg-[#059669] text-white' : 'text-[#7a7a76] hover:bg-[#f4f4f3]'
              )}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-[#7a7a76]">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : !totals || totals.totalCalls === 0 ? (
        <p className="text-xs text-[#7a7a76] py-4 text-center">Aucun appel enregistré sur cette période.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Kpi icon={PhoneCall} label="Appels" value={String(totals.totalCalls)} accent />
            <Kpi icon={Percent} label="Taux de contact" value={`${totals.connectRate}%`} sub={`${totals.connected} joints`} />
            <Kpi icon={CalendarCheck2} label="RDV pris" value={String(totals.meetingsBooked)} sub={`${totals.meetingRate}% du total`} />
            <Kpi icon={Timer} label="Durée moyenne" value={formatDuration(totals.avgDurationSeconds)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Kpi icon={Flame} label="Leads chauds" value={String(totals.hotLeads)} />
            <Kpi icon={PhoneMissed} label="Pas de réponse" value={String(totals.absent)} />
            <Kpi icon={ThumbsDown} label="Non intéressés" value={String(totals.notInterested)} />
            <Kpi icon={Percent} label="Taux de closing" value={`${totals.closeRate}%`} sub="RDV / joints" />
          </div>

          {daily.length > 1 && (
            <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Volume par jour</p>
              <div className="flex items-end gap-1 h-16">
                {daily.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                    <div className="w-full flex flex-col justify-end h-12 gap-px">
                      <div
                        className="w-full rounded-t bg-[#059669]"
                        style={{ height: `${Math.max(6, (d.count / maxDaily) * 100)}%` }}
                        title={`${d.date} · ${d.count} appel${d.count > 1 ? 's' : ''} (${d.connected} joints)`}
                      />
                    </div>
                    <span className="text-[8px] text-[#7a7a76] tabular-nums">
                      {new Date(d.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {leaderboard.length > 0 && (
            <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#e5e5e0]">
              <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                <Trophy className="h-3 w-3" />
                Classement équipe
              </div>
              {leaderboard.map((m, i) => (
                <div key={m.userId} className="flex items-center gap-2.5 px-3 py-2">
                  <span className="text-[10px] font-black text-[#c9c9c3] w-3 shrink-0">{i + 1}</span>
                  <Avatar name={m.fullName} src={m.avatarBase64} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#26251e] truncate">{m.fullName}</p>
                    <p className="text-[9px] text-[#7a7a76]">
                      {m.totalCalls} appel{m.totalCalls > 1 ? 's' : ''} · {m.connectRate}% contact · {m.meetingsBooked} RDV
                    </p>
                  </div>
                  {m.avgDurationSeconds > 0 && (
                    <span className="text-[9px] font-bold text-[#7a7a76] tabular-nums shrink-0">{formatDuration(m.avgDurationSeconds)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
