'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, ChevronDown, ChevronUp, Check, X, Bot, User } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';

interface InboxDraft {
  id: string;
  lead_id: string | null;
  subject: string | null;
  body: string | null;
  intent_type: string | null;
  source: string;
  created_at: string;
  leads: { id: string; business_name: string; contact_email: string | null } | null;
}

const INTENT_LABELS: Record<string, string> = {
  follow_up: 'Relance',
  introduction: 'Introduction',
  closing: 'Clôture',
  reactivation: 'Réactivation',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function DraftCard({
  draft, onApprove, onReject, busy,
}: {
  draft: InboxDraft;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAgent = draft.source === 'agent';

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5 ${isAgent ? 'bg-[#7c3aed]/10' : 'bg-[#059669]/10'}`}>
          {isAgent ? <Bot className="h-4 w-4 text-[#7c3aed]" /> : <User className="h-4 w-4 text-[#059669]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f4f4f3] text-[#7a7a76] border border-[#e5e5e0]">
              Brouillon
            </span>
            {isAgent && draft.intent_type && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f5f3ff] text-[#7c3aed] border border-[#e9d5ff]">
                {INTENT_LABELS[draft.intent_type] ?? draft.intent_type}
              </span>
            )}
          </div>
          <p className="text-[10px] font-semibold text-[#059669] mt-0.5 truncate">
            {draft.leads?.business_name ?? 'Lead inconnu'}
          </p>
          <p className="text-xs font-semibold text-[#26251e] mt-1 truncate">{draft.subject || '(Sans objet)'}</p>
        </div>
        <span className="text-[9px] text-[#7a7a76] shrink-0">{timeAgo(draft.created_at)}</span>
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 pb-2 text-[9px] font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
      >
        <span>{expanded ? "Masquer l'email" : "Voir l'email"}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mx-4 mb-3 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] p-3">
          <p className="text-[10px] leading-relaxed text-[#26251e] whitespace-pre-wrap font-sans">
            {draft.body || '(aucun contenu)'}
          </p>
        </div>
      )}

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

export function DraftsPanel({ workspaceId }: { workspaceId: string | undefined }) {
  const [drafts, setDrafts] = useState<InboxDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/inbox/drafts?workspace_id=${workspaceId}`));
      if (!res.ok) return;
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setBusy(true);
    try {
      await fetch(getApiUrl('/api/outreach/approvals'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'draft', decision }),
      });
      setDrafts(prev => prev.filter(d => d.id !== id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="border-b border-[#e5e5e0] px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#26251e]">Brouillons</h2>
          <span className="text-[10px] text-[#7a7a76]">{drafts.length} brouillon{drafts.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-[#78716c]">Chargement…</div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#78716c]">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-xs text-center">Aucun brouillon en attente</p>
            <p className="text-[11px] text-[#a8a29e] text-center max-w-[240px]">
              Les emails générés (par vous ou par l&apos;agent) mais pas encore approuvés/envoyés apparaîtront ici.
            </p>
          </div>
        ) : (
          drafts.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              busy={busy}
              onApprove={(id) => decide(id, 'approve')}
              onReject={(id) => decide(id, 'reject')}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default DraftsPanel;
