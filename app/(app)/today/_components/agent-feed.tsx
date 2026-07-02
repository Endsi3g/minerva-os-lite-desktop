'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Zap, Mail, Database, Tag, Activity, RefreshCw, Bot,
  CheckSquare, GitBranch, FileText, List, Route,
  ChevronDown, ChevronUp, Check, X, Play, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';

// ── Types ────────────────────────────────────────────────────────────────────

interface NotifItem {
  kind: 'notif';
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
}

interface AgentActionItem {
  kind: 'agent';
  id: string;
  action_type: string;
  lead_id: string | null;
  reasoning: string | null;
  data_signals: string | null;
  result: Record<string, unknown> | null;
  autonomy_level: string;
  executed: boolean;
  suggested: boolean;
  approved: boolean | null;
  created_at: string;
  lead_name?: string;
  lead_company?: string;
}

type FeedItem = NotifItem | AgentActionItem;

// ── Config ───────────────────────────────────────────────────────────────────

const NOTIF_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  scraping_done: { icon: Database, color: '#059669' },
  email_sent:    { icon: Mail, color: '#2563eb' },
  info:          { icon: Tag, color: '#7c3aed' },
  report:        { icon: Activity, color: '#d97706' },
  digest:        { icon: Bot, color: '#059669' },
};

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  create_task:          { icon: CheckSquare, color: '#059669', label: 'Tâche créée' },
  update_pipeline_stage:{ icon: GitBranch,  color: '#2563eb', label: 'Pipeline mis à jour' },
  generate_email_draft: { icon: FileText,   color: '#7c3aed', label: 'Brouillon rédigé' },
  enroll_in_sequence:   { icon: List,       color: '#d97706', label: 'Séquence enrôlée' },
  plan_field_route:     { icon: Route,      color: '#059669', label: 'Tournée planifiée' },
  summarize_pipeline:   { icon: Activity,   color: '#7c3aed', label: 'Pipeline résumé' },
  update_agent_memory:  { icon: Sparkles,   color: '#059669', label: 'Mémoire mise à jour' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

// ── AgentActionCard ───────────────────────────────────────────────────────────

function AgentActionCard({ item, onApprove, onReject }: {
  item: AgentActionItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const conf = ACTION_CONFIG[item.action_type] ?? { icon: Bot, color: '#7a7a76', label: item.action_type };
  const Icon = conf.icon;

  const statusBadge = item.executed
    ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f0fdf4] text-[#059669] border border-[#bbf7d0]">Exécuté</span>
    : item.approved === false
    ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">Rejeté</span>
    : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#fefce8] text-[#92400e] border border-[#fde68a]">Suggéré</span>;

  const leadLabel = item.lead_name
    ? `${item.lead_name}${item.lead_company ? ` · ${item.lead_company}` : ''}`
    : null;

  return (
    <div className="px-4 py-3 hover:bg-[#fafaf8] transition-colors">
      <div className="flex items-start gap-3">
        {/* icon */}
        <div
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${conf.color}18` }}
        >
          <Icon className="h-3 w-3" style={{ color: conf.color }} />
        </div>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-[#26251e] leading-snug">{conf.label}</p>
            {statusBadge}
          </div>

          {leadLabel && (
            <p className="text-[10px] text-[#059669] font-semibold mt-0.5 truncate">{leadLabel}</p>
          )}

          {/* reasoning — toujours visible */}
          {item.reasoning && (
            <p className="text-[10px] text-[#26251e] mt-1 leading-relaxed line-clamp-2">{item.reasoning}</p>
          )}

          {/* expand toggle */}
          {(item.data_signals || item.result) && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 mt-1 text-[9px] font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
            >
              {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              {expanded ? 'Masquer les détails' : 'Voir les signaux'}
            </button>
          )}

          {/* expanded: data_signals + result */}
          {expanded && (
            <div className="mt-2 space-y-1.5">
              {item.data_signals && (
                <div className="rounded-lg bg-[#f4f4f3] px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#7a7a76] mb-1">Signaux utilisés</p>
                  <p className="text-[10px] text-[#26251e] leading-relaxed">{item.data_signals}</p>
                </div>
              )}
              {item.result && Object.keys(item.result).length > 0 && (
                <div className="rounded-lg bg-[#f4f4f3] px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#7a7a76] mb-1">Résultat</p>
                  <pre className="text-[9px] text-[#26251e] font-mono whitespace-pre-wrap overflow-x-auto">{JSON.stringify(item.result, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* approve / reject — only if suggested and not yet reviewed */}
          {!item.executed && item.approved === null && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onApprove(item.id)}
                className="flex items-center gap-1 h-6 px-2.5 rounded-lg bg-[#059669] text-white text-[9px] font-bold hover:bg-[#047857] transition-colors"
              >
                <Check className="h-2.5 w-2.5" />Approuver
              </button>
              <button
                onClick={() => onReject(item.id)}
                className="flex items-center gap-1 h-6 px-2.5 rounded-lg border border-[#e5e5e0] text-[#7a7a76] text-[9px] font-bold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
              >
                <X className="h-2.5 w-2.5" />Rejeter
              </button>
            </div>
          )}
        </div>

        <span className="text-[9px] text-[#7a7a76] shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
      </div>
    </div>
  );
}

// ── AgentFeed ─────────────────────────────────────────────────────────────────

export function AgentFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningLoop, setRunningLoop] = useState(false);
  const [loopError, setLoopError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'agent' | 'notif'>('all');

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const workspaceId = localStorage.getItem('minerva_active_workspace_id');

    const [{ data: notifs }, actionsResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, body, link, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15),
      workspaceId
        ? supabase
            .from('agent_actions')
            .select('id, action_type, lead_id, reasoning, data_signals, result, autonomy_level, executed, suggested, approved, created_at, leads(business_name, niche)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(15)
        : Promise.resolve({ data: [], error: null }),
    ]);
    // Detect missing table (migration not run yet)
    if ((actionsResult as any).error?.code === '42P01') {
      setTableMissing(true);
    }
    const { data: actions } = actionsResult;

    const notifItems: NotifItem[] = (notifs ?? []).map((n: any) => ({ kind: 'notif' as const, ...n }));
    const actionItems: AgentActionItem[] = (actions ?? []).map((a: any) => ({
      kind: 'agent' as const,
      id: a.id,
      action_type: a.action_type,
      lead_id: a.lead_id,
      reasoning: a.reasoning,
      data_signals: a.data_signals,
      result: a.result,
      autonomy_level: a.autonomy_level,
      executed: a.executed,
      suggested: a.suggested,
      approved: a.approved,
      created_at: a.created_at,
      lead_name: (a.leads as any)?.business_name,
      lead_company: (a.leads as any)?.niche,
    }));

    const merged: FeedItem[] = [...notifItems, ...actionItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setItems(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); const interval = setInterval(load, 30_000); return () => clearInterval(interval); }, [load]);

  const handleApprove = async (id: string) => {
    const supabase = createClient();
    await supabase.from('agent_actions').update({ approved: true }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id && i.kind === 'agent' ? { ...i, approved: true } : i));
  };

  const handleReject = async (id: string) => {
    const supabase = createClient();
    await supabase.from('agent_actions').update({ approved: false }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id && i.kind === 'agent' ? { ...i, approved: false } : i));
  };

  const handleRunLoop = async () => {
    setRunningLoop(true);
    setLoopError(null);
    try {
      const res = await fetch(getApiUrl('/api/agent/loop'), { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
        setLoopError(err.error || 'Erreur lors du cycle agent');
      }
      await load();
    } catch {
      setLoopError('Impossible de joindre l\'agent. Vérifiez votre connexion.');
    } finally {
      setRunningLoop(false);
    }
  };

  const filtered = items.filter(i => {
    if (filter === 'agent') return i.kind === 'agent';
    if (filter === 'notif') return i.kind === 'notif';
    return true;
  });

  const agentCount = items.filter(i => i.kind === 'agent').length;
  const pendingCount = items.filter(i => i.kind === 'agent' && !i.executed && (i as AgentActionItem).approved === null).length;

  if (loading) return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-12 bg-[#f4f4f3] rounded animate-pulse" />)}
    </div>
  );

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e0]">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#059669]" />
          <span className="text-xs font-bold text-[#26251e]">Agent Feed</span>
          {pendingCount > 0 && (
            <span className="text-[9px] font-bold bg-[#fefce8] text-[#92400e] border border-[#fde68a] px-1.5 py-0.5 rounded-full">
              {pendingCount} en attente
            </span>
          )}
          {agentCount > 0 && pendingCount === 0 && (
            <span className="text-[9px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRunLoop}
            disabled={runningLoop}
            title="Lancer un cycle agent"
            className={cn(
              "flex items-center gap-1 h-6 px-2 rounded-lg text-[9px] font-bold border transition-all",
              runningLoop
                ? "border-[#e5e5e0] text-[#7a7a76] opacity-50 cursor-not-allowed"
                : "border-[#059669]/30 text-[#059669] hover:bg-[#059669]/5"
            )}
          >
            <Play className="h-2.5 w-2.5" />
            {runningLoop ? 'En cours…' : 'Lancer'}
          </button>
          <button onClick={load} className="text-[#7a7a76] hover:text-[#26251e] transition-colors p-1">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#e5e5e0] bg-[#fafaf8]">
          {(['all', 'agent', 'notif'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "text-[9px] font-bold px-2 py-1 rounded-lg transition-all",
                filter === f
                  ? "bg-[#26251e] text-white"
                  : "text-[#7a7a76] hover:text-[#26251e]"
              )}
            >
              {f === 'all' ? 'Tout' : f === 'agent' ? 'Agent' : 'Système'}
            </button>
          ))}
        </div>
      )}

      {/* Migration warning */}
      {tableMissing && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
          <p className="font-bold mb-0.5">⚠️ Migration requise</p>
          <p>La table <code>agent_actions</code> n'existe pas encore. Exécutez <code>supabase_migration_v10_ensure_agent_tables.sql</code> dans votre projet Supabase pour activer l'agent.</p>
        </div>
      )}

      {/* Loop error */}
      {loopError && (
        <div className="mx-4 mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-700 font-medium">
          {loopError}
        </div>
      )}

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <Bot className="h-6 w-6 text-[#e5e5e0] mx-auto mb-2" />
          <p className="text-xs text-[#7a7a76]">Aucune activité récente.</p>
          <p className="text-[10px] text-[#7a7a76] mt-1">L'agent analyse votre pipeline et propose des actions. Configurez son autonomie dans Paramètres → Agent.</p>
          <button
            onClick={handleRunLoop}
            disabled={runningLoop}
            className="mt-3 text-[10px] font-bold text-[#059669] hover:underline disabled:opacity-50"
          >
            {runningLoop ? 'En cours…' : 'Lancer l\'agent maintenant →'}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#e5e5e0] max-h-[420px] overflow-y-auto">
          {filtered.map(item => {
            if (item.kind === 'agent') {
              return (
                <AgentActionCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              );
            }
            // Notification item
            const conf = NOTIF_CONFIG[item.type] || { icon: Activity, color: '#7a7a76' };
            const Icon = conf.icon;
            const inner = (
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-[#fafaf8] transition-colors">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${conf.color}18` }}>
                  <Icon className="h-3 w-3" style={{ color: conf.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#26251e] leading-snug">{item.title}</p>
                  {item.body && <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-1">{item.body}</p>}
                </div>
                <span className="text-[9px] text-[#7a7a76] shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
              </div>
            );
            return item.link
              ? <Link key={item.id} href={item.link}>{inner}</Link>
              : <div key={item.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
