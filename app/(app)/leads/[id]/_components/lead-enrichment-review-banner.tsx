'use client';

import React, { useState } from 'react';
import { Search, Check, X, ExternalLink } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import type { Lead } from '@/lib/mock-data';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

// Suggestion de recherche web approfondie en attente de validation (v14.2) —
// posée par app/api/leads/enrich-batch quand l'enrichissement standard ne
// trouvait ni site ni téléphone et que la confiance de correspondance
// (recherche web + IA) n'était pas assez élevée pour appliquer les données
// automatiquement.
export function LeadEnrichmentReviewBanner({ lead }: { lead: Lead }) {
  const { updateLead } = useReach();
  const [busy, setBusy] = useState(false);

  const review = lead.enrichmentReview;
  if (!review) return null;

  const respond = async (action: 'accept' | 'reject') => {
    setBusy(true);
    try {
      const res = await fetch(getApiUrl('/api/leads/enrichment-review'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, action }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Erreur');

      const localUpdate: Partial<Lead> = { enrichmentReview: undefined };
      if (action === 'accept') {
        if (review.candidate.website) localUpdate.website = review.candidate.website;
        if (review.candidate.phone) localUpdate.phone = review.candidate.phone;
        if (review.candidate.address) localUpdate.address = review.candidate.address;
        if (review.candidate.socialLinks) localUpdate.socialLinks = review.candidate.socialLinks;
      }
      updateLead(lead.id, localUpdate);
      toast.success(action === 'accept' ? 'Informations appliquées au lead.' : 'Suggestion écartée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Search className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold text-amber-900">
            Entreprise potentiellement trouvée en ligne — confiance {review.confidence}%
          </p>
          {review.reasoning && <p className="text-[11px] text-amber-800">{review.reasoning}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-amber-900 pt-1">
            {review.candidate.website && (
              <a href={review.candidate.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold hover:underline">
                <ExternalLink className="h-3 w-3" />{review.candidate.website}
              </a>
            )}
            {review.candidate.phone && <span>{review.candidate.phone}</span>}
            {review.candidate.address && <span>{review.candidate.address}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => respond('accept')}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Check className="h-3 w-3" />C&apos;est la bonne entreprise
        </button>
        <button
          onClick={() => respond('reject')}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />Ce n&apos;est pas la bonne
        </button>
      </div>
    </div>
  );
}
