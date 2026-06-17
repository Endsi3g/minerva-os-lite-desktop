'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useReach, type Campaign } from '@/lib/reach-context';
import { Megaphone, Plus, Play, Pause, CheckCircle2, FileEdit, Trash2, Calendar, Users, MapPin, Tag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function NewCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Campaign) => void }) {
  const { addCampaign } = useReach();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [niches, setNiches] = useState('');
  const [cities, setCities] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const c = await addCampaign({
      name: name.trim(),
      description: description.trim() || undefined,
      niches: niches.split(',').map(s => s.trim()).filter(Boolean),
      cities: cities.split(',').map(s => s.trim()).filter(Boolean),
      startDate: startDate || undefined,
    });
    setSaving(false);
    if (c) { onCreated(c); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[95vw] p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#26251e]">Nouvelle campagne</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="ex: Restaurants Montréal Juin" className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objectif, contexte..." rows={2} className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Niches (virgule)</label>
              <input value={niches} onChange={e => setNiches(e.target.value)} placeholder="Restaurant, Coiffeur" className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Villes (virgule)</label>
              <input value={cities} onChange={e => setCities(e.target.value)} placeholder="Montréal, Laval" className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Date de début</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-[#555552] border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors">Annuler</button>
          <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5">
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Créer la campagne
          </button>
        </div>
      </form>
    </div>
  );
}

export function CampaignsRoot() {
  const { campaigns, leads, updateCampaign, deleteCampaign } = useReach();
  const [showNew, setShowNew] = useState(false);
  const [created, setCreated] = useState<Campaign | null>(null);

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#059669]" />
              <h1 className="text-base font-bold text-[#26251e]">Campagnes</h1>
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">{campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Nouvelle campagne
          </button>
        </div>

        {/* Empty state */}
        {campaigns.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#e5e5e0]">
            <Megaphone className="h-8 w-8 text-[#7a7a76]/40" />
            <p className="text-sm font-bold text-[#26251e]">Aucune campagne</p>
            <p className="text-xs text-[#7a7a76] max-w-xs">Créez votre première campagne pour regrouper leads, séquences et analytics par objectif.</p>
            <button onClick={() => setShowNew(true)} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Créer une campagne
            </button>
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

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onCreated={setCreated} />}
    </div>
  );
}
