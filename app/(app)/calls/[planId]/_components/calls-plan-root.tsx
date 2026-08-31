'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, ChevronRight, Loader2, PartyPopper, AlertCircle } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { LeadHeatBadge } from '@/components/lead-heat-badge';

type CallOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';
interface CallLog { leadId: string; outcome: CallOutcome; visitedAt: string; }
interface RoutePlan { id: string; lead_ids: string; status: string; created_at: string; channel?: string; }

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
        if (plan) {
          const ids: string[] = JSON.parse(plan.lead_ids || '[]');
          setOrderedLeads(ids.map((id) => leads.find((l) => l.id === id)).filter(Boolean) as typeof leads);
        }
      })
      .catch(console.error)
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
          l[row.lead_id as string] = { leadId: row.lead_id, outcome: row.outcome, visitedAt: row.visited_at };
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
