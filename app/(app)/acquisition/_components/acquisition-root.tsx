'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import type { Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Clock, Check, Eye, GitMerge, AlertTriangle, Loader2, RefreshCw, Zap, Globe, Phone, Building2, ChevronRight } from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';

// ─── SLA Helper ──────────────────────────────────────────────────────────────

function formatSLA(createdAt?: string): { label: string; level: 'green' | 'amber' | 'red' } {
  if (!createdAt) return { label: 'Inconnu', level: 'red' };
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / 1000 / 60 / 60;
  const mins = Math.floor(ms / 1000 / 60);
  if (hours < 2) return { label: `Il y a ${mins}min`, level: 'green' };
  if (hours < 24) return { label: `Il y a ${Math.floor(hours)}h`, level: 'amber' };
  const days = Math.floor(hours / 24);
  return { label: `Il y a ${days}j`, level: 'red' };
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

const sourceBadgeClasses: Record<string, string> = {
  osm: 'bg-blue-50 text-blue-700 border-blue-100',
  csv: 'bg-purple-50 text-purple-700 border-purple-100',
  manual: 'bg-slate-50 text-slate-600 border-slate-200',
  form: 'bg-emerald-50 text-[#059669] border-emerald-100',
  facebook: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  google: 'bg-red-50 text-red-700 border-red-100',
  import: 'bg-purple-50 text-purple-700 border-purple-100',
};

const sourceLabels: Record<string, string> = {
  osm: 'OSM',
  csv: 'CSV',
  manual: 'Manuel',
  form: 'Formulaire',
  facebook: 'Facebook',
  google: 'Google Ads',
  import: 'Import',
};

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-[#059669] text-white'
      : score >= 50
      ? 'bg-amber-400 text-white'
      : 'bg-slate-300 text-slate-700';
  return (
    <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold font-mono', color)}>
      {score}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-50 text-blue-600 border-blue-100',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-100',
  'Meeting Booked': 'bg-purple-50 text-purple-700 border-purple-100',
  Won: 'bg-emerald-50 text-[#059669] border-emerald-100',
  Lost: 'bg-slate-50 text-slate-500 border-slate-200',
};

// ─── Speed-to-Lead Alert ──────────────────────────────────────────────────────

function SpeedToLeadAlert({ leads }: { leads: Lead[] }) {
  const urgentLeads = useMemo(() => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const twentyMinAgo = Date.now() - 20 * 60 * 1000;
    return leads.filter(l => {
      if (l.status !== 'New') return false;
      if (!l.createdAt) return false;
      const ts = new Date(l.createdAt).getTime();
      return ts > twentyMinAgo; // show for 20 min window
    }).map(l => ({
      ...l,
      elapsed: Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 1000 / 60),
      isBreached: new Date(l.createdAt).getTime() < fiveMinAgo,
    }));
  }, [leads]);

  if (urgentLeads.length === 0) return null;

  return (
    <div className="space-y-2">
      {urgentLeads.map(lead => (
        <div
          key={lead.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border',
            lead.isBreached
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          )}
        >
          <Zap className={cn('w-4 h-4 shrink-0', lead.isBreached ? 'text-red-500' : 'text-amber-500')} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-bold', lead.isBreached ? 'text-red-700' : 'text-amber-700')}>
              {lead.isBreached ? 'SLA dépassé — contactez immédiatement' : 'Speed-to-Lead — répondre en < 5 min'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {lead.businessName} · {lead.city} · il y a {lead.elapsed}min
            </p>
          </div>
          <Link
            href={`/leads/${lead.id}`}
            className={cn(
              'shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg border-0 transition-colors cursor-pointer',
              lead.isBreached
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            )}
          >
            Répondre
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── Dedup Tab ────────────────────────────────────────────────────────────────

interface DedupLead {
  id: string;
  businessName: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  city?: string;
  niche?: string;
  status: string;
  score?: number;
  createdAt: string;
  fieldCount: number;
  leadSourceType?: string;
}

interface DedupGroup {
  leads: DedupLead[];
  matchReasons: Array<'domain' | 'phone' | 'name'>;
  similarity: number;
}

function DedupTab({ workspaceId }: { workspaceId: string }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<DedupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [mergedGroups, setMergedGroups] = useState<Set<number>>(new Set());

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/leads/dedup?workspaceId=${workspaceId}`));
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const handleMerge = async (group: DedupGroup, idx: number) => {
    setMerging(`${idx}`);
    try {
      const res = await fetch(getApiUrl('/api/leads/merge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: group.leads.map(l => l.id), workspaceId }),
      });
      if (res.ok) {
        setMergedGroups(prev => new Set([...prev, idx]));
      }
    } finally {
      setMerging(null);
    }
  };

  const reasonLabels: Record<string, string> = {
    domain: t('dedup.match_domain'),
    phone: t('dedup.match_phone'),
    name: t('dedup.match_name'),
  };

  const reasonColors: Record<string, string> = {
    domain: 'bg-blue-50 text-blue-700 border-blue-100',
    phone: 'bg-amber-50 text-amber-700 border-amber-100',
    name: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  const activeGroups = groups.filter((_, i) => !mergedGroups.has(i));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Analyse des doublons…</span>
      </div>
    );
  }

  if (activeGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Check className="w-10 h-10 text-[#059669]" />
        <p className="text-sm font-semibold text-[#26251e]">{t('dedup.empty')}</p>
        <p className="text-xs text-muted-foreground">{t('dedup.empty_sub')}</p>
        <button
          type="button"
          onClick={fetchDuplicates}
          className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-[#555552] hover:bg-[#f4f4f3] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Réanalyser
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-[#26251e]">
            {activeGroups.length} groupe{activeGroups.length > 1 ? 's' : ''} de doublons détecté{activeGroups.length > 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchDuplicates}
          className="p-1.5 rounded-md border border-border bg-white text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-4">
        {activeGroups.map((group, idx) => {
          const realIdx = groups.indexOf(group);
          const isMerging = merging === `${realIdx}`;
          // Primary = most fields filled (shown with green border)
          const primary = [...group.leads].sort((a, b) => b.fieldCount - a.fieldCount)[0];

          return (
            <div key={idx} className="border border-amber-200 rounded-xl bg-white overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                    {t('dedup.group_label')} #{idx + 1}
                  </span>
                  <span className="text-[9px] font-bold text-amber-600">
                    {t('dedup.score_similarity')} : {group.similarity}%
                  </span>
                  <div className="flex gap-1">
                    {group.matchReasons.map(r => (
                      <span key={r} className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide', reasonColors[r])}>
                        {reasonLabels[r]}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleMerge(group, realIdx)}
                  disabled={isMerging}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] transition-colors border-0 cursor-pointer disabled:opacity-60"
                >
                  {isMerging
                    ? <><Loader2 className="w-3 h-3 animate-spin" />{t('dedup.merging')}</>
                    : <><GitMerge className="w-3 h-3" />{t('dedup.merge')}</>}
                </button>
              </div>

              {/* Leads in group */}
              <div className="divide-y divide-[#f4f4f3]">
                {group.leads.map(lead => {
                  const isPrimary = lead.id === primary.id;
                  return (
                    <div
                      key={lead.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        isPrimary && 'bg-[#059669]/3'
                      )}
                    >
                      {isPrimary && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                          Principal
                        </span>
                      )}
                      {!isPrimary && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Doublon
                        </span>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#26251e] truncate">{lead.businessName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {lead.city && (
                            <span className="text-[10px] text-muted-foreground">{lead.city}</span>
                          )}
                          {lead.contactEmail && (
                            <span className="text-[10px] text-muted-foreground truncate">{lead.contactEmail}</span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Phone className="w-2.5 h-2.5" />{lead.phone}
                            </span>
                          )}
                          {lead.website && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground min-w-0 overflow-hidden">
                              <Globe className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{lead.website.replace(/https?:\/\/(www\.)?/, '')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {lead.fieldCount} champs
                        </span>
                        {lead.leadSourceType && (
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase', sourceBadgeClasses[lead.leadSourceType] || sourceBadgeClasses.manual)}>
                            {sourceLabels[lead.leadSourceType] || lead.leadSourceType}
                          </span>
                        )}
                        <Link
                          href={`/leads/${lead.id}`}
                          className="p-1 rounded-md border border-border bg-white text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main types ───────────────────────────────────────────────────────────────

type MainTab = 'leads' | 'dedup';
type SourceFilter = 'all' | 'osm' | 'csv' | 'manual' | 'form';
type SortMode = 'recent' | 'old' | 'score_desc' | 'score_asc';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AcquisitionRoot() {
  const { leads, updateLead, activeWorkspace } = useReach();
  const { t } = useLanguage();

  const [mainTab, setMainTab] = useState<MainTab>('leads');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const now = Date.now();
  const stats = useMemo(() => {
    const total = leads.length;
    const new24h = leads.filter(l => {
      if (!l.createdAt) return false;
      return now - new Date(l.createdAt).getTime() < 24 * 60 * 60 * 1000;
    }).length;
    const inContact = leads.filter(l => l.status === 'Contacted' || l.status === 'Meeting Booked').length;
    const converted = leads.filter(l => l.status === 'Won').length;
    return { total, new24h, inContact, converted };
  }, [leads, now]);

  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilter, number> = { all: leads.length, osm: 0, csv: 0, manual: 0, form: 0 };
    for (const lead of leads) {
      const src = (lead.leadSourceType || 'manual') as string;
      if (src === 'osm') counts.osm++;
      else if (src === 'csv' || src === 'import') counts.csv++;
      else if (src === 'form') counts.form++;
      else counts.manual++;
    }
    return counts;
  }, [leads]);

  const displayedLeads = useMemo(() => {
    let list = [...leads];
    if (sourceFilter !== 'all') {
      list = list.filter(l => {
        const src = l.leadSourceType || 'manual';
        if (sourceFilter === 'csv') return src === 'csv' || src === 'import';
        return src === sourceFilter;
      });
    }
    list.sort((a, b) => {
      if (sortMode === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortMode === 'old') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortMode === 'score_desc') return (b.score ?? 0) - (a.score ?? 0);
      if (sortMode === 'score_asc') return (a.score ?? 0) - (b.score ?? 0);
      return 0;
    });
    return list;
  }, [leads, sourceFilter, sortMode]);

  const handleQualify = async (lead: Lead) => {
    try { await updateLead(lead.id, { status: 'Contacted' }); } catch { /* silent */ }
  };

  const filterTabs: { key: SourceFilter; label: string }[] = [
    { key: 'all', label: t('acquisition.source_all') },
    { key: 'osm', label: t('acquisition.source_osm') },
    { key: 'csv', label: t('acquisition.source_csv') },
    { key: 'manual', label: t('acquisition.source_manual') },
    { key: 'form', label: t('acquisition.source_form') },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: 'recent', label: t('acquisition.sort_recent') },
    { key: 'old', label: t('acquisition.sort_old') },
    { key: 'score_desc', label: t('acquisition.sort_score_desc') },
    { key: 'score_asc', label: t('acquisition.sort_score_asc') },
  ];

  // Count potential duplicates from leads (rough estimate using domain)
  const dupCount = useMemo(() => {
    const domains = leads.map(l => l.website?.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]).filter(Boolean);
    const seen = new Set<string>();
    let dups = 0;
    for (const d of domains) {
      if (seen.has(d!)) dups++;
      else seen.add(d!);
    }
    return dups;
  }, [leads]);

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative animate-page-enter">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

      <div className="w-full px-3 sm:px-4 md:px-8 py-6 md:py-10 space-y-6 relative z-10">
        {/* Header */}
        <div className="space-y-1 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">{t('acquisition.title')}</h1>
          <p className="text-xs text-neutral-500 font-medium">{t('acquisition.subtitle')}</p>
        </div>

        {/* Speed-to-Lead alerts */}
        <SpeedToLeadAlert leads={leads} />

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total leads" value={stats.total} />
          <StatCard label={t('acquisition.new_24h')} value={stats.new24h} accent />
          <StatCard label={t('acquisition.in_contact')} value={stats.inContact} />
          <StatCard label={t('acquisition.converted')} value={stats.converted} green />
        </div>

        {/* Main tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {([
            { key: 'leads' as MainTab, label: 'Tous les leads' },
            {
              key: 'dedup' as MainTab,
              label: 'Doublons',
              badge: dupCount > 0 ? dupCount : undefined,
            },
          ]).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMainTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px',
                mainTab === tab.key
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-[#807d72] hover:text-[#26251e]'
              )}
            >
              {tab.label}
              {'badge' in tab && tab.badge !== undefined && (
                <span className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded-full font-black leading-none',
                  mainTab === tab.key ? 'bg-[#059669] text-white' : 'bg-amber-100 text-amber-700'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Leads ── */}
        {mainTab === 'leads' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              {/* Source filter tabs */}
              <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-lg p-0.5 border border-border">
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSourceFilter(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 h-8 rounded-md text-xs font-bold transition-colors border-0 cursor-pointer',
                      sourceFilter === tab.key
                        ? 'bg-white text-[#26251e]'
                        : 'text-[#807d72] hover:text-[#26251e] bg-transparent'
                    )}
                  >
                    {tab.label}
                    <span className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-black leading-none ml-1',
                      sourceFilter === tab.key ? 'bg-[#059669] text-white' : 'bg-[#e5e5e2] text-[#807d72]'
                    )}>
                      {sourceCounts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>

              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="text-xs border border-border rounded-lg px-2.5 h-8 bg-white text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669]"
              >
                {sortOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            {displayedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-white border border-border rounded-xl">
                <p className="text-sm font-semibold text-muted-foreground">{t('acquisition.empty')}</p>
                <p className="text-xs text-muted-foreground">{t('acquisition.empty_sub')}</p>
                <Link
                  href="/prospecting"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] transition-colors border-0 cursor-pointer"
                >
                  Lancer une prospection
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedLeads.map(lead => {
                  const src = lead.leadSourceType || 'manual';
                  const srcBadgeClass = sourceBadgeClasses[src] || sourceBadgeClasses.manual;
                  const srcLabel = sourceLabels[src] || src;
                  const sla = formatSLA(lead.createdAt);
                  const isContacted = lead.status === 'Contacted' || lead.status === 'Meeting Booked' || lead.status === 'Won' || lead.status === 'Lost';

                  return (
                    <div
                      key={lead.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:border-[#059669]/30 transition-colors"
                    >
                      <span className={cn('shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide', srcBadgeClass)}>
                        {srcLabel}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#26251e] truncate">{lead.businessName}</p>
                        <p className="text-[11px] text-[#807d72] truncate mt-0.5">
                          {[lead.city, lead.niche].filter(Boolean).join(' · ')}
                        </p>
                        {(lead.utmCampaign || lead.utmSource) && (
                          <p className="text-[9px] text-[#807d72]/60 mt-0.5 truncate">
                            {lead.utmCampaign ? `campaign: ${lead.utmCampaign}` : ''}
                            {lead.utmCampaign && lead.utmSource ? ' · ' : ''}
                            {lead.utmSource ? `src: ${lead.utmSource}` : ''}
                          </p>
                        )}
                      </div>

                      <span className={cn('shrink-0 hidden sm:inline-flex text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border', STATUS_COLORS[lead.status] || 'bg-slate-50 text-slate-500 border-slate-200')}>
                        {lead.status}
                      </span>

                      <div className="shrink-0 flex items-center gap-1">
                        {isContacted ? (
                          <span className="text-[10px] font-bold text-[#059669] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {t('acquisition.sla_contacted')}
                          </span>
                        ) : (
                          <>
                            <Clock className={cn('w-3.5 h-3.5', sla.level === 'green' ? 'text-[#059669]' : sla.level === 'amber' ? 'text-amber-500' : 'text-[#cf2d56]')} />
                            <span className={cn('text-[10px] font-bold', sla.level === 'green' ? 'text-[#059669]' : sla.level === 'amber' ? 'text-amber-600' : 'text-[#cf2d56]')}>
                              {sla.label}
                            </span>
                          </>
                        )}
                      </div>

                      {typeof lead.score === 'number' && lead.score > 0 && (
                        <div className="shrink-0 hidden sm:block">
                          <ScoreBadge score={lead.score} />
                        </div>
                      )}

                      <div className="shrink-0 flex items-center gap-2">
                        {lead.status === 'New' && (
                          <button
                            type="button"
                            onClick={() => handleQualify(lead)}
                            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-[#059669]/10 text-[#059669] hover:bg-[#059669] hover:text-white transition-colors border-0 cursor-pointer"
                          >
                            {t('acquisition.qualify')}
                          </button>
                        )}
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border text-[#555552] hover:bg-[#f4f4f3] hover:text-[#26251e] hover:border-border transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t('acquisition.view')}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Doublons ── */}
        {mainTab === 'dedup' && activeWorkspace?.id && (
          <DedupTab workspaceId={activeWorkspace.id} />
        )}
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, green }: { label: string; value: number; accent?: boolean; green?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-1 shadow-none bg-white border-border', green && 'border-[#059669]/30 bg-[#059669]/5', accent && 'border-amber-200 bg-amber-50/50')}>
      <p className={cn('text-2xl font-bold font-mono tracking-tight text-[#26251e]', green && 'text-[#059669]', accent && 'text-amber-700')}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
