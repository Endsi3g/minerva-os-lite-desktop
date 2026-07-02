'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, X, Mail, Bot, ChevronDown, ChevronUp,
  Clock, AlertCircle, RefreshCw, Inbox, FileText, Zap,
  Check,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApprovalDraft {
  id: string;
  lead_id: string | null;
  subject: string;
  body: string;
  intent_type: string | null;
  source: string;
  created_at: string;
  leads: { id: string; business_name: string; niche: string } | null;
}

interface ApprovalAction {
  id: string;
  action_type: string;
  lead_id: string | null;
  reasoning: string | null;
  data_signals: string | null;
  result: Record<string, unknown> | null;
  autonomy_level: string;
  outreach_type: string | null;
  created_at: string;
  leads: { id: string; business_name: string; niche: string } | null;
}

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

const INTENT_LABELS: Record<string, string> = {
  follow_up: 'Relance',
  introduction: 'Introduction',
  closing: 'Clôture',
  reactivation: 'Réactivation',
};

const ACTION_LABELS: Record<string, string> = {
  create_task: 'Tâche de relance',
  update_pipeline_stage: 'Déplacer dans le pipeline',
  enroll_in_sequence: 'Inscrire en séquence',
  pause_sequence: 'Mettre en pause la séquence',
  generate_email_draft: 'Brouillon email',
  tag_lead: 'Tagger le lead',
  suggest_follow_up: 'Suggestion de relance',
};

// ── DraftCard ─────────────────────────────────────────────────────────────────

