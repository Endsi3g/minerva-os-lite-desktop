'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Mail, ClipboardList, TrendingUp, MapPin, Brain, RefreshCw,
  ChevronRight, SkipForward, Loader2, CheckCircle2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface NextAction {
  id: string;
  action_type: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_city: string | null;
  reasoning: string | null;
  data_signals: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  generate_email_draft: { label: 'Rédiger un email de relance', icon: Mail, color: 'text-[#2563eb]' },
  create_task: { label: 'Créer une tâche de relance', icon: ClipboardList, color: 'text-[#7c3aed]' },
  update_pipeline_stage: { label: 'Mettre à jour le pipeline', icon: TrendingUp, color: 'text-[#059669]' },
  enroll_in_sequence: { label: 'Inscrire dans une séquence', icon: Zap, color: 'text-[#d97706]' },
  plan_field_route: { label: 'Planifier une visite terrain', icon: MapPin, color: 'text-[#dc2626]' },
  update_agent_memory: { label: 'Mémoriser un apprentissage', icon: Brain, color: 'text-[#6b7280]' },
};

export function NextBestActionCard() {
  const router = useRouter();
  const { activeWorkspace } = useReach();

  const [action, setAction] = useState<NextAction | null | undefined>(undefined); // undefined = loading
  const [executing, setExecuting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState<{ message: string; redirect: string | null } | null>(null);

  const fetchAction = useCallback(async () => {
    if (!activeWorkspace) return;
    setAction(undefined);
    setDone(null);
    setDismissed(false);
    try {
      const res = await fetch(getApiUrl(`/api/agent/next-action?workspace_id=${activeWorkspace.id}`));
      if (!res.ok) { setAction(null); return; }
      const data = await res.json();
      setAction(data.action ?? null);
    } catch {
      setAction(null);
    }
  }, [activeWorkspace]);

  useEffect(() => { fetchAction(); }, [fetchAction]);

  const handleExecute = async () => {
    if (!action || executing) return;
    setExecuting(true);
    try {
      const res = await fetch(getApiUrl('/api/agent/next-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: action.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setDone({ message: data.message ?? 'Action exécutée', redirect: data.redirect ?? null });
      toast.success(data.message ?? 'Action exécutée par Minerva');
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de l\'exécution');
    } finally {
      setExecuting(false);
    }
  };

  const handleDismiss = async () => {
    if (!action) return;
    setDismissed(true);
    try {
      await fetch(getApiUrl(`/api/agent/next-action?id=${action.id}`), { method: 'DELETE' });
    } catch { /* silent */ }
    setTimeout(() => fetchAction(), 300);
  };

  // Loading skeleton
  if (action === undefined) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3 animate-pulse">
        <div className="h-3 w-32 rounded bg-[#e5e5e0]" />
        <div className="h-4 w-48 rounded bg-[#e5e5e0]" />
        <div className="h-3 w-full rounded bg-[#e5e5e0]" />
        <div className="h-3 w-4/5 rounded bg-[#e5e5e0]" />
        <div className="flex gap-2">
          <div className="h-8 flex-1 rounded-lg bg-[#e5e5e0]" />
          <div className="h-8 w-20 rounded-lg bg-[#e5e5e0]" />
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
          <p className="text-sm font-semibold text-[#059669]">Action exécutée</p>
        </div>
        <p className="text-xs text-[#15803d]">{done.message}</p>
        <div className="flex gap-2">
          {done.redirect && (
            <button
              onClick={() => router.push(done.redirect!)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:underline"
            >
              Voir le résultat <ChevronRight className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={fetchAction}
            className="ml-auto flex items-center gap-1 text-xs text-[#7a7a76] hover:text-[#26251e]"
          >
            <RefreshCw className="h-3 w-3" /> Prochaine action
          </button>
        </div>
      </div>
    );
  }

  // No action available
  if (!action || dismissed) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-[#fafaf8] p-4 flex items-center gap-3">
        <div className="h-8 w-8 flex items-center justify-center rounded-md bg-[#059669]/10 text-[#059669] shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#26251e]">Aucune action en attente</p>
          <p className="text-[11px] text-[#7a7a76]">Lancez un cycle agent pour générer des recommandations</p>
        </div>
        <button
          onClick={fetchAction}
          className="shrink-0 p-1.5 hover:bg-[#e5e5e0] rounded-md text-[#7a7a76] hover:text-[#26251e] transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const meta = ACTION_META[action.action_type] ?? { label: action.action_type, icon: Zap, color: 'text-[#7a7a76]' };
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border-l-[3px] border-l-[#059669] border border-[#e5e5e0] bg-white p-4 space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-[#059669] fill-[#059669]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">
            Prochaine action
          </span>
        </div>
        <button
          onClick={fetchAction}
          className="p-1 hover:bg-[#f4f4f3] rounded text-[#a3a197] hover:text-[#26251e] transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Action type + lead */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} />
          <span className="text-sm font-semibold text-[#26251e]">{meta.label}</span>
        </div>
        {action.lead_name && (
          <p className="text-xs text-[#555552] pl-5">
            {action.lead_name}
            {action.lead_city && <span className="text-[#a3a197]"> — {action.lead_city}</span>}
          </p>
        )}
      </div>

      {/* Reasoning */}
      {action.reasoning && (
        <div className="rounded-lg bg-[#fafaf8] border border-[#e5e5e0] px-3 py-2">
          <p className="text-[11px] text-[#555552] leading-relaxed italic">
            &ldquo;{action.reasoning}&rdquo;
          </p>
        </div>
      )}

      {/* Data signals */}
      {action.data_signals && (
        <p className="text-[10px] text-[#7a7a76] flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0" />
          {action.data_signals}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleExecute}
          disabled={executing}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-60 px-3 py-2 text-xs font-bold text-white transition-colors"
        >
          {executing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> En cours…</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Exécuter</>
          )}
        </button>
        <button
          onClick={handleDismiss}
          disabled={executing}
          className="flex items-center gap-1 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] disabled:opacity-40 px-3 py-2 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] transition-colors"
        >
          <SkipForward className="h-3 w-3" /> Passer
        </button>
      </div>
    </div>
  );
}

export default NextBestActionCard;
