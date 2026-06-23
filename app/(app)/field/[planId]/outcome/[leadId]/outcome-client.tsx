'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle2, Clock, Calendar, X,
  MessageSquare, Loader2, MapPin, Phone, Globe, Star,
  User, Flame, Camera, Trash2, Users,
} from 'lucide-react';

type VisitOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';
type InterestLevel = 'Hot' | 'Warm' | 'Cold';

const OUTCOME_CONFIG: Record<
  VisitOutcome,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string; description: string }
> = {
  visited: {
    label: 'Visité',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: 'text-[#059669]',
    bg: 'bg-[#059669]',
    border: 'border-[#059669]',
    description: 'Contact établi en personne',
  },
  absent: {
    label: 'Absent',
    icon: <Clock className="h-5 w-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-500',
    border: 'border-amber-500',
    description: 'Personne sur place lors du passage',
  },
  meeting_booked: {
    label: 'RDV pris',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    description: 'Rendez-vous fixé avec le contact',
  },
  not_interested: {
    label: 'Non intéressé',
    icon: <X className="h-5 w-5" />,
    color: 'text-red-500',
    bg: 'bg-red-500',
    border: 'border-red-500',
    description: 'Refus explicite du contact',
  },
};

const INTEREST_CONFIG: Record<InterestLevel, { label: string; color: string }> = {
  Hot: { label: 'Chaud', color: '#ef4444' },
  Warm: { label: 'Tiède', color: '#059669' },
  Cold: { label: 'Froid', color: '#3b82f6' },
};

