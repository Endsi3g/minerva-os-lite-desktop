'use client';

import React, { useState, useEffect } from 'react';
import { Mail, PhoneCall, TrendingUp, ListChecks, Zap, RotateCcw, RefreshCw, Bot } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';

interface AgentAction {
  id: string;
  action_type: string;
  lead_id: string | null;
  lead_name: string | null;
  reasoning: string | null;
  executed: boolean;
  approved: boolean | null;
  suggested: boolean;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  email_followup: Mail,
  switch_channel: PhoneCall,
  book_meeting: ListChecks,
  pipeline_nudge: TrendingUp,
  adjust_template: RotateCcw,
  nurture: Zap,
};

const ACTION_LABELS: Record<string, string> = {
  email_followup: 'Relance email',
  switch_channel: 'Changer canal',
  book_meeting: 'Booking RDV',
  pipeline_nudge: 'Relance pipeline',
  adjust_template: 'Ajuster template',
  nurture: 'Nurture',
};

const ACTION_TYPES = ['', 'email_followup', 'switch_channel', 'book_meeting', 'pipeline_nudge', 'adjust_template'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

function StatusBadge({ executed, approved }: { executed: boolean; approved: boolean | null }) {
  if (executed) return <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: '#dcfce7', color: '#059669' }}>Exécuté</span>;
  if (approved === false) return <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>Refusé</span>;
  if (approved === null) return <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: '#fef3c7', color: '#d97706' }}>En attente</span>;
  return <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: '#e5e5e0', color: '#7a7a76' }}>Suggéré</span>;
}

export function AgentJournal() {
  const { activeWorkspace } = useReach();
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function fetchActions(type: string) {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspace_id: activeWorkspace.id, limit: '50' });
      if (type) params.set('type', type);
      const res = await fetch(getApiUrl(`/api/agent/actions?${params}`));
      if (res.ok) {
        const json = await res.json();
        setActions(json.actions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchActions(filter); }, [activeWorkspace?.id, filter]);

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#e5e5e0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#05966915' }}>
            <Bot className="h-3.5 w-3.5" style={{ color: '#059669' }} />
          </div>
          <span className="text-sm font-black text-[#26251e]">Journal agent</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[11px] rounded-md border border-[#e5e5e0] bg-white px-2 py-1 text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669]"
          >
            <option value="">Tous les types</option>
            {ACTION_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t}>{ACTION_LABELS[t] ?? t}</option>
            ))}
          </select>
          <button onClick={() => fetchActions(filter)} className="p-1.5 rounded-lg hover:bg-[#f4f4f3] transition-colors">
            <RefreshCw className="h-3.5 w-3.5 text-[#7a7a76]" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
          <Bot className="h-8 w-8" style={{ color: '#e5e5e0' }} />
          <p className="text-sm font-bold text-[#26251e]">L'agent n'a encore exécuté aucune action</p>
          <p className="text-xs text-[#7a7a76]">Les actions NBA et les automations apparaîtront ici</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f4f4f3]">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.action_type] ?? Zap;
            return (
              <div key={action.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#fafaf8] transition-colors">
                <div
                  className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#05966915' }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: '#059669' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#26251e]">
                      {ACTION_LABELS[action.action_type] ?? action.action_type}
                    </span>
                    {action.lead_name && (
                      <span className="text-xs text-[#7a7a76]">— {action.lead_name}</span>
                    )}
                    <StatusBadge executed={action.executed} approved={action.approved} />
                  </div>
                  {action.reasoning && (
                    <p className="text-[11px] text-[#7a7a76] italic mt-0.5 line-clamp-2">{action.reasoning}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#a3a197] shrink-0 mt-0.5">{timeAgo(action.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
