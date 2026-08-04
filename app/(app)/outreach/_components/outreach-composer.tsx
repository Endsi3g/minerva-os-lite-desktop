'use client';

import React, { useMemo, useState } from 'react';
import { Search, X, Mail, MapPin } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { TemplateComposer } from '@/app/(app)/leads/[id]/_components/template-composer';

// Composer réel de Outreach — c'est ici (et non plus dans Séquences) qu'on
// compose et envoie un message à un lead. Réutilise TemplateComposer, le
// même composant déjà utilisé sur la fiche lead (même chemin d'envoi fiable,
// pas de logique dupliquée).
export function OutreachComposer() {
  const { leads } = useReach();
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return leads
      .filter(l =>
        l.businessName?.toLowerCase().includes(q) ||
        l.contactName?.toLowerCase().includes(q) ||
        l.contactEmail?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [leads, search]);

  if (selectedLead) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => setSelectedLead(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Changer de prospect
        </button>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#e5e5e0]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#059669]/10 text-[#059669] text-xs font-bold shrink-0">
            {selectedLead.businessName?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#26251e] truncate">{selectedLead.businessName}</p>
            <p className="text-[10px] text-[#7a7a76] truncate">{selectedLead.contactName} {selectedLead.city ? `· ${selectedLead.city}` : ''}</p>
          </div>
        </div>
        <TemplateComposer lead={selectedLead} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[#26251e]">Composer un message</h2>
        <p className="text-xs text-[#7a7a76] mt-0.5">Cherche un prospect pour rédiger et envoyer un message directement.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par entreprise, contact, email…"
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#e5e5e0] bg-white text-xs text-[#26251e] placeholder:text-[#7a7a76] focus:outline-none focus:border-[#059669]/50 transition-colors"
          autoFocus
        />
      </div>
      {results.length > 0 && (
        <div className="rounded-xl border border-[#e5e5e0] bg-white divide-y divide-[#f4f4f3] overflow-hidden">
          {results.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#fafaf8] transition-colors text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#059669]/10 text-[#059669] text-[10px] font-bold shrink-0">
                {lead.businessName?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#26251e] truncate">{lead.businessName}</p>
                <div className="flex items-center gap-2 text-[10px] text-[#7a7a76] truncate">
                  {lead.contactEmail && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-2.5 w-2.5 shrink-0" />
                      {lead.contactEmail}
                    </span>
                  )}
                  {lead.city && (
                    <span className="flex items-center gap-1 shrink-0">
                      <MapPin className="h-2.5 w-2.5" />
                      {lead.city}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {search.trim() && results.length === 0 && (
        <p className="text-xs text-[#7a7a76] text-center py-6">Aucun prospect ne correspond à cette recherche.</p>
      )}
    </div>
  );
}
export default OutreachComposer;
