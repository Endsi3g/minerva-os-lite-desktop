'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import type { Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

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
  osm: 'bg-blue-100 text-blue-700',
  csv: 'bg-purple-100 text-purple-700',
  manual: 'bg-slate-100 text-slate-600',
  form: 'bg-[#059669]/10 text-[#059669]',
  facebook: 'bg-indigo-100 text-indigo-700',
  google: 'bg-red-100 text-red-700',
  import: 'bg-purple-100 text-purple-700',
};

const sourceLabels: Record<string, string> = {
  osm: 'OSM',
  csv: 'CSV',
  manual: 'Manuel',
  form: 'Formulaire',
  facebook: 'Facebook',
  google: 'Google',
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
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold',
        color
      )}
    >
      {score}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-50 text-blue-600',
  Contacted: 'bg-amber-50 text-amber-700',
  'Meeting Booked': 'bg-purple-50 text-purple-700',
  Won: 'bg-[#059669]/10 text-[#059669]',
  Lost: 'bg-slate-100 text-slate-500',
};

// ─── Source filter tabs ───────────────────────────────────────────────────────

type SourceFilter = 'all' | 'osm' | 'csv' | 'manual' | 'form';

type SortMode = 'recent' | 'old' | 'score_desc' | 'score_asc';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AcquisitionRoot() {
  const { leads, updateLead } = useReach();
  const { t } = useLanguage();

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  // Stats
  const now = Date.now();
  const stats = useMemo(() => {
    const total = leads.length;
    const new24h = leads.filter((l) => {
      if (!l.createdAt) return false;
      return now - new Date(l.createdAt).getTime() < 24 * 60 * 60 * 1000;
    }).length;
    const inContact = leads.filter(
      (l) => l.status === 'Contacted' || l.status === 'Meeting Booked'
    ).length;
    const converted = leads.filter((l) => l.status === 'Won').length;
    return { total, new24h, inContact, converted };
  }, [leads, now]);

  // Source counts for filter tabs
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

  // Filtered + sorted leads
  const displayedLeads = useMemo(() => {
    let list = [...leads];

    if (sourceFilter !== 'all') {
      list = list.filter((l) => {
        const src = l.leadSourceType || 'manual';
        if (sourceFilter === 'csv') return src === 'csv' || src === 'import';
        return src === sourceFilter;
      });
    }

    list.sort((a, b) => {
      if (sortMode === 'recent') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortMode === 'old') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortMode === 'score_desc') {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      if (sortMode === 'score_asc') {
        return (a.score ?? 0) - (b.score ?? 0);
      }
      return 0;
    });

    return list;
  }, [leads, sourceFilter, sortMode]);

  const handleQualify = async (lead: Lead) => {
    try {
      await updateLead(lead.id, { status: 'Contacted' });
    } catch {
      // silent
    }
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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('acquisition.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('acquisition.subtitle')}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total leads" value={stats.total} />
        <StatCard label={t('acquisition.new_24h')} value={stats.new24h} accent />
        <StatCard label={t('acquisition.in_contact')} value={stats.inContact} />
        <StatCard label={t('acquisition.converted')} value={stats.converted} green />
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Source filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSourceFilter(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                sourceFilter === tab.key
                  ? 'bg-[#059669] text-white'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  sourceFilter === tab.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {sourceCounts[tab.key]}
              </span>
            </button>
          ))}
          {/* Ads — coming soon (dimmed) */}
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground/40 cursor-not-allowed select-none">
            {t('acquisition.source_ads')}
          </span>
        </div>

        {/* Sort selector */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[#059669]"
        >
          {sortOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lead List */}
      {displayedLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-base font-semibold text-muted-foreground">{t('acquisition.empty')}</p>
          <p className="text-sm text-muted-foreground">{t('acquisition.empty_sub')}</p>
          <Link
            href="/prospecting"
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] text-white text-sm font-medium hover:bg-[#047857] transition-colors"
          >
            Lancer une prospection
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedLeads.map((lead) => {
            const src = lead.leadSourceType || 'manual';
            const srcBadgeClass = sourceBadgeClasses[src] || sourceBadgeClasses.manual;
            const srcLabel = sourceLabels[src] || src;
            const sla = formatSLA(lead.createdAt);
            const isContacted =
              lead.status === 'Contacted' ||
              lead.status === 'Meeting Booked' ||
              lead.status === 'Won' ||
              lead.status === 'Lost';

            return (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background hover:bg-secondary/20 transition-colors"
              >
                {/* Source badge */}
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                    srcBadgeClass
                  )}
                >
                  {srcLabel}
                </span>

                {/* Lead info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{lead.businessName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[lead.city, lead.niche].filter(Boolean).join(' · ')}
                  </p>
                  {(lead.utmCampaign || lead.utmSource) && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                      {lead.utmCampaign ? `campaign: ${lead.utmCampaign}` : ''}
                      {lead.utmCampaign && lead.utmSource ? ' · ' : ''}
                      {lead.utmSource ? `src: ${lead.utmSource}` : ''}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={cn(
                    'shrink-0 hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-500'
                  )}
                >
                  {lead.status}
                </span>

                {/* SLA or contacted indicator */}
                <div className="shrink-0 flex items-center gap-1">
                  {isContacted ? (
                    <span className="text-[10px] font-medium text-[#059669]">
                      ✓ {t('acquisition.sla_contacted')}
                    </span>
                  ) : (
                    <>
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          sla.level === 'green'
                            ? 'bg-[#059669]'
                            : sla.level === 'amber'
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px] font-medium',
                          sla.level === 'green'
                            ? 'text-[#059669]'
                            : sla.level === 'amber'
                            ? 'text-amber-600'
                            : 'text-red-600'
                        )}
                      >
                        {sla.label}
                      </span>
                    </>
                  )}
                </div>

                {/* Score */}
                {typeof lead.score === 'number' && lead.score > 0 && (
                  <div className="shrink-0 hidden sm:block">
                    <ScoreBadge score={lead.score} />
                  </div>
                )}

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {lead.status === 'New' && (
                    <button
                      type="button"
                      onClick={() => handleQualify(lead)}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#059669]/10 text-[#059669] hover:bg-[#059669] hover:text-white transition-colors"
                    >
                      {t('acquisition.qualify')}
                    </button>
                  )}
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    {t('acquisition.view')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
  green,
}: {
  label: string;
  value: number;
  accent?: boolean;
  green?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-1',
        green
          ? 'border-[#059669]/30 bg-[#059669]/5'
          : accent
          ? 'border-amber-200 bg-amber-50'
          : 'border-border bg-background'
      )}
    >
      <p
        className={cn(
          'text-2xl font-bold',
          green ? 'text-[#059669]' : accent ? 'text-amber-700' : 'text-foreground'
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
