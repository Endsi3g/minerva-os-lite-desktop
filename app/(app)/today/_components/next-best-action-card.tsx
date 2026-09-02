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
  generate_email_draft: { label: 'Rédiger un email de relance', icon: Mail, color: 'text-blue-500' },
  create_task: { label: 'Créer une tâche de relance', icon: ClipboardList, color: 'text-purple-500' },
  update_pipeline_stage: { label: 'Mettre à jour le pipeline', icon: TrendingUp, color: 'text-brand-accent-emerald' },
  enroll_in_sequence: { label: 'Inscrire dans une séquence', icon: Zap, color: 'text-amber-500' },
  plan_field_route: { label: 'Planifier une visite terrain', icon: MapPin, color: 'text-destructive' },
  update_agent_memory: { label: 'Mémoriser un apprentissage', icon: Brain, color: 'text-muted-foreground' },
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
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 animate-pulse">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-7 flex-1 rounded-lg bg-muted" />
          <div className="h-7 w-20 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  // Success state
  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-accent-emerald shrink-0" />
          <p className="text-sm font-semibold text-brand-accent-emerald">Action exécutée</p>
        </div>
        <p className="text-xs text-foreground/80">{done.message}</p>
        <div className="flex gap-2">
          {done.redirect && (
            <button
              onClick={() => router.push(done.redirect!)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent-emerald hover:underline cursor-pointer"
            >
              Voir le résultat <ChevronRight className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={fetchAction}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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
      <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex items-center gap-3">
        <div className="h-7 w-7 flex items-center justify-center rounded-md bg-emerald-500/10 text-brand-accent-emerald shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Aucune action en attente</p>
          <p className="text-[11px] text-muted-foreground">Lancez un cycle agent pour générer des recommandations</p>
        </div>
        <button
          onClick={fetchAction}
          className="shrink-0 p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Rafraîchir"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const meta = ACTION_META[action.action_type] ?? { label: action.action_type, icon: Zap, color: 'text-muted-foreground' };
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border-l-[3px] border-l-brand-accent-emerald border border-border bg-card p-3.5 space-y-2.5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-brand-accent-emerald fill-brand-accent-emerald" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent-emerald">
            Prochaine action
          </span>
        </div>
        <button
          onClick={fetchAction}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Rafraîchir"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Action type + lead */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} />
          <span className="text-sm font-semibold text-foreground">{meta.label}</span>
        </div>
        {action.lead_name && (
          <p className="text-xs text-muted-foreground pl-5">
            {action.lead_name}
            {action.lead_city && <span className="opacity-70"> — {action.lead_city}</span>}
          </p>
        )}
      </div>

      {/* Reasoning */}
      {action.reasoning && (
        <div className="rounded-lg bg-muted/40 border border-border px-2.5 py-1.5">
          <p className="text-[11px] text-foreground/80 leading-relaxed italic">
            &ldquo;{action.reasoning}&rdquo;
          </p>
        </div>
      )}

      {/* Data signals */}
      {action.data_signals && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-accent-emerald shrink-0" />
          {action.data_signals}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          onClick={handleExecute}
          disabled={executing}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-accent-emerald hover:bg-brand-accent-emeraldHover disabled:opacity-60 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
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
          className="flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <SkipForward className="h-3 w-3" /> Passer
        </button>
      </div>
    </div>
  );
}

export default NextBestActionCard;
