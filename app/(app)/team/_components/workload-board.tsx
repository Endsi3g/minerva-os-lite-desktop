'use client';

import React, { useEffect, useState } from 'react';
import { Users, Zap, AlertTriangle, CalendarCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';

interface MemberWorkload {
  userId: string;
  fullName: string;
  avatarBase64: string | null;
  role: string;
  assignedLeads: number;
  pendingNba: number;
  slaBreached: number;
  bookingsThisWeek: number;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[#e5e5e0]', className)} />;
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover border border-[#e5e5e0]" />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#e5e5e0] flex items-center justify-center text-xs font-black text-[#26251e] border border-[#e5e5e0] shrink-0">
      {initials}
    </div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  redIf,
  greenIf,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  redIf?: boolean;
  greenIf?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-[#7a7a76]">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <span
        className={cn(
          'font-bold tabular-nums',
          redIf ? 'text-red-600' : greenIf ? 'text-[#059669]' : 'text-[#26251e]'
        )}
      >
        {value}
      </span>
    </div>
  );
}

import { isValidUUID } from '@/lib/utils';

export function WorkloadBoard({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<MemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !isValidUUID(workspaceId)) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(getApiUrl(`/api/team/workload?workspace_id=${workspaceId}`))
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((d) => setMembers(d.members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[#7a7a76]">
        Aucun membre dans ce workspace.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
      {members.map((m) => {
        const capacityPct = Math.min(100, Math.round((m.assignedLeads / 25) * 100));
        const statusLabel = capacityPct > 80 ? 'Surchargé' : capacityPct > 50 ? 'Charge optimale' : 'Disponible';
        const statusColor = capacityPct > 80 ? 'text-red-700 bg-red-50 border-red-200' : capacityPct > 50 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-[#059669] bg-[#059669]/10 border-[#059669]/20';
        const barColor = capacityPct > 80 ? 'bg-red-500' : capacityPct > 50 ? 'bg-amber-500' : 'bg-[#059669]';

        return (
          <div key={m.userId} className="rounded-2xl border border-[#e5e5e0] bg-white p-5 space-y-4 shadow-xs hover:border-[#059669]/30 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={m.fullName} src={m.avatarBase64} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#26251e] truncate">{m.fullName}</p>
                  <span className="inline-block text-[9px] font-black uppercase tracking-wide text-[#7a7a76] bg-[#f4f4f3] border border-[#e5e5e0] rounded px-1.5 py-0.5 mt-0.5">
                    {m.role}
                  </span>
                </div>
              </div>
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', statusColor)}>
                {statusLabel} ({capacityPct}%)
              </span>
            </div>

            {/* Visual Capacity Bar */}
            <div className="space-y-1 bg-[#fafaf8] p-3 rounded-xl border border-[#e5e5e0]">
              <div className="flex justify-between text-[10px] font-bold text-[#7a7a76]">
                <span>Niveau de Capacité</span>
                <span className="text-[#26251e]">{m.assignedLeads} / 25 leads max</span>
              </div>
              <div className="w-full bg-[#e5e5e0] h-2 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-300', barColor)} style={{ width: `${capacityPct}%` }} />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <MetricRow icon={Users} label="Leads assignés" value={m.assignedLeads} />
              <MetricRow icon={Zap} label="Actions NBA à valider" value={m.pendingNba} redIf={m.pendingNba > 5} />
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#7a7a76]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>SLA dépassés</span>
                </div>
                {m.slaBreached === 0 ? (
                  <span className="font-bold text-[#059669]">Tout à jour</span>
                ) : (
                  <span className="font-bold text-red-600">{m.slaBreached}</span>
                )}
              </div>
              <MetricRow
                icon={CalendarCheck2}
                label="Bookings cette semaine"
                value={m.bookingsThisWeek}
                greenIf={m.bookingsThisWeek > 0}
              />
            </div>

            {m.slaBreached > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs font-bold text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {m.slaBreached} SLA dépassé{m.slaBreached > 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
