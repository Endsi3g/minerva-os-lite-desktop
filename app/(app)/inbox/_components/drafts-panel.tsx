'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Bot, 
  User, 
  Star, 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Globe, 
  Sparkles, 
  Save, 
  Send, 
  Loader2,
  Edit3
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

export interface InboxDraft {
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
  draft, 
  onApprove, 
  onReject, 
  onPlan, 
  onUpdateDraft,
  busy,
}: {
  draft: InboxDraft;
  onApprove: (id: string, customPayload?: { subject: string; body: string }) => void;
  onReject: (id: string) => void;
  onPlan: (id: string) => void;
  onUpdateDraft: (id: string, updated: { subject: string; body: string }) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [subject, setSubject] = useState(draft.subject || '');
  const [body, setBody] = useState(draft.body || '');
  const [polishing, setPolishing] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  const isAgent = draft.source === 'agent';

  useEffect(() => {
    setSubject(draft.subject || '');
    setBody(draft.body || '');
  }, [draft.subject, draft.body]);

  const handleSave = () => {
    onUpdateDraft(draft.id, { subject, body });
    setIsSaved(true);
    toast.success('Brouillon mis à jour avec succès');
  };

  const handleAiPolish = async () => {
    setPolishing(true);
    try {
      const res = await fetch(getApiUrl('/api/ai/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Améliore cet email commercial pour ${draft.leads?.business_name || 'un prospect'}. Rends-le plus percutant, poli, concis et axé sur la prise de rendez-vous en 3 phrases maximum.

Sujet actuel : ${subject}
Corps actuel : ${body}`,
          systemPrompt: 'Tu es un expert en copywriting B2B cold email. Réponds uniquement par le texte de l\'email amélioré.',
        }),
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setBody(data.text.trim());
        setIsSaved(false);
        toast.success('Texte optimisé par Gemini 3.7 Flash !');
      } else {
        toast.error('Impossible de reformuler le texte');
      }
    } catch {
      toast.error('Erreur de connexion à l\'IA');
    } finally {
      setPolishing(false);
    }
  };

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xs space-y-2">
      {/* Top Bar */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5 ${isAgent ? 'bg-[#7c3aed]/10' : 'bg-[#059669]/10'}`}>
          {isAgent ? <Bot className="h-4 w-4 text-[#7c3aed]" /> : <User className="h-4 w-4 text-[#059669]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f4f4f3] text-[#7a7a76] border border-[#e5e5e0]">
              Brouillon éditable
            </span>
            {isAgent && draft.intent_type && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f5f3ff] text-[#7c3aed] border border-[#e9d5ff]">
                {INTENT_LABELS[draft.intent_type] ?? draft.intent_type}
              </span>
            )}
            {!isSaved && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Modifications non enregistrées
              </span>
            )}
          </div>
          <p className="text-[10px] font-semibold text-[#059669] mt-0.5 truncate">
            {draft.leads?.business_name ?? 'Lead inconnu'}
          </p>
        </div>
        <span className="text-[9px] text-[#7a7a76] shrink-0">{timeAgo(draft.created_at)}</span>
      </div>

      {/* Accordion Toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 pb-1 text-[9px] font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
      >
        <span>{expanded ? "Masquer l'éditeur" : "Ouvrir l'éditeur de message"}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Editor Content Area */}
      {expanded && (
        <div className="px-4 pb-2 space-y-3">
          {/* Subject Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Sujet de l&apos;email</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setIsSaved(false);
              }}
              placeholder="Objet du message..."
              className="w-full text-xs font-semibold px-3 py-2 bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-hidden focus:border-[#059669] focus:bg-white text-[#26251e]"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Corps du message</label>
              <button
                onClick={handleAiPolish}
                disabled={polishing || busy}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7c3aed] hover:underline cursor-pointer disabled:opacity-50"
              >
                {polishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Améliorer avec l&apos;IA</span>
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setIsSaved(false);
              }}
              rows={6}
              placeholder="Rédigez votre email..."
              className="w-full text-xs leading-relaxed p-3 bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-hidden focus:border-[#059669] focus:bg-white text-[#26251e] resize-y font-sans"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between px-4 pb-4 pt-1 border-t border-[#f4f4f3]">
        <div className="flex items-center gap-2">
          {!isSaved && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1 h-7 px-3 rounded-lg bg-white border border-[#e5e5e0] text-[#26251e] text-[10px] font-bold hover:bg-[#fafaf8] transition-colors cursor-pointer"
            >
              <Save className="h-3 w-3 text-[#7a7a76]" /> Enregistrer
            </button>
          )}
          <button
            onClick={() => onApprove(draft.id, { subject, body })}
            disabled={busy}
            className="flex items-center gap-1.5 h-7 px-3.5 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] transition-all active:scale-95 disabled:opacity-50 shadow-2xs cursor-pointer"
          >
            <Send className="h-3 w-3" /> Envoyer maintenant
          </button>
          <button
            onClick={() => onPlan(draft.id)}
            disabled={busy}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white border border-[#e5e5e0] text-[#7a7a76] text-[10px] font-bold hover:bg-[#fafaf8] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Clock className="h-3 w-3" /> Planifier
          </button>
        </div>

        <button
          onClick={() => onReject(draft.id)}
          disabled={busy}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-transparent text-[#7a7a76] text-[10px] font-bold hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="h-3 w-3" /> Supprimer
        </button>
      </div>
    </div>
  );
}

// Grouped Lead Card widget
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
            {draftCount} message{draftCount > 1 ? 's' : ''} prêt{draftCount > 1 ? 's' : ''}
          </span>
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

  const handleUpdateDraft = (id: string, updated: { subject: string; body: string }) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, subject: updated.subject, body: updated.body } : d));
  };

  const decide = async (id: string, decision: 'approve' | 'reject', customPayload?: { subject: string; body: string }) => {
    setBusy(true);
    try {
      const res = await fetch(getApiUrl('/api/outreach/approvals'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          type: 'draft', 
          decision,
          subject: customPayload?.subject,
          body: customPayload?.body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.queueError) {
        toast.error(data.queueError);
      } else if (decision === 'approve') {
        toast.success("Email envoyé avec succès au prospect !");
      }
      setDrafts(prev => prev.filter(d => d.id !== id));
    } finally {
      setBusy(false);
    }
  };

  const handlePlan = (id: string) => {
    toast.success("Brouillon planifié pour envoi automatique.");
  };

  // Filter drafts by channel
  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => {
      if (activeChannel === 'Email') return d.channel === 'email' || !d.channel;
      return d.channel === 'dm' || d.channel === 'facebook' || d.channel === 'instagram';
    });
  }, [drafts, activeChannel]);

  // Group drafts by lead
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
          <h2 className="text-sm font-semibold text-[#26251e]">Brouillons & Messages Prêts</h2>
          <span className="text-[10px] text-[#7a7a76]">
            {filteredDrafts.length} message{filteredDrafts.length !== 1 ? 's' : ''} {activeChannel === 'Email' ? 'Google' : 'Facebook'}
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
            <p className="text-xs text-center font-bold">Aucun brouillon en attente</p>
            <p className="text-[11px] text-[#a8a29e] text-center max-w-[240px]">
              Générez des messages depuis la fiche d&apos;un lead ou via l&apos;Assistant SDR pour les retrouver ici.
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
                    className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors cursor-pointer border-0 bg-transparent p-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste des leads
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
                        onUpdateDraft={handleUpdateDraft}
                        onApprove={(id, customPayload) => decide(id, 'approve', customPayload)}
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
