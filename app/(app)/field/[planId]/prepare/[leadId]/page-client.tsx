'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Phone, Globe, Star,
  ClipboardList, CheckCircle2, Users, Send,
  AlertCircle, Loader2,
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { CallPrepPanel } from '@/components/call-prep-panel';

export default function FieldPreparePage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const leadId = params.leadId as string;

  const { leads, activeWorkspace } = useReach();
  const lead = leads.find((l) => l.id === leadId);

  const [notified, setNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const handleNotifyTeam = async () => {
    if (!lead || !activeWorkspace) return;
    setNotifying(true);
    try {
      // Fan out to every active team member (not just self) via the service-role API
      const ownerId = (activeWorkspace as { owner_id?: string }).owner_id;
      const res = await fetch(getApiUrl('/api/notifications/team'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          workspaceOwnerId: ownerId,
          title: `Visite terrain — ${lead.businessName}`,
          body: `Départ en visite chez ${lead.businessName}${lead.city ? ` (${lead.city})` : ''}.`,
          type: 'field_visit',
          link: `/leads/${lead.id}`,
        }),
      });
      if (res.ok) setNotified(true);
    } catch { /* ignore */ }
    finally { setNotifying(false); }
  };

  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-[#7a7a76]">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">Lead introuvable dans ce plan.</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] font-sans text-[#26251e]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Préparer la visite</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">{lead.businessName}</p>
          </div>
        </div>

        {/* Lead info card */}
        <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
          <h2 className="text-base font-bold">{lead.businessName}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-[#7a7a76]">
            {lead.city && (
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-[#059669] transition-colors">
                <Phone className="h-3.5 w-3.5" />{lead.phone}
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#059669] transition-colors">
                <Globe className="h-3.5 w-3.5" />Site web
              </a>
            )}
            {lead.rating && (
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-400" />{lead.rating}
              </span>
            )}
          </div>
          {lead.niche && (
            <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3] text-[#7a7a76]">
              {lead.niche}
            </span>
          )}
        </div>

        {/* Past notes */}
        {lead.notes && lead.notes.length > 0 && (
          <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              <ClipboardList className="h-3.5 w-3.5" />
              Notes précédentes ({lead.notes.length})
            </div>
            {lead.notes.slice(0, 3).map((n, i) => (
              <p key={i} className="text-xs text-[#26251e] leading-relaxed whitespace-pre-line border-l-2 border-[#e5e5e0] pl-3">
                {n.content}
              </p>
            ))}
          </div>
        )}

        {/* Script IA, screenshots, notes en direct */}
        <CallPrepPanel lead={lead} channel="field" />

        {/* Team notification (departure alert) */}
        <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            <Users className="h-3.5 w-3.5" />
            Notification équipe
          </div>
          <p className="text-xs text-[#7a7a76]">
            Prévenez votre équipe que vous partez en visite chez <span className="font-bold text-[#26251e]">{lead.businessName}</span>.
          </p>
          <button
            onClick={handleNotifyTeam}
            disabled={notifying || notified}
            className={cn(
              'flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-70 border-2',
              notified ? 'border-[#059669] bg-[#059669]/10 text-[#059669]' : 'border-[#26251e] bg-[#26251e] text-white hover:bg-[#3d3c35]'
            )}
          >
            {notifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : notified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
            {notified ? 'Équipe notifiée !' : 'Notifier l\'équipe'}
          </button>
        </div>

        {/* Go button */}
        <button
          onClick={() => router.push(`/field/${planId}/outcome/${leadId}`)}
          className="w-full py-4 rounded-xl bg-[#26251e] text-white font-bold text-sm hover:bg-[#3d3c35] transition-colors"
        >
          Démarrer la visite →
        </button>
      </div>
    </div>
  );
}
