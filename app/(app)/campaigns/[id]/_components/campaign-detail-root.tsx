'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useReach, type Campaign } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import {
  ChevronLeft, Megaphone, Tag, MapPin, Calendar, Users, CheckCircle2, TrendingUp, Mail, Play, Pause,
  Edit2, Check, X, Rocket, FolderKanban, CalendarClock, Zap, AlertTriangle, Plus, Flame, Snowflake,
  Send, MailOpen, MousePointerClick, XCircle, Sparkles, Search, Copy, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Lead } from '@/lib/mock-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GOAL_TYPE_LABELS: Record<NonNullable<Campaign['goalType']>, { label: string; unit: string }> = {
  rdv: { label: 'Remplir mon agenda', unit: 'RDV' },
  clients: { label: 'Signer des clients', unit: 'clients' },
  mrr: { label: 'Faire croître le MRR', unit: '$ MRR' },
};

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
  'Proposal Sent': 'bg-violet-50 text-violet-700',
  'Negotiation': 'bg-amber-50 text-amber-700',
  'Won': 'bg-[#059669]/10 text-[#059669]',
  'Lost': 'bg-red-50 text-red-600',
};

type Tab = 'overview' | 'leads' | 'activity' | 'sequence' | 'analytics';

export function CampaignDetailRoot({ id }: { id: string }) {
  const { campaigns, leads, projects, tasks, updateCampaign, updateLead, isDataReady } = useReach();
  const [tab, setTab] = useState<Tab>('overview');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [addLeadsQuery, setAddLeadsQuery] = useState('');

  const campaign = campaigns.find(c => c.id === id);
  const campaignLeads = useMemo(() => leads.filter(l => l.campaignId === id), [leads, id]);
  const availableLeads = useMemo(
    () => leads.filter(l => l.campaignId !== id && (
      !addLeadsQuery.trim() || l.businessName.toLowerCase().includes(addLeadsQuery.trim().toLowerCase())
    )),
    [leads, id, addLeadsQuery]
  );

  // Phase 6 — lien vers projects/agenda (dérivé, aucune nouvelle table pour
  // les projets ; tasks.leadId pour l'agenda).
  const campaignLeadIds = useMemo(() => new Set(campaignLeads.map(l => l.id)), [campaignLeads]);
  const linkedProjects = useMemo(
    () => projects.filter(p => campaignLeads.some(l => l.projectId === p.id)),
    [projects, campaignLeads]
  );
  const linkedMeetings = useMemo(
    () => tasks
      .filter(t => t.category === 'Meeting' && t.leadId && campaignLeadIds.has(t.leadId))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [tasks, campaignLeadIds]
  );

  // Autopilot (v3.93.0 — moteur de contrôle, lib/autopilot-controller.ts)
  const [dailyEmailCap, setDailyEmailCap] = useState(campaign?.autopilotDailyEmailCap ?? 30);
  const [weeklyMeetingCap, setWeeklyMeetingCap] = useState(campaign?.autopilotWeeklyMeetingCap ?? 5);
  const [autopilotActionLoading, setAutopilotActionLoading] = useState(false);
  const [autopilotLogRefreshKey, setAutopilotLogRefreshKey] = useState(0);

  const handleAutopilotAction = async (action: 'activate' | 'suspend' | 'resume') => {
    if (!campaign || autopilotActionLoading) return;
    setAutopilotActionLoading(true);
    try {
      if (action === 'activate') {
        // Persiste les plafonds saisis avant l'activation — la route serveur
        // ne fait que la transition d'état + le journal.
        updateCampaign(id, {
          autopilotDailyEmailCap: dailyEmailCap,
          autopilotWeeklyMeetingCap: weeklyMeetingCap,
        });
      }
      const res = await fetch(getApiUrl(`/api/campaigns/${id}/autopilot`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const optimistic = action === 'activate'
          ? { autopilotState: 'autopilot' as const, autopilotEnabled: true, status: 'active' as const, autopilotPausedReason: '', autopilotPausedAt: '' }
          : action === 'resume'
          ? { autopilotState: 'autopilot' as const, autopilotEnabled: true, autopilotPausedReason: '', autopilotPausedAt: '' }
          : { autopilotState: 'suspended' as const, autopilotEnabled: false, status: 'paused' as const, autopilotPausedReason: 'Suspendu manuellement.', autopilotPausedAt: new Date().toISOString() };
        updateCampaign(id, optimistic);
        setAutopilotLogRefreshKey((k) => k + 1);
      }
    } finally {
      setAutopilotActionLoading(false);
    }
  };

  if (!campaign) {
    // Un accès direct à l'URL (deep-link/refresh) arrive ici avant que
    // ReachContext ait fini de charger — sans ce garde-fou, on affichait
    // "Campagne introuvable" à tort pendant le chargement initial.
    if (!isDataReady) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#e5e5e0] border-t-[#059669] animate-spin" />
        </div>
      );
    }
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
    mrrTotal: campaignLeads.filter(l => l.status === 'Won').reduce((sum, l) => sum + (l.dealAmount ?? 0), 0),
  };

  // Uplift (Phase 5) — conversion des leads de ce programme vs. le reste du
  // pipeline (leads hors de toute campagne principale ou d'une autre
  // campagne), pour situer l'impact réel du programme.
  const baselineLeads = leads.filter(l => l.campaignId !== id);
  const baselineConversionRate = baselineLeads.length > 0
    ? Math.round((baselineLeads.filter(l => l.status === 'Won').length / baselineLeads.length) * 100)
    : 0;
  const upliftPoints = kpis.conversionRate - baselineConversionRate;

  const statusBreakdown = (['New', 'Contacted', 'Meeting Booked', 'Won', 'Lost'] as Lead['status'][]).map(s => ({
    status: s,
    count: campaignLeads.filter(l => l.status === s).length,
    pct: campaignLeads.length > 0 ? Math.round((campaignLeads.filter(l => l.status === s).length / campaignLeads.length) * 100) : 0,
  })).filter(s => s.count > 0);

  // Funnel par source / par niche (Phase 5)
  const bySource = Array.from(new Set(campaignLeads.map(l => l.source || 'Inconnue'))).map(source => {
    const group = campaignLeads.filter(l => (l.source || 'Inconnue') === source);
    return { key: source, total: group.length, won: group.filter(l => l.status === 'Won').length };
  }).sort((a, b) => b.total - a.total);

  const byNiche = Array.from(new Set(campaignLeads.map(l => l.niche || 'Inconnue'))).map(niche => {
    const group = campaignLeads.filter(l => (l.niche || 'Inconnue') === niche);
    return { key: niche, total: group.length, won: group.filter(l => l.status === 'Won').length };
  }).sort((a, b) => b.total - a.total);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'leads', label: `Leads (${kpis.total})` },
    { id: 'activity', label: 'Activité' },
    { id: 'sequence', label: 'Séquence' },
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
              <Link
                href={`/campaigns/new?duplicate=${id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e5e5e0] text-[#26251e] text-xs font-bold hover:bg-[#f4f4f3] transition-colors"
              >
                <Copy className="h-3 w-3" />Dupliquer
              </Link>
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

        {/* Programme de croissance — objectif & progression */}
        {campaign.goalType && (() => {
          const current = campaign.goalType === 'clients' ? kpis.won : campaign.goalType === 'rdv' ? kpis.meeting : kpis.mrrTotal;
          const target = campaign.targetValue ?? 0;
          const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : null;
          return (
            <div className="rounded-xl border border-[#059669]/20 bg-[#059669]/5 p-4 space-y-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-[#059669]" />
                  <span className="text-xs font-bold text-[#26251e]">{GOAL_TYPE_LABELS[campaign.goalType].label}</span>
                </div>
                <span className="text-xs font-bold text-[#059669]">
                  {current} / {target} {GOAL_TYPE_LABELS[campaign.goalType].unit}
                </span>
              </div>
              {pct !== null && (
                <div className="h-1.5 rounded-full bg-white overflow-hidden">
                  <div className="h-full bg-[#059669] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
              {campaignLeads.length > 0 && (
                <p className="text-[10px] text-[#7a7a76]">
                  Conversion {kpis.conversionRate}% —{' '}
                  <span className={cn('font-bold', upliftPoints >= 0 ? 'text-[#059669]' : 'text-red-600')}>
                    {upliftPoints >= 0 ? '+' : ''}{upliftPoints} pts
                  </span>{' '}
                  vs. le reste du pipeline ({baselineConversionRate}%)
                </p>
              )}
            </div>
          );
        })()}

        {/* Autopilot status — moteur de contrôle (v3.93.0) */}
        {campaign.goalType && (
          <AutopilotStatusCard
            campaign={campaign}
            dailyEmailCap={dailyEmailCap}
            weeklyMeetingCap={weeklyMeetingCap}
            onDailyEmailCapChange={setDailyEmailCap}
            onWeeklyMeetingCapChange={setWeeklyMeetingCap}
            onAction={handleAutopilotAction}
            actionLoading={autopilotActionLoading}
            logRefreshKey={autopilotLogRefreshKey}
          />
        )}

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
            {(() => {
              let config: { channels?: string[]; dailyVolumeCap?: number; requireApproval?: boolean } | null = null;
              try { config = campaign.sequenceConfig ? JSON.parse(campaign.sequenceConfig) : null; } catch { config = null; }
              if (!config) return null;
              return (
                <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Automatisation</h3>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="text-[#26251e]"><strong>Canaux :</strong> {(config.channels || []).join(', ') || '—'}</span>
                    <span className="text-[#26251e]"><strong>Volume max :</strong> {config.dailyVolumeCap ?? '—'} contacts/jour</span>
                    <span className="text-[#26251e]"><strong>Approbation :</strong> {config.requireApproval ? 'Manuelle' : 'Automatique'}</span>
                  </div>
                </div>
              );
            })()}

            {(linkedProjects.length > 0 || linkedMeetings.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {linkedProjects.length > 0 && (
                  <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                      <FolderKanban className="h-3 w-3" />Projets liés
                    </h3>
                    {linkedProjects.map(p => (
                      <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between text-xs hover:text-[#059669] transition-colors">
                        <span className="text-[#26251e]">{p.name}</span>
                        <span className="text-[#7a7a76]">{campaignLeads.filter(l => l.projectId === p.id).length} lead(s)</span>
                      </Link>
                    ))}
                  </div>
                )}
                {linkedMeetings.length > 0 && (
                  <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                      <CalendarClock className="h-3 w-3" />RDV agenda
                    </h3>
                    {linkedMeetings.slice(0, 6).map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs">
                        <span className="text-[#26251e] truncate">{t.title}</span>
                        <span className="text-[#7a7a76] shrink-0 ml-2">{new Date(t.dueDate).toLocaleDateString('fr-CA')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[#7a7a76]">Ajouter ou retirer des leads assigne/efface leur campagne principale (une seule à la fois).</p>
              <Button
                onClick={() => setShowAddLeads(v => !v)}
                className="h-8 px-3 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-lg gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter des leads
              </Button>
            </div>

            {showAddLeads && (
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
                  <input
                    value={addLeadsQuery}
                    onChange={e => setAddLeadsQuery(e.target.value)}
                    placeholder="Rechercher un lead à ajouter…"
                    className="w-full h-8 pl-8 pr-3 text-xs border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#059669]"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#e5e5e0]/60">
                  {availableLeads.length === 0 ? (
                    <p className="text-xs text-[#7a7a76] py-3 text-center">Aucun lead disponible.</p>
                  ) : (
                    availableLeads.slice(0, 50).map(l => (
                      <div key={l.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#26251e] truncate">{l.businessName}</p>
                          <p className="text-[10px] text-[#7a7a76]">{l.city} · {l.niche}{l.campaignId ? ' · déjà dans une autre campagne' : ''}</p>
                        </div>
                        <button
                          onClick={() => updateLead(l.id, { campaignId: id })}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-[#059669]/10 text-[#059669] text-[10px] font-bold hover:bg-[#059669]/20 transition-colors"
                        >
                          <Plus className="h-3 w-3" />Ajouter
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {campaignLeads.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-[#e5e5e0]">
                <Users className="h-7 w-7 text-[#7a7a76]/30 mx-auto mb-2" />
                <p className="text-xs text-[#7a7a76]">Aucun lead. Ajoutez-en depuis le bouton ci-dessus ou via leur fiche.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#e5e5e0] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#f4f4f3] border-b border-[#e5e5e0]">
                    <tr>
                      {['Business', 'Contact', 'Ville', 'Niche', 'Statut', 'Fit', 'Score', ''].map(h => (
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
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => updateLead(l.id, { campaignId: '' })}
                            className="text-[10px] font-bold text-[#7a7a76] hover:text-red-600 transition-colors"
                          >
                            Retirer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Activity tab — flux d'événements e-mail (email_events) pour les leads de cette campagne */}
        {tab === 'activity' && (
          <CampaignActivityTab campaignLeads={campaignLeads} updateLead={updateLead} />
        )}

        {/* Sequence tab — séquence e-mail attachée à la campagne (v3.89.0) */}
        {tab === 'sequence' && (
          <CampaignSequenceTab campaignId={id} sequenceIds={campaign.sequenceIds} />
        )}

        {/* Analytics tab */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#26251e]">Pipeline par statut</h3>
            {statusBreakdown.length === 0 ? (
              <p className="text-xs text-[#7a7a76]">Aucune donnée disponible.</p>
            ) : (
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-3">
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBreakdown} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" vertical={false} />
                      <XAxis
                        dataKey="status"
                        tick={{ fontSize: 10, fill: '#807d72', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#807d72', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e5e0',
                          borderRadius: '10px',
                          fontSize: '11px',
                          color: '#26251e',
                          boxShadow: 'none',
                        }}
                        labelStyle={{ fontWeight: 'bold', color: '#26251e' }}
                      />
                      <Bar dataKey="count" name="Leads" fill="#059669" radius={[3, 3, 0, 0]} barSize={28} strokeWidth={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="pt-2 border-t border-[#e5e5e0]/60 text-[10px] text-[#7a7a76]">
                  Taux de conversion : <span className="font-bold text-[#059669]">{kpis.conversionRate}%</span>
                  {' '}— <span className={cn('font-bold', upliftPoints >= 0 ? 'text-[#059669]' : 'text-red-600')}>{upliftPoints >= 0 ? '+' : ''}{upliftPoints} pts</span> vs. reste du pipeline ({baselineConversionRate}%)
                </div>
              </div>
            )}

            {campaign.goalType === 'mrr' && (
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-5 flex items-center justify-between">
                <span className="text-xs font-bold text-[#26251e]">MRR généré par ce programme (leads gagnés)</span>
                <span className="text-lg font-black text-[#059669]">{kpis.mrrTotal.toLocaleString('fr-CA')} $</span>
              </div>
            )}

            {(bySource.length > 0 || byNiche.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bySource.length > 0 && (
                  <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Funnel par source</h4>
                    {bySource.map((s) => (
                      <div key={s.key} className="flex items-center justify-between text-xs">
                        <span className="text-[#26251e]">{s.key}</span>
                        <span className="text-[#7a7a76]">{s.total} leads · <span className="font-bold text-[#059669]">{s.won} gagnés</span></span>
                      </div>
                    ))}
                  </div>
                )}
                {byNiche.length > 0 && (
                  <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Funnel par niche</h4>
                    {byNiche.map((n) => (
                      <div key={n.key} className="flex items-center justify-between text-xs">
                        <span className="text-[#26251e]">{n.key}</span>
                        <span className="text-[#7a7a76]">{n.total} leads · <span className="font-bold text-[#059669]">{n.won} gagnés</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity tab — per-lead email_events feed for this campaign's leads ─────────

interface EmailEvent {
  id: string;
  event_type: string;
  subject: string | null;
  lead_id: string | null;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: typeof Send; color: string }> = {
  'email.sent': { label: 'Envoyé', icon: Send, color: '#7a7a76' },
  'email.delivered': { label: 'Envoyé', icon: Send, color: '#7a7a76' },
  'email.opened': { label: 'Ouvert', icon: MailOpen, color: '#3b82f6' },
  'email.clicked': { label: 'Cliqué', icon: MousePointerClick, color: '#8b5cf6' },
  'email.bounced': { label: 'Échec', icon: XCircle, color: '#dc2626' },
  'email.complained': { label: 'Plainte', icon: XCircle, color: '#dc2626' },
};

function CampaignActivityTab({ campaignLeads, updateLead }: { campaignLeads: Lead[]; updateLead: (id: string, fields: Partial<Lead>) => void }) {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const leadById = useMemo(() => new Map(campaignLeads.map(l => [l.id, l])), [campaignLeads]);

  useEffect(() => {
    const leadIds = campaignLeads.map(l => l.id);
    if (leadIds.length === 0) { setEvents([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('email_events')
      .select('id, event_type, subject, lead_id, created_at')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }: { data: EmailEvent[] | null }) => { if (!cancelled) setEvents(data || []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignLeads.map(l => l.id).join(',')]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-[#e5e5e0]">
        <Mail className="h-7 w-7 text-[#7a7a76]/30 mx-auto mb-2" />
        <p className="text-xs text-[#7a7a76]">Aucun événement e-mail pour les leads de cette campagne.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map(ev => {
        const conf = EVENT_CONFIG[ev.event_type] || { label: ev.event_type, icon: Mail, color: '#7a7a76' };
        const Icon = conf.icon;
        const lead = ev.lead_id ? leadById.get(ev.lead_id) : undefined;
        return (
          <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e5e0] bg-white">
            <div className="w-7 h-7 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5" style={{ color: conf.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {lead ? (
                  <Link href={`/leads/${lead.id}`} className="text-xs font-semibold text-[#26251e] hover:text-[#059669] transition-colors truncate">{lead.businessName}</Link>
                ) : (
                  <span className="text-xs font-semibold text-[#7a7a76]">Lead inconnu</span>
                )}
                <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: conf.color }}>{conf.label}</span>
              </div>
              {ev.subject && <p className="text-[10px] text-[#7a7a76] truncate">{ev.subject}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[#7a7a76]">{new Date(ev.created_at).toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit' })}</span>
              {lead && (
                <>
                  <button onClick={() => updateLead(lead.id, { temperature: 'Hot' })} title="Marquer chaud" className="p-1 rounded hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-orange-500 transition-colors">
                    <Flame className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => updateLead(lead.id, { temperature: 'Cold' })} title="Marquer froid" className="p-1 rounded hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-blue-500 transition-colors">
                    <Snowflake className="h-3.5 w-3.5" />
                  </button>
                  <Link href={`/leads/${lead.id}`} title="Relancer" className="p-1 rounded hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#059669] transition-colors">
                    <Send className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sequence tab — sequence_templates row attached via campaigns.sequence_ids ───

interface SequenceTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  steps: Array<{ type: string }>;
}

function CampaignSequenceTab({ campaignId, sequenceIds }: { campaignId: string; sequenceIds?: string[] }) {
  const templateId = sequenceIds?.[0];
  const [template, setTemplate] = useState<SequenceTemplateSummary | null>(null);
  const [loading, setLoading] = useState(!!templateId);

  useEffect(() => {
    if (!templateId) { setTemplate(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(getApiUrl(`/api/outreach/sequences?id=${templateId}`))
      .then(r => r.json())
      .then(data => { if (!cancelled && data?.id) setTemplate(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [templateId]);

  if (loading) {
    return <div className="h-24 rounded-xl border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse" />;
  }

  if (!template) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-[#e5e5e0] space-y-3">
        <Sparkles className="h-7 w-7 text-[#7a7a76]/30 mx-auto" />
        <p className="text-xs text-[#7a7a76]">Aucune séquence e-mail attachée à cette campagne.</p>
        <Link
          href={`/outreach/sequences/new?campaignId=${campaignId}`}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />Créer une séquence
        </Link>
      </div>
    );
  }

  const stepCounts = template.steps.reduce<Record<string, number>>((acc, s) => { acc[s.type] = (acc[s.type] || 0) + 1; return acc; }, {});

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#26251e]">{template.name}</p>
          {template.description && <p className="text-xs text-[#7a7a76] mt-0.5">{template.description}</p>}
        </div>
        <Link
          href={`/outreach/sequences/${template.id}/edit?campaignId=${campaignId}`}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-xs font-bold text-[#26251e] transition-colors"
        >
          <Edit2 className="h-3 w-3" />Éditer
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e5e5e0]/60">
        {Object.entries(stepCounts).map(([type, count]) => (
          <span key={type} className="text-[10px] font-semibold text-[#7a7a76] bg-[#f4f4f3] px-2 py-1 rounded-lg">
            {count}× {type === 'email' ? 'e-mail' : type === 'delay' ? 'délai' : type === 'task' ? 'tâche' : 'condition'}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Autopilot status — moteur de contrôle (v3.93.0, lib/autopilot-controller.ts) ─

interface ProgramActionLogRow {
  id: string;
  action_type: 'autopilot_activated' | 'autopilot_suspended' | 'autopilot_resumed' | 'autopilot_cycle';
  reasoning: string | null;
  result: Record<string, unknown> | null;
  incident: boolean;
  created_at: string;
}

const AUTOPILOT_STATE_CONFIG: Record<NonNullable<Campaign['autopilotState']>, { label: string; classes: string }> = {
  draft: { label: 'Brouillon', classes: 'bg-muted/60 text-muted-foreground border-border' },
  active: { label: 'Active (manuel)', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  autopilot: { label: 'Autopilot actif', classes: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' },
  suspended: { label: 'Suspendu', classes: 'bg-red-50 text-red-600 border-red-200' },
  completed: { label: 'Terminé', classes: 'bg-muted/60 text-muted-foreground border-border' },
};

const LOG_ACTION_CONFIG: Record<ProgramActionLogRow['action_type'], { label: string; icon: typeof Zap }> = {
  autopilot_activated: { label: 'Activé', icon: Play },
  autopilot_resumed: { label: 'Repris', icon: Play },
  autopilot_suspended: { label: 'Suspendu', icon: Pause },
  autopilot_cycle: { label: 'Cycle', icon: Zap },
};

function AutopilotStatusCard({
  campaign,
  dailyEmailCap,
  weeklyMeetingCap,
  onDailyEmailCapChange,
  onWeeklyMeetingCapChange,
  onAction,
  actionLoading,
  logRefreshKey,
}: {
  campaign: Campaign;
  dailyEmailCap: number;
  weeklyMeetingCap: number;
  onDailyEmailCapChange: (v: number) => void;
  onWeeklyMeetingCapChange: (v: number) => void;
  onAction: (action: 'activate' | 'suspend' | 'resume') => void;
  actionLoading: boolean;
  logRefreshKey: number;
}) {
  const [logs, setLogs] = useState<ProgramActionLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const state = campaign.autopilotState ?? 'draft';
  const stateConf = AUTOPILOT_STATE_CONFIG[state];

  useEffect(() => {
    let cancelled = false;
    setLoadingLogs(true);
    const supabase = createClient();
    supabase
      .from('program_actions_log')
      .select('id, action_type, reasoning, result, incident, created_at')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: { data: ProgramActionLogRow[] | null }) => { if (!cancelled) setLogs(data || []); })
      .finally(() => { if (!cancelled) setLoadingLogs(false); });
    return () => { cancelled = true; };
  }, [campaign.id, logRefreshKey]);

  const lastLog = logs[0];
  const capsLocked = state === 'autopilot';

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className={cn('h-4 w-4', state === 'autopilot' ? 'text-[#059669]' : 'text-[#7a7a76]')} />
          <span className="text-xs font-bold text-[#26251e]">Autopilot</span>
          <span className={cn('text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border', stateConf.classes)}>
            {stateConf.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7a7a76]" />}
          {state === 'autopilot' ? (
            <button
              onClick={() => onAction('suspend')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Suspendre
            </button>
          ) : state === 'suspended' ? (
            <button
              onClick={() => onAction('resume')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#059669] text-white hover:bg-[#047857] transition-colors disabled:opacity-50"
            >
              Reprendre
            </button>
          ) : state !== 'completed' ? (
            <button
              onClick={() => onAction('activate')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#e5e5e0] text-[#26251e] hover:bg-[#f4f4f3] transition-colors disabled:opacity-50"
            >
              Activer Autopilot
            </button>
          ) : null}
        </div>
      </div>

      {campaign.autopilotPausedReason && state === 'suspended' && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2.5 text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{campaign.autopilotPausedReason}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Plafond emails/jour</label>
          <input
            type="number"
            min={1}
            value={dailyEmailCap}
            onChange={(e) => onDailyEmailCapChange(Number(e.target.value))}
            disabled={capsLocked}
            className="w-20 text-xs border border-[#e5e5e0] rounded-lg px-2 py-1.5 disabled:bg-[#f4f4f3] disabled:text-[#7a7a76]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Cible RDV/semaine</label>
          <input
            type="number"
            min={1}
            value={weeklyMeetingCap}
            onChange={(e) => onWeeklyMeetingCapChange(Number(e.target.value))}
            disabled={capsLocked}
            className="w-20 text-xs border border-[#e5e5e0] rounded-lg px-2 py-1.5 disabled:bg-[#f4f4f3] disabled:text-[#7a7a76]"
          />
        </div>
      </div>

      {state === 'autopilot' && (
        <p className="text-[10px] text-[#7a7a76]">
          Plafond actuel : {campaign.autopilotDailyEmailCap ?? '—'} emails/jour · cible {campaign.autopilotWeeklyMeetingCap ?? '—'} RDV/semaine. Se suspend automatiquement si le taux de réponses négatives dépasse 40% (minimum 5 leads contactés).
        </p>
      )}

      {/* Journal — dernières actions/cycles du contrôleur */}
      <div className="pt-2 border-t border-[#e5e5e0]/60 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Journal</p>
        {loadingLogs ? (
          <div className="h-10 rounded-lg bg-[#f4f4f3] animate-pulse" />
        ) : logs.length === 0 ? (
          <p className="text-[11px] text-[#7a7a76] italic">Aucune action Autopilot enregistrée pour ce programme.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {logs.map((log) => {
              const conf = LOG_ACTION_CONFIG[log.action_type];
              const Icon = conf?.icon ?? Zap;
              return (
                <div key={log.id} className="flex items-start gap-2 text-[11px]">
                  <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', log.incident ? 'text-red-500' : 'text-[#7a7a76]')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-bold', log.incident ? 'text-red-600' : 'text-[#26251e]')}>{conf?.label ?? log.action_type}</span>
                      {log.incident && (
                        <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Incident</span>
                      )}
                      <span className="text-[9px] text-[#7a7a76] shrink-0">
                        {new Date(log.created_at).toLocaleDateString('fr-CA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.reasoning && <p className="text-[#555552] leading-relaxed">{log.reasoning}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {lastLog?.result && Object.keys(lastLog.result).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {'emailsSentToday' in lastLog.result && (
              <span className="text-[9px] font-semibold text-[#7a7a76] bg-[#f4f4f3] px-2 py-1 rounded-lg">
                {String(lastLog.result.emailsSentToday)} emails envoyés aujourd&apos;hui
              </span>
            )}
            {'meetingsThisWeek' in lastLog.result && (
              <span className="text-[9px] font-semibold text-[#7a7a76] bg-[#f4f4f3] px-2 py-1 rounded-lg">
                {String(lastLog.result.meetingsThisWeek)} RDV cette semaine
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
