'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle2, Clock, Calendar, X,
  MessageSquare, Loader2, MapPin, Phone, Globe, Star,
} from 'lucide-react';

type VisitOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';

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
    description: 'Contact refus explicite',
  },
};

export default function OutcomePage() {
  const router = useRouter();
  const params = useParams<{ planId: string; leadId: string }>();
  const { leads, activeWorkspace } = useReach();

  const lead = leads.find((l) => l.id === params.leadId);
  const [selectedOutcome, setSelectedOutcome] = useState<VisitOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [meetingDatetime, setMeetingDatetime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Redirect back if lead not found
  useEffect(() => {
    if (leads.length > 0 && !lead) {
      router.push(`/field/${params.planId}`);
    }
  }, [lead, leads.length, router, params.planId]);

  const handleConfirm = async () => {
    if (!selectedOutcome || !lead) return;
    setSaving(true);

    const visitedAt = new Date().toISOString();

    try {
      const isElectron = false;

      if (isElectron) {
        const electron = (window as unknown as Record<string, unknown>).electron as {
          dbRun: (sql: string, params: unknown[]) => Promise<void>;
          triggerSync: () => void;
        };
        const id = crypto.randomUUID();
        await electron.dbRun(
          `INSERT INTO field_visits (id, route_plan_id, lead_id, workspace_id, outcome, notes, visited_at, meeting_datetime, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [
            id,
            params.planId,
            lead.id,
            activeWorkspace?.id ?? '',
            selectedOutcome,
            notes,
            visitedAt,
            selectedOutcome === 'meeting_booked' ? (meetingDatetime || null) : null,
            visitedAt,
            visitedAt,
          ]
        );
        electron.triggerSync();
      } else {
        await fetch(getApiUrl('/api/route-plans/visits'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            route_plan_id: params.planId,
            lead_id: lead.id,
            workspace_id: activeWorkspace?.id,
            outcome: selectedOutcome,
            notes,
            visited_at: visitedAt,
            meeting_datetime: selectedOutcome === 'meeting_booked' ? (meetingDatetime || null) : null,
          }),
        });
      }

      setSaved(true);
      // Return to field page after short delay
      setTimeout(() => router.push(`/field/${params.planId}`), 900);
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
    <div className="min-h-full bg-[#fafaf8]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e5e5e0] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(`/field/${params.planId}`)}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-black text-[#26251e]">Enregistrer le passage</p>
          <p className="text-[10px] text-[#7a7a76] truncate max-w-[240px]">{lead.businessName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* Lead info card */}
        <div className="bg-white rounded-2xl border border-[#e5e5e0] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#26251e] flex items-center justify-center text-white text-sm font-black shrink-0">
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
            {lead.contactEmail && (
              <a href={`tel:${lead.contactEmail}`} className="flex items-center gap-1 hover:text-[#059669]">
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
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  selectedOutcome === key
                    ? `${cfg.border} bg-white shadow-md`
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

        {/* Meeting datetime — shown only for meeting_booked */}
        {selectedOutcome === 'meeting_booked' && (
          <div className="bg-white rounded-2xl border border-[#e5e5e0] p-4 space-y-3">
            <label className="text-xs font-bold text-[#26251e] block">
              <Calendar className="h-3.5 w-3.5 inline mr-1.5 text-blue-500" />
              Date et heure du RDV
            </label>
            <input
              type="datetime-local"
              value={meetingDatetime}
              onChange={(e) => setMeetingDatetime(e.target.value)}
              className="w-full text-xs border border-[#e5e5e0] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        )}

        {/* Notes */}
        {selectedOutcome && (
          <div className="bg-white rounded-2xl border border-[#e5e5e0] p-4 space-y-3">
            <label className="text-xs font-bold text-[#26251e] block">
              <MessageSquare className="h-3.5 w-3.5 inline mr-1.5 text-[#7a7a76]" />
              Notes <span className="font-normal text-[#7a7a76]">(optionnel)</span>
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
                  ? 'Ex : Déjà client d\'une autre agence, budget bloqué…'
                  : 'Observations, nom du contact, points clés…'
              }
              className="w-full text-xs border border-[#e5e5e0] rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]/40 resize-none"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleConfirm}
          disabled={!selectedOutcome || saving || saved}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all',
            saved
              ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
              : selectedOutcome
              ? 'bg-[#26251e] hover:bg-[#3a3930] text-white shadow-md'
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

        <p className="text-[10px] text-[#7a7a76] text-center">
          Le résultat sera synchronisé automatiquement à la prochaine connexion.
        </p>
      </div>
    </div>
  );
}
