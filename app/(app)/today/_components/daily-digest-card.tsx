'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, MessageSquare, Calendar, Zap, Plus, RefreshCw } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';

interface TodayStats {
  date: string;
  emails_sent: number;
  replies_received: number;
  agent_actions: number;
  appointments_created: number;
  leads_created: number;
  latest_actions: Array<{ action_type: string; reasoning: string | null; lead_id: string | null }>;
}

const ACTION_LABEL: Record<string, string> = {
  generate_email_draft: 'Brouillon email',
  create_task: 'Tâche créée',
  update_pipeline_stage: 'Pipeline mis à jour',
  enroll_in_sequence: 'Séquence inscrite',
  plan_field_route: 'Tournée planifiée',
};

export function DailyDigestCard() {
  const { activeWorkspace } = useReach();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/agent/today-stats?workspace_id=${activeWorkspace.id}`));
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const todayLabel = new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalActivity = stats ? stats.emails_sent + stats.replies_received + stats.agent_actions + stats.appointments_created : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3 animate-pulse">
        <div className="h-3 w-40 rounded bg-[#e5e5e0]" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg bg-[#e5e5e0]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-[#26251e]">Résumé d'aujourd'hui</p>
          <p className="text-[10px] text-[#7a7a76] capitalize">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {totalActivity > 0 && (
            <span className="text-[10px] font-bold text-[#059669] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-full">
              {totalActivity} actions
            </span>
          )}
          <button
            onClick={fetchStats}
            className="p-1 hover:bg-[#f4f4f3] rounded text-[#a3a197] hover:text-[#26251e] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCell icon={Mail} label="Emails envoyés" value={stats?.emails_sent ?? 0} color="#2563eb" />
        <StatCell icon={MessageSquare} label="Réponses reçues" value={stats?.replies_received ?? 0} color="#059669" />
        <StatCell icon={Calendar} label="RDV créés" value={stats?.appointments_created ?? 0} color="#7c3aed" />
        <StatCell icon={Zap} label="Actions agent" value={stats?.agent_actions ?? 0} color="#d97706" />
      </div>

      {/* Latest agent actions */}
      {stats?.latest_actions && stats.latest_actions.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-[#f4f4f3]">
          {stats.latest_actions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-[#059669] mt-1.5 shrink-0" />
              <p className="text-[10px] text-[#7a7a76] leading-relaxed">
                <span className="font-semibold text-[#555552]">{ACTION_LABEL[a.action_type] ?? a.action_type}</span>
                {a.reasoning && <span> — {a.reasoning.slice(0, 80)}{a.reasoning.length > 80 ? '…' : ''}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {totalActivity === 0 && !loading && (
        <p className="text-[11px] text-[#a3a197] text-center py-1">
          Aucune activité pour l'instant — l'agent opère toutes les 4h
        </p>
      )}

      {/* New lead count */}
      {(stats?.leads_created ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#7a7a76] border-t border-[#f4f4f3] pt-2">
          <Plus className="h-3 w-3 text-[#059669]" />
          <span>{stats!.leads_created} nouveau{stats!.leads_created > 1 ? 'x' : ''} lead{stats!.leads_created > 1 ? 's' : ''} ajouté{stats!.leads_created > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}

function StatCell({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] px-3 py-2">
      <div className="h-6 w-6 rounded flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <Icon className="h-3 w-3" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#26251e] leading-none">{value}</p>
        <p className="text-[9px] text-[#7a7a76] leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default DailyDigestCard;
