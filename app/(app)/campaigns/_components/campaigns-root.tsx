'use client';

import React from 'react';
import Link from 'next/link';
import { useReach, type Campaign } from '@/lib/reach-context';
import { OutreachNavBar } from '@/components/outreach-nav-bar';
import { Megaphone, Plus, Play, Pause, CheckCircle2, FileEdit, Trash2, Calendar, MapPin, Tag, Rocket, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOAL_TYPE_LABELS: Record<NonNullable<Campaign['goalType']>, { label: string; unit: string }> = {
  rdv: { label: 'Remplir mon agenda', unit: 'RDV' },
  clients: { label: 'Signer des clients', unit: 'clients' },
  mrr: { label: 'Faire croître le MRR', unit: '$ MRR' },
};

const STATUS_LABELS: Record<Campaign['status'], string> = {
  active: 'Active',
  paused: 'En pause',
  completed: 'Terminée',
  draft: 'Brouillon',
};
const STATUS_COLORS: Record<Campaign['status'], string> = {
  active: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-muted/60 text-muted-foreground border-border',
};

export function CampaignsRoot() {
  const { campaigns, leads, updateCampaign, deleteCampaign } = useReach();

  const getCampaignLeads = (campaignId: string) => leads.filter(l => l.campaignId === campaignId);

  const getKpis = (campaignId: string) => {
    const cl = getCampaignLeads(campaignId);
    return {
      total: cl.length,
      contacted: cl.filter(l => l.status !== 'New').length,
      won: cl.filter(l => l.status === 'Won').length,
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <OutreachNavBar />
      <div className="flex-1 overflow-y-auto bg-[#fafaf8] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      <div className="relative z-10 w-full p-3 sm:p-4 md:p-6 pb-32 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#059669]" />
              <h1 className="text-base font-bold text-[#26251e]">Campagnes</h1>
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">{campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle campagne
          </Link>
        </div>

        {/* Empty state */}
        {campaigns.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#e5e5e0]">
            <Megaphone className="h-8 w-8 text-[#7a7a76]/40" />
            <p className="text-sm font-bold text-[#26251e]">Aucune campagne</p>
            <p className="text-xs text-[#7a7a76] max-w-xs">Créez votre première campagne pour regrouper leads, séquences et analytics par objectif.</p>
            <Link
              href="/campaigns/new"
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer une campagne
            </Link>
          </div>
        )}

        {/* Campaign cards grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map(campaign => {
            const kpis = getKpis(campaign.id);
            return (
              <div key={campaign.id} className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-4 hover:border-[#059669]/30 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/campaigns/${campaign.id}`} className="text-xs font-bold text-[#26251e] hover:text-[#059669] transition-colors line-clamp-1">
                      {campaign.name}
                    </Link>
                    {campaign.description && (
                      <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-2">{campaign.description}</p>
                    )}
                  </div>
                  <span className={cn('text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0', STATUS_COLORS[campaign.status])}>
                    {STATUS_LABELS[campaign.status]}
                  </span>
                </div>

                {/* Programme de croissance */}
                {campaign.goalType && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#059669] bg-[#059669]/5 border border-[#059669]/20 rounded-lg px-2.5 py-1.5 w-fit">
                    <Rocket className="h-3 w-3" />
                    {GOAL_TYPE_LABELS[campaign.goalType].label}
                    {campaign.targetValue !== undefined && (
                      <span className="text-[#7a7a76] font-semibold">— cible {campaign.targetValue} {GOAL_TYPE_LABELS[campaign.goalType].unit}</span>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {campaign.niches.slice(0, 3).map(n => (
                    <span key={n} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] text-[#555552]">
                      <Tag className="h-2 w-2" />{n}
                    </span>
                  ))}
                  {campaign.cities.slice(0, 2).map(c => (
                    <span key={c} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                      <MapPin className="h-2 w-2" />{c}
                    </span>
                  ))}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#e5e5e0]/60">
                  {[
                    { label: 'Leads', value: kpis.total, color: '#26251e' },
                    { label: 'Contactés', value: kpis.contacted, color: '#3b82f6' },
                    { label: 'Gagnés', value: kpis.won, color: '#059669' },
                  ].map(k => (
                    <div key={k.label} className="text-center">
                      <p className="text-base font-black" style={{ color: k.color }}>{k.value}</p>
                      <p className="text-[9px] text-[#7a7a76]">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  {campaign.startDate && (
                    <div className="flex items-center gap-1 text-[10px] text-[#7a7a76]">
                      <Calendar className="h-3 w-3" />
                      {new Date(campaign.startDate).toLocaleDateString('fr-CA')}
                    </div>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    {campaign.status === 'active' ? (
                      <button onClick={() => updateCampaign(campaign.id, { status: 'paused' })} title="Mettre en pause" className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition-colors">
                        <Pause className="h-3 w-3" />
                      </button>
                    ) : campaign.status === 'paused' ? (
                      <button onClick={() => updateCampaign(campaign.id, { status: 'active' })} title="Reprendre" className="p-1.5 rounded hover:bg-[#059669]/10 text-[#059669] transition-colors">
                        <Play className="h-3 w-3" />
                      </button>
                    ) : null}
                    <button onClick={() => updateCampaign(campaign.id, { status: 'completed' })} title="Marquer terminée" className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors">
                      <CheckCircle2 className="h-3 w-3" />
                    </button>
                    <Link href={`/campaigns/${campaign.id}`} className="p-1.5 rounded hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors">
                      <FileEdit className="h-3 w-3" />
                    </Link>
                    <Link href={`/campaigns/new?duplicate=${campaign.id}`} title="Dupliquer" className="p-1.5 rounded hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors">
                      <Copy className="h-3 w-3" />
                    </Link>
                    <button onClick={() => deleteCampaign(campaign.id)} title="Supprimer" className="p-1.5 rounded hover:bg-red-50 text-[#7a7a76] hover:text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
