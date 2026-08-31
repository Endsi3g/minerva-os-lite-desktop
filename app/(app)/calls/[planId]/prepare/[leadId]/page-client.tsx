'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Globe, Star, ClipboardList, AlertCircle } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { CallPrepPanel } from '@/components/call-prep-panel';

export default function CallPreparePage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;
  const leadId = params.leadId as string;

  const { leads } = useReach();
  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-[#7a7a76]">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">Lead introuvable dans cette session.</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] font-sans text-[#26251e]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Préparer l&apos;appel</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">{lead.businessName}</p>
          </div>
        </div>

        <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
          <h2 className="text-base font-bold">{lead.businessName}</h2>
          <div className="flex flex-wrap gap-3 text-xs text-[#7a7a76]">
            {lead.city && (
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 font-bold text-[#059669]">
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

        <CallPrepPanel lead={lead} channel="call" />

        <a
          href={lead.phone ? `tel:${lead.phone}` : undefined}
          onClick={() => router.push(`/calls/${planId}/outcome/${leadId}`)}
          className="flex items-center justify-center w-full py-4 rounded-xl bg-[#26251e] text-white font-bold text-sm hover:bg-[#3d3c35] transition-colors"
        >
          Démarrer l&apos;appel →
        </a>
      </div>
    </div>
  );
}