function DraftCard({
  draft, onApprove, onReject, busy,
}: {
  draft: ApprovalDraft;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const leadLabel = draft.leads ? `${draft.leads.business_name} · ${draft.leads.niche}` : 'Lead inconnu';
  const intentLabel = INTENT_LABELS[draft.intent_type ?? ''] ?? 'Email';

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7c3aed]/10 mt-0.5">
          <FileText className="h-4 w-4 text-[#7c3aed]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#26251e]">Brouillon IA</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f5f3ff] text-[#7c3aed] border border-[#e9d5ff]">{intentLabel}</span>
          </div>
          <p className="text-[10px] font-semibold text-[#059669] mt-0.5 truncate">{leadLabel}</p>
          <p className="text-xs font-semibold text-[#26251e] mt-1 truncate">{draft.subject}</p>
        </div>
        <span className="text-[9px] text-[#7a7a76] shrink-0">{timeAgo(draft.created_at)}</span>
      </div>

      {/* Toggle body */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 pb-2 text-[9px] font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
      >
        <span>{expanded ? 'Masquer l\'email' : 'Voir l\'email'}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mx-4 mb-3 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] p-3">
          <p className="text-[10px] leading-relaxed text-[#26251e] whitespace-pre-wrap font-sans">{draft.body}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          onClick={() => onApprove(draft.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] transition-colors disabled:opacity-50"
        >
          <Check className="h-3 w-3" />Approuver
        </button>
        <button
          onClick={() => onReject(draft.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-[#e5e5e0] text-[#7a7a76] text-[10px] font-bold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />Rejeter
        </button>
      </div>
    </div>
  );
}

// ── ActionCard ────────────────────────────────────────────────────────────────

function ActionCard({
  action, onApprove, onReject, busy,
}: {
  action: ApprovalAction;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const leadLabel = action.leads ? `${action.leads.business_name} · ${action.leads.niche}` : null;
  const label = ACTION_LABELS[action.action_type] ?? action.action_type;

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#059669]/10 mt-0.5">
          <Zap className="h-4 w-4 text-[#059669]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#26251e]">{label}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#fefce8] text-[#92400e] border border-[#fde68a]">En attente</span>
          </div>
          {leadLabel && <p className="text-[10px] font-semibold text-[#059669] mt-0.5 truncate">{leadLabel}</p>}
          {action.reasoning && <p className="text-[10px] text-[#26251e] mt-1 leading-relaxed line-clamp-2">{action.reasoning}</p>}
        </div>
        <span className="text-[9px] text-[#7a7a76] shrink-0">{timeAgo(action.created_at)}</span>
      </div>

      {action.data_signals && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 pb-2 text-[9px] font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
          >
            <span>{expanded ? 'Masquer les signaux' : 'Voir les signaux'}</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expanded && (
            <div className="mx-4 mb-3 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] p-3">
              <p className="text-[9px] font-black uppercase tracking-wider text-[#7a7a76] mb-1">Signaux</p>
              <p className="text-[10px] text-[#26251e] leading-relaxed">{action.data_signals}</p>
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          onClick={() => onApprove(action.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] transition-colors disabled:opacity-50"
        >
          <Check className="h-3 w-3" />Approuver
        </button>
        <button
          onClick={() => onReject(action.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-[#e5e5e0] text-[#7a7a76] text-[10px] font-bold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />Rejeter
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OutreachApprovals() {
  const [drafts, setDrafts] = useState<ApprovalDraft[]>([]);
  const [actions, setActions] = useState<ApprovalAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all' | 'drafts' | 'actions'>('all');

  const load = useCallback(async () => {
    const workspaceId = localStorage.getItem('minerva_active_workspace_id');
    if (!workspaceId) { setLoading(false); return; }

    const res = await fetch(getApiUrl(`/api/outreach/approvals?workspace_id=${workspaceId}`));
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setDrafts(data.drafts ?? []);
    setActions(data.agent_actions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string, type: 'draft' | 'agent_action') => {
    setBusy(true);
    await fetch(getApiUrl('/api/outreach/approvals'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, decision: 'approve' }),
    });
    if (type === 'draft') setDrafts(prev => prev.filter(d => d.id !== id));
    else setActions(prev => prev.filter(a => a.id !== id));
    setBusy(false);
  };

  const reject = async (id: string, type: 'draft' | 'agent_action') => {
    setBusy(true);
    await fetch(getApiUrl('/api/outreach/approvals'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, decision: 'reject' }),
    });
    if (type === 'draft') setDrafts(prev => prev.filter(d => d.id !== id));
    else setActions(prev => prev.filter(a => a.id !== id));
    setBusy(false);
  };

  const allDrafts = filter === 'actions' ? [] : drafts;
  const allActions = filter === 'drafts' ? [] : actions;
  const total = allDrafts.length + allActions.length;

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-[#f4f4f3] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0] bg-white shrink-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#059669]" />
          <span className="text-sm font-bold text-[#26251e]">Approbations</span>
          {total > 0 && (
            <span className="text-[9px] font-bold bg-[#fefce8] text-[#92400e] border border-[#fde68a] px-1.5 py-0.5 rounded-full">
              {total} en attente
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* filters */}
          {(['all', 'drafts', 'actions'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'text-[9px] font-bold px-2 py-1 rounded-lg transition-all',
                filter === f ? 'bg-[#26251e] text-white' : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              {f === 'all' ? 'Tout' : f === 'drafts' ? 'Brouillons' : 'Actions'}
            </button>
          ))}
          <button onClick={load} className="p-1 text-[#7a7a76] hover:text-[#26251e] transition-colors ml-1">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#059669]/10 mb-4">
              <Check className="h-6 w-6 text-[#059669]" />
            </div>
            <p className="text-sm font-semibold text-[#26251e]">Aucune approbation en attente</p>
            <p className="text-xs text-[#7a7a76] mt-1 max-w-xs">L'agent n'a rien à valider pour le moment. Lance un cycle pour générer des suggestions.</p>
          </div>
        ) : (
          <>
            {allDrafts.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76] px-1">Brouillons IA ({allDrafts.length})</p>
                {allDrafts.map(d => (
                  <DraftCard key={d.id} draft={d} busy={busy}
                    onApprove={(id) => approve(id, 'draft')}
                    onReject={(id) => reject(id, 'draft')}
                  />
                ))}
              </div>
            )}
            {allActions.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#7a7a76] px-1">Actions agent ({allActions.length})</p>
                {allActions.map(a => (
                  <ActionCard key={a.id} action={a} busy={busy}
                    onApprove={(id) => approve(id, 'agent_action')}
                    onReject={(id) => reject(id, 'agent_action')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OutreachApprovals;
