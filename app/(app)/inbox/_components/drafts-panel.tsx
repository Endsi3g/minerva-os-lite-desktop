'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp, Check, X, Bot, User, ChevronRight, Star, ArrowLeft, Clock, MapPin, Globe } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface InboxDraft {
  id: string;
  lead_id: string | null;
  subject: string | null;
  body: string | null;
  intent_type: string | null;
  source: string;
  created_at: string;
  channel: string;
  leads: {
    id: string;
    business_name: string;
    contact_email: string | null;
    rating?: number | null;
    reviews_count?: number | null;
    city?: string | null;
    niche?: string | null;
    website_description?: string | null;
    website?: string | null;
  } | null;
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
  draft, onApprove, onReject, onPlan, busy,
}: {
  draft: InboxDraft;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPlan: (id: string) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAgent = draft.source === 'agent';

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden shadow-xs">
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
        <span>{expanded ? "Masquer le brouillon" : "Voir le brouillon"}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <div className={`grid transition-all duration-300 ease-in-out ${
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}>
        <div className="overflow-hidden">
          <div className="mx-4 mb-3 rounded-lg bg-[#fafaf8] border border-[#e5e5e0] p-3">
            <p className="text-[10px] leading-relaxed text-[#26251e] whitespace-pre-wrap font-sans">
              {draft.body || '(aucun contenu)'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-4">
        <button
          onClick={() => onApprove(draft.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] transition-colors disabled:opacity-50 border-0 cursor-pointer"
        >
          <Check className="h-3 w-3" /> Envoyer
        </button>
        <button
          onClick={() => onPlan(draft.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white border border-[#e5e5e0] text-[#26251e] text-[10px] font-bold hover:bg-[#fafaf8] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Clock className="h-3 w-3 text-[#7a7a76]" /> Planifier
        </button>
        <button
          onClick={() => onReject(draft.id)}
          disabled={busy}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-[#e5e5e0] text-[#7a7a76] text-[10px] font-bold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors disabled:opacity-50 bg-white cursor-pointer"
        >
          <X className="h-3 w-3" /> Rejeter
        </button>
      </div>
    </div>
  );
}

// Grouped Lead Card widget (resembles the lead list layout styling)
function LeadGroupCard({
  lead,
  draftCount,
  onClick,
}: {
  lead: NonNullable<InboxDraft['leads']>;
  draftCount: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#e5e5e0] rounded-xl p-4 hover:border-[#7a7a76] cursor-pointer transition-all duration-150 flex items-stretch gap-4"
    >
      <div className="flex-1 min-w-0 space-y-2">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-[#26251e] truncate">{lead.business_name}</h3>
          <p className="text-[10px] text-[#7a7a76] flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {lead.city || 'Ville inconnue'}{lead.niche ? ` · ${lead.niche}` : ''}
          </p>
        </div>

        {/* Rating widget */}
        {lead.rating !== undefined && lead.rating !== null && (
          <div className="flex items-center gap-1 text-[10px]">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-2.5 w-2.5 ${i <= Math.round(lead.rating!) ? 'fill-amber-400 text-amber-400' : 'text-[#7a7a76]/30'}`}
              />
            ))}
            <span className="font-bold text-[#26251e] ml-0.5">{lead.rating.toFixed(1)}</span>
            {lead.reviews_count !== undefined && (
              <span className="text-[#7a7a76]">({lead.reviews_count} avis)</span>
            )}
          </div>
        )}

        {/* Description snippet */}
        {lead.website_description && (
          <p className="text-[10px] text-[#7a7a76] line-clamp-2 bg-[#f4f4f3]/40 p-2 rounded border border-[#e5e5e0]/50 italic">
            {lead.website_description}
          </p>
        )}

        {/* Draft Count tag */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/25">
            {draftCount} brouillon{draftCount > 1 ? 's' : ''} en attente
          </span>
        </div>
      </div>

      <div className="flex items-center shrink-0 pl-2">
        <div className="h-8 w-8 rounded-full border border-[#e5e5e0] hover:bg-[#f4f4f3] flex items-center justify-center text-[#7a7a76] transition-colors">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export function DraftsPanel({ workspaceId }: { workspaceId: string | undefined }) {
  const [drafts, setDrafts] = useState<InboxDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'Email' | 'DM'>('Email');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

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
      const res = await fetch(getApiUrl('/api/outreach/approvals'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'draft', decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.queueError) {
        toast.error(data.queueError);
      } else if (decision === 'approve') {
        toast.success("Brouillon approuvé — mis en file d'envoi.");
      }
      setDrafts(prev => prev.filter(d => d.id !== id));
    } finally {
      setBusy(false);
    }
  };

  const handlePlan = (id: string) => {
    toast.success("Brouillon planifié pour envoi.");
  };

  // Filter drafts by channel
  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => d.channel === activeChannel);
  }, [drafts, activeChannel]);

  // Group by lead ID for active view
  const groupedLeads = useMemo(() => {
    const leadsMap = new Map<string, { lead: NonNullable<InboxDraft['leads']>; count: number }>();
    const unknownLeadsCount = { count: 0 };

    filteredDrafts.forEach(d => {
      if (d.leads && d.leads.id) {
        const existing = leadsMap.get(d.leads.id);
        if (existing) {
          existing.count += 1;
        } else {
          leadsMap.set(d.leads.id, { lead: d.leads, count: 1 });
        }
      } else {
        unknownLeadsCount.count += 1;
      }
    });

    return Array.from(leadsMap.values());
  }, [filteredDrafts]);

  // Selected lead drafts
  const selectedLeadDrafts = useMemo(() => {
    if (!selectedLeadId) return [];
    return filteredDrafts.filter(d => d.leads?.id === selectedLeadId);
  }, [filteredDrafts, selectedLeadId]);

  const selectedLeadInfo = useMemo(() => {
    if (!selectedLeadId) return null;
    return selectedLeadDrafts[0]?.leads || null;
  }, [selectedLeadDrafts, selectedLeadId]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Header with Sub-tabs */}
      <div className="border-b border-[#e5e5e0] bg-[#fafaf8] shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#26251e]">Brouillons en attente</h2>
          <span className="text-[10px] text-[#7a7a76]">
            {filteredDrafts.length} brouillon{filteredDrafts.length !== 1 ? 's' : ''} {activeChannel === 'Email' ? 'Google' : 'Facebook'}
          </span>
        </div>

        {/* Sub-tabs to split Google and Facebook */}
        <div className="flex px-4 border-t border-[#e5e5e0]/70">
          <button
            onClick={() => {
              setActiveChannel('Email');
              setSelectedLeadId(null);
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeChannel === 'Email'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Emails (Google)
            </span>
          </button>
          <button
            onClick={() => {
              setActiveChannel('DM');
              setSelectedLeadId(null);
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeChannel === 'DM'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" /> Réseaux Sociaux (Facebook)
            </span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full text-xs text-[#78716c]">Chargement…</div>
        ) : filteredDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#78716c]">
            <FileText className="h-8 w-8 opacity-30" />
            <p className="text-xs text-center">Aucun brouillon en attente</p>
            <p className="text-[11px] text-[#a8a29e] text-center max-w-[240px]">
              Les brouillons de type {activeChannel === 'Email' ? 'Email (Google)' : 'DM (Facebook/Instagram)'} apparaîtront ici.
            </p>
          </div>
        ) : (
          <>
            {/* Grouped / Stacked Leads View */}
            <div className={`absolute inset-0 p-4 overflow-y-auto space-y-3 transition-all duration-300 ease-in-out transform ${
              selectedLeadId ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
            }`}>
              {groupedLeads.map(({ lead, count }) => (
                <LeadGroupCard
                  key={lead.id}
                  lead={lead}
                  draftCount={count}
                  onClick={() => setSelectedLeadId(lead.id)}
                />
              ))}
            </div>

            {/* Dedicated Lead Drafts View */}
            <div className={`absolute inset-0 p-4 overflow-y-auto space-y-4 transition-all duration-300 ease-in-out transform ${
              selectedLeadId ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
            }`}>
              {selectedLeadInfo && (
                <>
                  <button
                    onClick={() => setSelectedLeadId(null)}
                    className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors cursor-pointer border-0 bg-transparent p-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour
                  </button>
                  <div className="pb-2 border-b border-[#e5e5e0]">
                    <h3 className="text-sm font-bold text-[#26251e]">{selectedLeadInfo.business_name}</h3>
                    <p className="text-[10px] text-[#7a7a76]">{selectedLeadInfo.city || 'Ville'} · {selectedLeadInfo.niche || 'Niche'}</p>
                  </div>
                  <div className="space-y-3">
                    {selectedLeadDrafts.map(draft => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        busy={busy}
                        onApprove={(id) => decide(id, 'approve')}
                        onReject={(id) => decide(id, 'reject')}
                        onPlan={handlePlan}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DraftsPanel;
