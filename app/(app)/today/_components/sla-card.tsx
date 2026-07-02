'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface SlaItem {
  id: string;
  action_type: string;
  lead_name: string | null;
  sla_due_at: string;
  is_breached: boolean;
}

interface SlaData {
  breached: number;
  urgent: number;
  warning: number;
  top5: SlaItem[];
}

function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(abs / 3600000);
  if (hrs >= 1) return diff < 0 ? `en retard de ${hrs}h` : `dans ${hrs}h`;
  return diff < 0 ? `en retard de ${mins}min` : `dans ${mins}min`;
}

const ACTION_LABELS: Record<string, string> = {
  email_followup: 'Relance email',
  switch_channel: 'Changer canal',
  book_meeting: 'Booking RDV',
  pipeline_nudge: 'Relance pipeline',
  adjust_template: 'Ajuster template',
  nurture: 'Nurture',
};

export function SlaCard() {
  const { activeWorkspace } = useReach();
  const [data, setData] = useState<SlaData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSla() {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/team/sla?workspace_id=${activeWorkspace.id}`));
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSla(); }, [activeWorkspace?.id]);

  async function markResolved(actionId: string) {
    try {
      await fetch(getApiUrl('/api/nba/score'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action_id: actionId, executed: true }) });
      toast.success('Action marquée comme résolue');
      fetchSla();
    } catch {
      toast.error('Erreur lors de la résolution');
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-3">
        <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-neutral-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data || (data.breached === 0 && data.urgent === 0 && data.warning === 0)) {
    return (
      <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#05966915' }}>
          <CheckCircle2 className="h-4 w-4" style={{ color: '#059669' }} />
        </div>
        <div>
          <p className="text-sm font-bold text-[#26251e]">SLA — Tout est à jour</p>
          <p className="text-xs text-[#7a7a76]">Aucune action en retard</p>
        </div>
        <button onClick={fetchSla} className="ml-auto p-1.5 rounded-lg hover:bg-[#f4f4f3] transition-colors">
          <RefreshCw className="h-3.5 w-3.5 text-[#7a7a76]" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#dc262615' }}>
            <Clock className="h-3.5 w-3.5" style={{ color: '#dc2626' }} />
          </div>
          <span className="text-sm font-black text-[#26251e]">SLA — Actions en attente</span>
        </div>
        <button onClick={fetchSla} className="p-1.5 rounded-lg hover:bg-[#f4f4f3] transition-colors">
          <RefreshCw className="h-3.5 w-3.5 text-[#7a7a76]" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'En retard', count: data.breached, color: '#dc2626', bg: '#fee2e2' },
          { label: 'Urgent (< 2h)', count: data.urgent, color: '#d97706', bg: '#fef3c7' },
          { label: 'Attention (< 24h)', count: data.warning, color: '#059669', bg: '#dcfce7' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: bg }}>
            <p className="text-xl font-black" style={{ color }}>{count}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {data.top5.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.top5.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e5e0] px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: item.is_breached ? '#dc2626' : '#d97706' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#26251e] truncate">
                    {ACTION_LABELS[item.action_type] ?? item.action_type}
                    {item.lead_name && <span className="font-normal text-[#7a7a76]"> — {item.lead_name}</span>}
                  </p>
                  <p
                    className="text-[10px] font-semibold"
                    style={{ color: item.is_breached ? '#dc2626' : '#d97706' }}
                  >
                    {relativeTime(item.sla_due_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => markResolved(item.id)}
                className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition-colors"
                style={{ background: '#05966915', color: '#059669' }}
              >
                Résolu
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
