'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Loader2, Check, MapPin } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { LeadHeatBadge } from '@/components/lead-heat-badge';
import type { Lead } from '@/lib/mock-data';

const TEMP_ORDER: Record<Lead['temperature'], number> = { Hot: 0, Warm: 1, Cold: 2 };

/**
 * "Appels" landing page — pick prospects to call, then create a session
 * (a route_plans row with channel='call'). No map/route-optimization here
 * unlike Field: a phone session is just an ordered worklist.
 */
export function CallsRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const callableLeads = useMemo(() => {
    return leads
      .filter((l) => !!l.phone)
      .sort((a, b) => (TEMP_ORDER[a.temperature] ?? 1) - (TEMP_ORDER[b.temperature] ?? 1));
  }, [leads]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.size === 0 || !activeWorkspace) return;
    setCreating(true);
    try {
      const res = await fetch(getApiUrl('/api/route-plans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          lead_ids: Array.from(selected),
          channel: 'call',
        }),
      });
      const plan = await res.json();
      if (res.ok && plan?.id) {
        router.push(`/calls/${plan.id}`);
      }
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] font-sans text-[#26251e]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Phone className="h-5 w-5" /> Appels</h1>
          <p className="text-xs text-[#7a7a76] mt-1">
            Sélectionne les prospects à appeler — script IA, captures et notes en direct pendant l&apos;appel, même moteur que le terrain.
          </p>
        </div>

        <div className="border border-[#e5e5e0] rounded-xl bg-white divide-y divide-[#e5e5e0]">
          {callableLeads.length === 0 ? (
            <p className="text-xs text-[#7a7a76] p-5">Aucun prospect avec un numéro de téléphone pour l&apos;instant.</p>
          ) : (
            callableLeads.map((lead) => {
              const isSelected = selected.has(lead.id);
              return (
                <button
                  key={lead.id}
                  onClick={() => toggle(lead.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafaf8] transition-colors"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                      isSelected ? 'bg-[#059669] border-[#059669]' : 'border-[#e5e5e0]'
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{lead.businessName}</div>
                    <div className="flex items-center gap-2 text-[10px] text-[#7a7a76] mt-0.5">
                      {lead.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.city}</span>}
                      <span>{lead.phone}</span>
                    </div>
                  </div>
                  <LeadHeatBadge lead={lead} showScore={false} />
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={selected.size === 0 || creating}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#26251e] text-white font-bold text-sm disabled:opacity-50 hover:bg-[#3d3c35] transition-colors"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
          Créer une session d&apos;appels {selected.size > 0 ? `(${selected.size})` : ''}
        </button>
      </div>
    </div>
  );
}
