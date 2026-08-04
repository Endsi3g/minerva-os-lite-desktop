'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { useReach, type Campaign } from '@/lib/reach-context';

const GOAL_TYPE_LABELS: Record<NonNullable<Campaign['goalType']>, string> = {
  rdv: 'Remplir mon agenda',
  clients: 'Signer des clients',
  mrr: 'Faire croître le MRR',
};

// Affiche à quel(s) programme(s) de croissance ce lead est rattaché
// (growth_program_leads, appartenance multi-programme — Phase 3, visibilité
// cockpit). Distinct du sélecteur "Campagne" existant plus bas dans la fiche
// (relation 1-1 via leads.campaign_id) — un lead peut être dans plusieurs
// programmes en plus de sa campagne principale.
export function LeadProgramsBadge({ leadId }: { leadId: string }) {
  const { campaigns, getProgramsForLead } = useReach();
  const [programIds, setProgramIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProgramsForLead(leadId).then((ids) => { if (!cancelled) setProgramIds(ids); });
    return () => { cancelled = true; };
  }, [leadId, getProgramsForLead]);

  const programs = (programIds ?? [])
    .map((id) => campaigns.find((c) => c.id === id))
    .filter((c): c is Campaign => !!c && !!c.goalType);

  if (programIds === null || programs.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Programmes</span>
      <div className="flex flex-wrap gap-1.5">
        {programs.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}`}
            className="flex items-center gap-1 text-[10px] font-bold text-[#167f5b] bg-[#167f5b]/10 border border-[#167f5b]/20 rounded-full px-2 py-1 hover:bg-[#167f5b]/15 transition-colors"
          >
            <Rocket className="h-2.5 w-2.5" />
            {c.name} — {GOAL_TYPE_LABELS[c.goalType!]}
          </Link>
        ))}
      </div>
    </div>
  );
}