export default function OutcomeClient() {
  const router = useRouter();
  const params = useParams<{ planId: string; leadId: string }>();
  const { leads, activeWorkspace } = useReach();

  const lead = leads.find((l) => l.id === params.leadId);
  const [selectedOutcome, setSelectedOutcome] = useState<VisitOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [contactMet, setContactMet] = useState('');
  const [interestLevel, setInterestLevel] = useState<InterestLevel | null>(null);
  const [proofImage, setProofImage] = useState<string>('');
  const [meetingDatetime, setMeetingDatetime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Redirect back if lead not found
  useEffect(() => {
    if (leads.length > 0 && !lead) {
      router.push(`/field/${params.planId}`);
    }
  }, [lead, leads.length, router, params.planId]);

  const handleImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1000;
          let { width, height } = img;
          if (width > max || height > max) {
            const ratio = Math.min(max / width, max / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(reader.result as string); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setProofImage(dataUrl);
  };

  const handleConfirm = async () => {
    if (!selectedOutcome || !lead) return;
    setSaving(true);

    const visitedAt = new Date().toISOString();

    try {
      const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electron;

      if (isElectron) {
        const electron = (window as unknown as Record<string, unknown>).electron as {
          dbRun: (sql: string, params: unknown[]) => Promise<void>;
          triggerSync: () => void;
        };
        const id = crypto.randomUUID();
        await electron.dbRun(
          `INSERT INTO field_visits (id, route_plan_id, lead_id, workspace_id, outcome, notes, contact_met, interest_level, proof_image, visited_at, meeting_datetime, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [
            id,
            params.planId,
            lead.id,
            activeWorkspace?.id ?? '',
            selectedOutcome,
            notes,
            contactMet || null,
            interestLevel || null,
            proofImage || null,
            visitedAt,
            selectedOutcome === 'meeting_booked' ? (meetingDatetime || null) : null,
            visitedAt,
            visitedAt,
          ]
        );
        electron.triggerSync();
      } else {
        const res = await fetch(getApiUrl('/api/route-plans/visits'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route_plan_id: params.planId,
            lead_id: lead.id,
            workspace_id: activeWorkspace?.id,
            outcome: selectedOutcome,
            notes,
            contact_met: contactMet || null,
            interest_level: interestLevel || null,
            proof_image: proofImage || null,
            visited_at: visitedAt,
            meeting_datetime: selectedOutcome === 'meeting_booked' ? (meetingDatetime || null) : null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Erreur serveur ${res.status}`);
        }
      }

      // Notify the team with rich context about this visit outcome
      if (activeWorkspace) {
        const ownerId = (activeWorkspace as { owner_id?: string }).owner_id;
        const cfg = OUTCOME_CONFIG[selectedOutcome];
        const parts = [
          `${cfg.label} — ${lead.businessName}`,
          contactMet ? `Contact : ${contactMet}` : '',
          interestLevel ? `Intérêt : ${INTEREST_CONFIG[interestLevel].label}` : '',
          notes ? `Note : ${notes}` : '',
        ].filter(Boolean);
        fetch(getApiUrl('/api/notifications/team'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: activeWorkspace.id,
            workspaceOwnerId: ownerId,
            title: `Passage terrain — ${cfg.label}`,
            body: parts.join(' · '),
            type: 'field_visit',
            link: `/leads/${lead.id}`,
          }),
        }).catch(() => {});
      }

      setSaved(true);
      setTimeout(() => router.push(`/field/${params.planId}?t=${Date.now()}`), 900);
    } catch (err) {
      console.error('[outcome]', err);
    } finally {
      setSaving(false);
    }
  };

  if (!lead) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#059669]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e5e5e0] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(`/field/${params.planId}`)}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-bold text-[#26251e]">Enregistrer le passage</p>
          <p className="text-[10px] text-[#7a7a76] truncate max-w-[240px]">{lead.businessName}</p>
        </div>
      </div>

      {/* pb-32 ensures the submit button always clears the bottom of the viewport / mobile nav */}
      <div className="max-w-lg mx-auto p-4 space-y-5 pb-32">
        {/* Lead info card */}
        <div className="bg-white rounded-xl border border-[#e5e5e0] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#26251e] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {lead.businessName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#26251e]">{lead.businessName}</p>
              <p className="text-[10px] text-[#7a7a76] mt-0.5">{lead.niche}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#7a7a76] flex-wrap pt-1 border-t border-[#e5e5e0]">
            {lead.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lead.city}
              </span>
            )}
            {lead.rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {lead.rating}
              </span>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-[#059669]">
                <Phone className="h-3 w-3" />
                Appeler
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#059669]">
                <Globe className="h-3 w-3" />
                Site
              </a>
            )}
          </div>
        </div>

        {/* Outcome selection */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] px-1">Résultat du passage</p>
          <div className="space-y-2">
            {(Object.entries(OUTCOME_CONFIG) as [VisitOutcome, typeof OUTCOME_CONFIG[VisitOutcome]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelectedOutcome(key)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                  selectedOutcome === key
                    ? `${cfg.border} bg-white shadow-sm`
                    : 'border-[#e5e5e0] bg-white hover:border-[#26251e]/20'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                  selectedOutcome === key ? `${cfg.bg} text-white` : 'bg-[#f4f4f3] text-[#7a7a76]'
                )}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold transition-colors', selectedOutcome === key ? cfg.color : 'text-[#26251e]')}>
                    {cfg.label}
                  </p>
                  <p className="text-[10px] text-[#7a7a76] mt-0.5">{cfg.description}</p>
                </div>
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                  selectedOutcome === key ? `${cfg.border} ${cfg.bg}` : 'border-[#e5e5e0]'
                )}>
                  {selectedOutcome === key && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Context fields — shown once an outcome is chosen */}
        {selectedOutcome && (
          <>
            {/* Meeting datetime — meeting_booked only */}
            {selectedOutcome === 'meeting_booked' && (
              <div className="bg-white rounded-xl border border-[#e5e5e0] p-4 space-y-3">
                <label className="text-xs font-bold text-[#26251e] block">
                  <Calendar className="h-3.5 w-3.5 inline mr-1.5 text-blue-500" />
                  Date et heure du RDV
                </label>
                <input
                  type="datetime-local"
                  value={meetingDatetime}
                  onChange={(e) => setMeetingDatetime(e.target.value)}
                  className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
            )}

            {/* Contact met */}
            <div className="bg-white rounded-xl border border-[#e5e5e0] p-4 space-y-3">
              <label className="text-xs font-bold text-[#26251e] block">
                <User className="h-3.5 w-3.5 inline mr-1.5 text-[#7a7a76]" />
                Contact rencontré <span className="font-normal text-[#7a7a76]">(qui avez-vous vu ?)</span>
              </label>
              <input
                type="text"
                value={contactMet}
                onChange={(e) => setContactMet(e.target.value)}
                placeholder="Ex : Marie, responsable marketing"
                className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]/40"
              />
            </div>

            {/* Interest level */}
            <div className="bg-white rounded-xl border border-[#e5e5e0] p-4 space-y-3">
              <label className="text-xs font-bold text-[#26251e] block">
                <Flame className="h-3.5 w-3.5 inline mr-1.5 text-[#059669]" />
                Niveau d&apos;intérêt perçu
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(INTEREST_CONFIG) as [InterestLevel, typeof INTEREST_CONFIG[InterestLevel]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInterestLevel(interestLevel === key ? null : key)}
                    className={cn(
                      'py-2 rounded-lg border text-xs font-bold transition-all',
                      interestLevel === key ? 'text-white' : 'bg-white text-[#7a7a76] border-[#e5e5e0] hover:border-[#26251e]/20'
                    )}
                    style={interestLevel === key ? { background: cfg.color, borderColor: cfg.color } : undefined}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo proof */}
            <div className="bg-white rounded-xl border border-[#e5e5e0] p-4 space-y-3">
              <label className="text-xs font-bold text-[#26251e] block">
                <Camera className="h-3.5 w-3.5 inline mr-1.5 text-[#7a7a76]" />
                Photo preuve <span className="font-normal text-[#7a7a76]">(devanture, carte, contact…)</span>
              </label>
              {proofImage ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofImage} alt="preuve de visite" className="w-full max-h-56 object-cover rounded-lg border border-[#e5e5e0]" />
                  <button
                    type="button"
                    onClick={() => setProofImage('')}
                    className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg bg-white/90 border border-[#e5e5e0] text-red-500 hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-lg border border-dashed border-[#e5e5e0] text-[#7a7a76] cursor-pointer hover:border-[#059669]/40 hover:bg-[#f4f4f3] transition-colors">
                  <Camera className="h-5 w-5" />
                  <span className="text-[11px] font-semibold">Ajouter une photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }}
                  />
                </label>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-[#e5e5e0] p-4 space-y-3">
              <label className="text-xs font-bold text-[#26251e] block">
                <MessageSquare className="h-3.5 w-3.5 inline mr-1.5 text-[#7a7a76]" />
                Notes pour l&apos;équipe <span className="font-normal text-[#7a7a76]">(optionnel)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={
                  selectedOutcome === 'absent'
                    ? 'Ex : Parler à Marie la responsable, revenir jeudi matin…'
                    : selectedOutcome === 'meeting_booked'
                    ? 'Ex : Contact enthousiaste, préparer démo SEO local…'
                    : selectedOutcome === 'not_interested'
                    ? "Ex : Déjà client d'une autre agence, budget bloqué…"
                    : 'Observations, points clés à transmettre à l\'équipe…'
                }
                className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]/40 resize-none"
              />
            </div>
          </>
        )}

        {/* Submit */}
        <button
          onClick={handleConfirm}
          disabled={!selectedOutcome || saving || saved}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all',
            saved
              ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
              : selectedOutcome
              ? 'bg-[#26251e] hover:bg-[#3a3930] text-white shadow-sm'
              : 'bg-[#f4f4f3] text-[#7a7a76] cursor-not-allowed'
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : null}
          {saved ? 'Enregistré !' : saving ? 'Enregistrement…' : selectedOutcome ? `Confirmer — ${OUTCOME_CONFIG[selectedOutcome].label}` : 'Choisissez un résultat'}
        </button>

        <p className="text-[10px] text-[#7a7a76] text-center flex items-center justify-center gap-1.5">
          <Users className="h-3 w-3" />
          L&apos;équipe sera notifiée du résultat de ce passage.
        </p>
      </div>
    </div>
  );
}
