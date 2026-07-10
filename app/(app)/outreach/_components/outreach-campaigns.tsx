'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Megaphone, Plus, RefreshCw, TrendingUp, Users, Mail,
  CalendarCheck, AlertTriangle, Play, Pause, MoreHorizontal,
  BarChart3, CheckCircle, Circle,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  target_niche: string | null;
  target_city: string | null;
  total_sent: number;
  total_opens: number;
  total_replies: number;
  positive_replies: number;
  meetings_booked: number;
  alert: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(num: number, denom: number) {
  if (!denom) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

function StatChip({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('text-base font-black leading-none', accent ? 'text-[#059669]' : 'text-[#26251e]')}>{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#7a7a76]">{label}</span>
    </div>
  );
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', icon: Play },
  paused: { label: 'En pause', color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Pause },
  completed: { label: 'Terminée', color: '#7a7a76', bg: '#f4f4f3', border: '#e5e5e0', icon: CheckCircle },
  draft: { label: 'Brouillon', color: '#7c3aed', bg: '#f5f3ff', border: '#e9d5ff', icon: Circle },
};

// ── CampaignCard ──────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onToggle }: { campaign: Campaign; onToggle: (id: string, status: Campaign['status']) => void }) {
  const conf = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = conf.icon;
  const openRate = pct(campaign.total_opens, campaign.total_sent);
  const replyRate = pct(campaign.total_replies, campaign.total_sent);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="block bg-white border border-[#e5e5e0] rounded-xl overflow-hidden hover:border-[#059669]/40 hover:shadow-sm transition-all"
    >
      {campaign.alert && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#fffbeb] border-b border-[#fde68a]">
          <AlertTriangle className="h-3 w-3 text-[#d97706] shrink-0" />
          <p className="text-[10px] font-semibold text-[#92400e] truncate">{campaign.alert}</p>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border"
                style={{ color: conf.color, background: conf.bg, borderColor: conf.border }}
              >
                <StatusIcon className="h-2.5 w-2.5" />
                {conf.label}
              </span>
              {campaign.target_niche && (
                <span className="text-[9px] font-semibold text-[#7a7a76] bg-[#f4f4f3] px-1.5 py-0.5 rounded">
                  {campaign.target_niche}
                </span>
              )}
              {campaign.target_city && (
                <span className="text-[9px] font-semibold text-[#7a7a76] bg-[#f4f4f3] px-1.5 py-0.5 rounded">
                  {campaign.target_city}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-[#26251e] truncate">{campaign.name}</p>
          </div>

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(campaign.id, campaign.status); }}
            className="shrink-0 p-1.5 rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors"
            title={campaign.status === 'active' ? 'Mettre en pause' : 'Relancer'}
          >
            {campaign.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-4 mt-4 pt-3 border-t border-[#f4f4f3]">
          <StatChip label="Envoyés" value={campaign.total_sent} />
          <StatChip label="Ouverture" value={openRate} />
          <StatChip label="Réponses" value={replyRate} />
          <StatChip label="Positifs" value={campaign.positive_replies} accent />
          <StatChip label="RDV" value={campaign.meetings_booked} accent />
        </div>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OutreachCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  const load = useCallback(async () => {
    const workspaceId = localStorage.getItem('minerva_active_workspace_id');
    if (!workspaceId) { setLoading(false); return; }

    const res = await fetch(getApiUrl(`/api/outreach/campaigns?workspace_id=${workspaceId}`));
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, currentStatus: Campaign['status']) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    await fetch(getApiUrl('/api/outreach/campaigns'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
  };

  const filtered = campaigns.filter(c => filter === 'all' || c.status === filter);

  // Summary stats
  const totalSent = campaigns.reduce((s, c) => s + c.total_sent, 0);
  const totalReplies = campaigns.reduce((s, c) => s + c.total_replies, 0);
  const totalRdv = campaigns.reduce((s, c) => s + c.meetings_booked, 0);
  const active = campaigns.filter(c => c.status === 'active').length;

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-[#f4f4f3] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e5e0] bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[#059669]" />
          <span className="text-sm font-bold text-[#26251e]">Campagnes</span>
          {active > 0 && (
            <span className="text-[9px] font-bold bg-[#059669]/10 text-[#059669] px-1.5 py-0.5 rounded-full">
              {active} actives
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={load} className="p-1 text-[#7a7a76] hover:text-[#26251e] transition-colors">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-4 divide-x divide-[#e5e5e0] border-b border-[#e5e5e0] bg-[#fafaf8] shrink-0">
          {[
            { label: 'Campagnes actives', value: active, icon: Play, accent: true },
            { label: 'Emails envoyés', value: totalSent, icon: Mail, accent: false },
            { label: 'Réponses', value: totalReplies, icon: TrendingUp, accent: false },
            { label: 'RDV générés', value: totalRdv, icon: CalendarCheck, accent: true },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="flex flex-col items-center justify-center py-4 gap-1">
                <Icon className={cn('h-4 w-4', kpi.accent ? 'text-[#059669]' : 'text-[#7a7a76]')} />
                <span className={cn('text-lg font-black', kpi.accent ? 'text-[#059669]' : 'text-[#26251e]')}>{kpi.value}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#7a7a76] text-center leading-tight">{kpi.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[#e5e5e0] bg-white shrink-0">
          {(['all', 'active', 'paused', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'text-[9px] font-bold px-2.5 py-1 rounded-lg transition-all',
                filter === f ? 'bg-[#26251e] text-white' : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              {f === 'all' ? 'Tout' : STATUS_CONFIG[f]?.label ?? f}
            </button>
          ))}
        </div>
      )}

      {/* Campaign list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#059669]/10 mb-4">
              <Megaphone className="h-6 w-6 text-[#059669]" />
            </div>
            <p className="text-sm font-semibold text-[#26251e]">Aucune campagne{filter !== 'all' ? ` ${STATUS_CONFIG[filter]?.label?.toLowerCase()}` : ''}</p>
            <p className="text-xs text-[#7a7a76] mt-1 max-w-xs">
              Lance ta première campagne depuis la prospection ou en créant une séquence.
            </p>
          </div>
        ) : (
          filtered.map(c => (
            <CampaignCard key={c.id} campaign={c} onToggle={handleToggle} />
          ))
        )}
      </div>
    </div>
  );
}

export default OutreachCampaigns;
