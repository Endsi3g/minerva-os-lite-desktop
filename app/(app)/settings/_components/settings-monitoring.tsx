'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import { Activity, Mail, MessageSquare, Bot, TrendingUp, RefreshCw, Loader2, ShieldAlert, ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonitoringStats {
  period_days: number;
  leads_created: number;
  replies_detected: number;
  emails_sent: number;
  emails_failed: number;
  sms_sent: number;
  agent_actions: number;
  ai_requests: number;
  ai_success_rate: number | null;
  sentry_configured: boolean;
}

export function SettingsMonitoring() {
  const { activeWorkspace } = useReach();
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/settings/monitoring?workspace_id=${activeWorkspace.id}`));
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Error loading monitoring stats:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => { load(); }, [load]);

  const statCards = [
    { label: 'Leads créés (7j)', value: stats?.leads_created ?? 0, icon: TrendingUp },
    { label: 'Réponses détectées (7j)', value: stats?.replies_detected ?? 0, icon: MessageSquare },
    { label: 'Emails envoyés (7j)', value: stats?.emails_sent ?? 0, icon: Mail },
    { label: 'Actions agent (7j)', value: stats?.agent_actions ?? 0, icon: Bot },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#26251e] flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#059669]" />
            Monitoring
          </h2>
          <p className="text-xs text-[#7a7a76] mt-0.5">Santé opérationnelle de l&apos;espace de travail — volumes réels des 7 derniers jours.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e5e0] bg-white px-3 py-1.5 text-xs font-semibold text-[#26251e] transition-colors hover:bg-[#f4f4f3] disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Sentry status */}
      <div className={cn(
        'rounded-xl border p-4 flex items-center justify-between gap-3',
        stats?.sentry_configured ? 'border-[#059669]/30 bg-[#059669]/5' : 'border-amber-200 bg-amber-50'
      )}>
        <div className="flex items-center gap-2.5">
          {stats?.sentry_configured ? (
            <ShieldCheck className="h-4 w-4 text-[#059669] shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="text-xs font-semibold text-[#26251e]">
              Suivi d&apos;erreurs (Sentry) {stats?.sentry_configured ? '— actif' : '— non configuré'}
            </p>
            <p className="text-[10px] text-[#7a7a76] mt-0.5">
              {stats?.sentry_configured
                ? 'Les erreurs serveur et client sont automatiquement remontées.'
                : 'Ajoutez NEXT_PUBLIC_SENTRY_DSN dans les variables d\'environnement pour activer le suivi d\'erreurs en temps réel.'}
            </p>
          </div>
        </div>
        {stats?.sentry_configured && (
          <a href="https://sentry.io" target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-[#059669] hover:underline">
            Ouvrir Sentry <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-[#e5e5e0] bg-white p-3">
              <div className="flex items-center gap-1.5 text-[#7a7a76]">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="mt-2 text-xl font-bold text-[#26251e]">{loading ? '—' : card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Delivery health */}
      <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e5e0]">
          <span className="text-xs font-bold text-[#26251e]">Délivrabilité & IA</span>
        </div>
        <div className="divide-y divide-[#e5e5e0]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold text-[#26251e]">Emails échoués (7j)</span>
            <span className={cn('text-xs font-bold', (stats?.emails_failed ?? 0) > 0 ? 'text-red-600' : 'text-[#059669]')}>
              {loading ? '—' : stats?.emails_failed ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold text-[#26251e]">SMS envoyés (7j)</span>
            <span className="text-xs font-bold text-[#26251e]">{loading ? '—' : stats?.sms_sent ?? 0}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold text-[#26251e]">Taux de succès IA (7j)</span>
            <span className="text-xs font-bold text-[#26251e]">
              {loading ? '—' : stats?.ai_success_rate != null ? `${stats.ai_success_rate}% (${stats.ai_requests} req.)` : 'Aucune donnée'}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-[#7a7a76]">
        Trafic et Core Web Vitals sont disponibles dans le dashboard Vercel (Analytics + Speed Insights, déjà actifs).
      </p>
    </div>
  );
}

export default SettingsMonitoring;
