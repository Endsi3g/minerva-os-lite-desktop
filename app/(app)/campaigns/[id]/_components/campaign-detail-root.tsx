'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReach, type Campaign } from '@/lib/reach-context';
import { ChevronLeft, Megaphone, Tag, MapPin, Calendar, Users, CheckCircle2, TrendingUp, Mail, Play, Pause, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/mock-data';

const STATUS_COLORS: Record<Campaign['status'], string> = {
  active: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-muted/60 text-muted-foreground border-border',
};

const LEAD_STATUS_COLORS: Record<Lead['status'], string> = {
  'New': 'bg-[#7a7a76]/10 text-[#7a7a76]',
  'Contacted': 'bg-blue-50 text-blue-700',
  'Meeting Booked': 'bg-violet-50 text-violet-700',
  'Won': 'bg-[#059669]/10 text-[#059669]',
  'Lost': 'bg-red-50 text-red-600',
};

type Tab = 'overview' | 'leads' | 'analytics';

export function CampaignDetailRoot({ id }: { id: string }) {
  const { campaigns, leads, updateCampaign } = useReach();
  const [tab, setTab] = useState<Tab>('overview');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');

  const campaign = campaigns.find(c => c.id === id);
  const campaignLeads = useMemo(() => leads.filter(l => l.campaignId === id), [leads, id]);

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Megaphone className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Campagne introuvable.</p>
        <Link href="/campaigns" className="text-xs text-[#059669] hover:underline">← Retour aux campagnes</Link>
      </div>
    );
  }

  const kpis = {
    total: campaignLeads.length,
    contacted: campaignLeads.filter(l => l.status !== 'New').length,
    meeting: campaignLeads.filter(l => l.status === 'Meeting Booked').length,
    won: campaignLeads.filter(l => l.status === 'Won').length,
    conversionRate: campaignLeads.length > 0 ? Math.round((campaignLeads.filter(l => l.status === 'Won').length / campaignLeads.length) * 100) : 0,
  };

  const statusBreakdown = (['New', 'Contacted', 'Meeting Booked', 'Won', 'Lost'] as Lead['status'][]).map(s => ({
    status: s,
    count: campaignLeads.filter(l => l.status === s).length,
    pct: campaignLeads.length > 0 ? Math.round((campaignLeads.filter(l => l.status === s).length / campaignLeads.length) * 100) : 0,
  })).filter(s => s.count > 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'leads', label: `Leads (${kpis.total})` },
    { id: 'analytics', label: 'Analytics' },
  ];

  const handleSaveName = () => {
    if (nameVal.trim() && nameVal !== campaign.name) updateCampaign(id, { name: nameVal.trim() });
    setEditingName(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full p-3 sm:p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Link href="/campaigns" className="inline-flex items-center gap-1 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
            Campagnes
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                    className="text-xl font-bold text-[#26251e] bg-transparent border-b border-[#059669] focus:outline-none w-full"
                  />
                  <button onClick={handleSaveName} className="p-1 text-[#059669]"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditingName(false)} className="p-1 text-[#7a7a76]"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-xl font-bold text-[#26251e]">{campaign.name}</h1>
                  <button onClick={() => { setNameVal(campaign.name); setEditingName(true); }} className="opacity-0 group-hover:opacity-100 p-1 text-[#7a7a76] hover:text-[#26251e] transition-all">
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              {campaign.description && <p className="text-xs text-[#7a7a76] mt-1">{campaign.description}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border', STATUS_COLORS[campaign.status])}>
                {campaign.status === 'active' ? 'Active' : campaign.status === 'paused' ? 'En pause' : campaign.status === 'completed' ? 'Terminée' : 'Brouillon'}
              </span>
              {campaign.status === 'active' ? (
                <button onClick={() => updateCampaign(id, { status: 'paused' })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors">
                  <Pause className="h-3 w-3" />Pause
                </button>
              ) : campaign.status === 'paused' ? (
                <button onClick={() => updateCampaign(id, { status: 'active' })} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] transition-colors">
                  <Play className="h-3 w-3" />Reprendre
                </button>
              ) : null}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            {campaign.niches.map(n => (
              <span key={n} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] text-[#555552]">
                <Tag className="h-2.5 w-2.5" />{n}
              </span>
            ))}
            {campaign.cities.map(c => (
              <span key={c} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">
                <MapPin className="h-2.5 w-2.5" />{c}
              </span>
            ))}
            {campaign.startDate && (
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-[#f4f4f3] border border-[#e5e5e0] text-[#555552]">
                <Calendar className="h-2.5 w-2.5" />Depuis le {new Date(campaign.startDate).toLocaleDateString('fr-CA')}
              </span>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Leads', value: kpis.total, icon: Users, color: '#26251e' },
            { label: 'Contactés', value: kpis.contacted, icon: Mail, color: '#3b82f6' },
            { label: 'RDV', value: kpis.meeting, icon: Calendar, color: '#8b5cf6' },
            { label: 'Gagnés', value: kpis.won, icon: CheckCircle2, color: '#059669' },
            { label: 'Conversion', value: `${kpis.conversionRate}%`, icon: TrendingUp, color: '#f59e0b' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-[#e5e5e0] bg-white p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                <k.icon className="h-4 w-4" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-[10px] text-[#7a7a76]">{k.label}</p>
                <p className="text-base font-black text-[#26251e]">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0] w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('px-4 py-1.5 rounded-md text-xs font-bold transition-all', tab === t.id ? 'bg-white text-[#26251e] shadow-sm border border-[#e5e5e0]' : 'text-[#7a7a76] hover:text-[#26251e]')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#26251e]">Leads récents</h3>
            {campaignLeads.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#e5e5e0]">
                <p className="text-xs text-[#7a7a76]">Aucun lead assigné à cette campagne.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#e5e5e0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#f4f4f3] border-b border-[#e5e5e0]">
                    <tr>
                      {['Business', 'Ville', 'Statut', 'Score'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e0]/60">
                    {campaignLeads.slice(0, 10).map(l => (
                      <tr key={l.id} className="hover:bg-[#f4f4f3]/40 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-[#26251e]">
                          <Link href={`/leads/${l.id}`} className="hover:text-[#059669] transition-colors">{l.businessName}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-[#7a7a76]">{l.city}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', LEAD_STATUS_COLORS[l.status])}>{l.status}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[#26251e]">{l.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Leads tab */}
        {tab === 'leads' && (
          <div>
            {campaignLeads.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-[#e5e5e0]">
                <Users className="h-7 w-7 text-[#7a7a76]/30 mx-auto mb-2" />
                <p className="text-xs text-[#7a7a76]">Aucun lead. Assignez des leads à cette campagne via leur fiche.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#e5e5e0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#f4f4f3] border-b border-[#e5e5e0]">
                    <tr>
                      {['Business', 'Contact', 'Ville', 'Niche', 'Statut', 'Fit', 'Score'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e0]/60">
                    {campaignLeads.map(l => (
                      <tr key={l.id} className="hover:bg-[#f4f4f3]/40 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-[#26251e]">
                          <Link href={`/leads/${l.id}`} className="hover:text-[#059669] transition-colors">{l.businessName}</Link>
                        </td>
                        <td className="px-4 py-2.5 text-[#7a7a76]">{l.contactName || '—'}</td>
                        <td className="px-4 py-2.5 text-[#7a7a76]">{l.city}</td>
                        <td className="px-4 py-2.5 text-[#7a7a76]">{l.niche}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', LEAD_STATUS_COLORS[l.status])}>{l.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {l.fitScore !== undefined ? (
                            <span className="font-mono text-[#059669]">{l.fitScore}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono">{l.score ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics tab */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#26251e]">Pipeline par statut</h3>
            {statusBreakdown.length === 0 ? (
              <p className="text-xs text-[#7a7a76]">Aucune donnée disponible.</p>
            ) : (
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-3">
                {statusBreakdown.map(s => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="w-28 text-[10px] text-[#7a7a76] truncate">{s.status}</span>
                    <div className="flex-1 h-2 bg-[#f4f4f3] rounded-full overflow-hidden">
                      <div className="h-full bg-[#059669] rounded-full" style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-[10px] font-bold text-[#26251e]">{s.count}</span>
                    <span className="w-8 text-right text-[10px] text-[#7a7a76]">{s.pct}%</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#e5e5e0]/60 text-[10px] text-[#7a7a76]">
                  Taux de conversion : <span className="font-bold text-[#059669]">{kpis.conversionRate}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
