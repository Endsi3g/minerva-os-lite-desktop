'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, ChevronRight, Loader2, PartyPopper, AlertCircle, CalendarCheck2, Percent, Timer } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { LeadHeatBadge } from '@/components/lead-heat-badge';

type CallOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';
interface CallLog { leadId: string; outcome: CallOutcome; visitedAt: string; callDurationSeconds: number | null; }
interface RoutePlan { id: string; lead_ids: string; status: string; created_at: string; channel?: string; }

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const OUTCOME_BADGE: Record<CallOutcome, { label: string; classes: string }> = {
  visited: { label: 'Joint', classes: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20' },
  absent: { label: 'Pas de réponse', classes: 'text-amber-600 bg-amber-50 border-amber-200' },
  meeting_booked: { label: 'RDV pris', classes: 'text-blue-600 bg-blue-50 border-blue-200' },
  not_interested: { label: 'Non intéressé', classes: 'text-red-500 bg-red-50 border-red-200' },
};

export function CallsPlanRoot({ planId }: { planId: string }) {
  const router = useRouter();
  const { leads } = useReach();
  const [orderedLeads, setOrderedLeads] = useState<typeof leads>([]);
  const [logs, setLogs] = useState<Record<string, CallLog>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl(`/api/route-plans?id=${planId}`))
      .then((r) => r.json())
      .then((data) => {
        const plan: RoutePlan = Array.isArray(data) ? data[0] : data;
        if (plan && plan.lead_ids) {
          const ids: string[] = typeof plan.lead_ids === 'string' ? JSON.parse(plan.lead_ids || '[]') : (plan.lead_ids || []);
          const found = ids.map((id) => leads.find((l) => l.id === id)).filter(Boolean) as typeof leads;
          if (found.length > 0) {
            setOrderedLeads(found);
            return;
          }
        }
        // Fallback to local storage
        if (typeof window !== 'undefined') {
          const localIds = sessionStorage.getItem(`calls_session_${planId}`);
          if (localIds) {
            const ids: string[] = JSON.parse(localIds);
            setOrderedLeads(ids.map((id) => leads.find((l) => l.id === id)).filter(Boolean) as typeof leads);
          }
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          const localIds = sessionStorage.getItem(`calls_session_${planId}`);
          if (localIds) {
            const ids: string[] = JSON.parse(localIds);
            setOrderedLeads(ids.map((id) => leads.find((l) => l.id === id)).filter(Boolean) as typeof leads);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [planId, leads]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('field_visits')
      .select('*')
      .eq('route_plan_id', planId)
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return;
        const l: Record<string, CallLog> = {};
        for (const row of data) {
          l[row.lead_id as string] = {
            leadId: row.lead_id,
            outcome: row.outcome,
            visitedAt: row.visited_at,
            callDurationSeconds: typeof row.call_duration_seconds === 'number' ? row.call_duration_seconds : null,
          };
        }
        setLogs(l);
      })
      .catch(() => {});
  }, [planId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[#7a7a76]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (orderedLeads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[#7a7a76]">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">Session d&apos;appels introuvable.</span>
      </div>
    );
  }

  const doneCount = Object.keys(logs).length;
  const allDone = doneCount === orderedLeads.length;

  const logValues = Object.values(logs);
  const connected = logValues.filter((l) => l.outcome !== 'absent').length;
  const meetingsBooked = logValues.filter((l) => l.outcome === 'meeting_booked').length;
  const durations = logValues.map((l) => l.callDurationSeconds).filter((d): d is number => typeof d === 'number' && d > 0);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const connectRate = doneCount > 0 ? Math.round((connected / doneCount) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] font-sans text-[#26251e]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/calls')} className="p-2 rounded-xl border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Phone className="h-5 w-5" /> Session d&apos;appels</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">{doneCount}/{orderedLeads.length} traités</p>
          </div>
        </div>

        {allDone && (
          <div className="flex items-center gap-2 rounded-xl border border-[#059669]/20 bg-[#059669]/10 text-[#059669] px-4 py-3 text-sm font-bold">
            <PartyPopper className="h-4 w-4" /> Session terminée !
          </div>
        )}

        {doneCount > 0 && (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                <Percent className="h-3 w-3" /> Contact
              </div>
              <p className="text-base font-black tabular-nums text-[#26251e]">{connectRate}%</p>
            </div>
            <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                <CalendarCheck2 className="h-3 w-3" /> RDV pris
              </div>
              <p className="text-base font-black tabular-nums text-[#26251e]">{meetingsBooked}</p>
            </div>
            <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                <Timer className="h-3 w-3" /> Durée moy.
              </div>
              <p className="text-base font-black tabular-nums text-[#26251e]">{formatDuration(avgDuration)}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {orderedLeads.map((lead, i) => {
            const log = logs[lead.id];
            const badge = log ? OUTCOME_BADGE[log.outcome] : null;
            return (
              <button
                key={lead.id}
                onClick={() => router.push(`/calls/${planId}/${log ? 'outcome' : 'prepare'}/${lead.id}`)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all bg-white',
                  log ? 'border-[#e5e5e0] opacity-70' : 'border-[#e5e5e0] hover:border-[#059669]'
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4f4f3] text-[10px] font-bold text-[#7a7a76]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{lead.businessName}</div>
                  <div className="text-[10px] text-[#7a7a76]">{lead.phone}</div>
                </div>
                {badge ? (
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-lg border', badge.classes)}>{badge.label}</span>
                ) : (
                  <LeadHeatBadge lead={lead} showScore={false} />
                )}
                <ChevronRight className="h-4 w-4 text-[#c9c9c3]" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
