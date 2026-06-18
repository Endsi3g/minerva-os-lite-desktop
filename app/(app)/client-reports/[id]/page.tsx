'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import {
  ArrowLeft,
  BarChart2,
  TrendingUp,
  Users,
  CalendarCheck,
  Trophy,
  DollarSign,
  Percent,
  Tag,
  Globe,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DbLead {
  id: string;
  business_name: string;
  status: string;
  niche: string;
  website: string | null;
  updated_at: string;
  created_at: string;
}

interface DbCampaign {
  id: string;
  status: string;
}

function kpiCard(
  icon: React.ReactNode,
  label: string,
  value: string | number,
  sub?: string,
  color = '#059669'
) {
  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#26251e]">{value}</p>
      {sub && <p className="text-[10px] text-[#7a7a76]">{sub}</p>}
    </div>
  );
}

export default function ClientReportDetailPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const router = useRouter();
  const { workspacesList } = useReach();

  const [leads, setLeads] = useState<DbLead[]>([]);
  const [campaigns, setCampaigns] = useState<DbCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const workspace = workspacesList.find((w) => w.id === workspaceId);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const supabase = createClient();
      const [leadsRes, campaignsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, business_name, status, niche, website, updated_at, created_at')
          .eq('workspace_id', workspaceId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('campaigns')
          .select('id, status')
          .eq('workspace_id', workspaceId),
      ]);
      setLeads((leadsRes.data as DbLead[]) ?? []);
      setCampaigns((campaignsRes.data as DbCampaign[]) ?? []);
      setLoading(false);
    })();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#059669] border-t-transparent" />
      </div>
    );
  }

  const total = leads.length;
  const contacted = leads.filter((l) => l.status !== 'New').length;
  const meetingBooked = leads.filter((l) => l.status === 'Meeting Booked').length;
  const won = leads.filter((l) => l.status === 'Won').length;
  const mrr = won * 1500;
  const arr = mrr * 12;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const convRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';
  const auditsCount = leads.filter((l) => l.website).length;

  // Best niche
  const nicheCounts: Record<string, number> = {};
  leads
    .filter((l) => l.status === 'Won' && l.niche)
    .forEach((l) => {
      nicheCounts[l.niche] = (nicheCounts[l.niche] ?? 0) + 1;
    });
  const bestNiche =
    Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const recentActivities = leads.slice(0, 10);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusColor: Record<string, string> = {
    New: 'bg-neutral-100 text-neutral-600',
    Contacted: 'bg-blue-50 text-blue-700',
    'Meeting Booked': 'bg-purple-50 text-purple-700',
    Won: 'bg-[#059669]/10 text-[#059669]',
    Lost: 'bg-red-50 text-red-600',
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-[#059669]" />
              <h1 className="text-base font-bold text-[#26251e]">
                {workspace?.name ?? workspaceId}
              </h1>
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">
              Rapport client — données réelles Supabase
            </p>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {kpiCard(<Users className="h-4 w-4" />, 'Leads générés', total)}
          {kpiCard(<Users className="h-4 w-4" />, 'Leads contactés', contacted, `${total > 0 ? ((contacted / total) * 100).toFixed(0) : 0}% du total`, '#2563eb')}
          {kpiCard(<CalendarCheck className="h-4 w-4" />, 'Rendez-vous', meetingBooked, 'Meeting Booked', '#7c3aed')}
          {kpiCard(<Trophy className="h-4 w-4" />, 'Deals gagnés', won, `${convRate}% de conversion`, '#059669')}
          {kpiCard(<DollarSign className="h-4 w-4" />, 'MRR estimé', `${mrr.toLocaleString('fr-CA')} $`, '× 1 500 $/deal gagné', '#f54e00')}
          {kpiCard(<TrendingUp className="h-4 w-4" />, 'ARR estimé', `${arr.toLocaleString('fr-CA')} $`, 'MRR × 12', '#f54e00')}
          {kpiCard(<Percent className="h-4 w-4" />, 'Taux de conversion', `${convRate}%`, 'Deals gagnés / total', '#059669')}
          {kpiCard(<Tag className="h-4 w-4" />, 'Meilleure niche', bestNiche, 'Niche la plus gagnante', '#7c3aed')}
          {kpiCard(<Globe className="h-4 w-4" />, 'Audits SEO réalisés', auditsCount, 'Leads avec un site web', '#2563eb')}
          {kpiCard(<BarChart2 className="h-4 w-4" />, 'Campagnes actives', activeCampaigns, 'Sur ce workspace', '#059669')}
        </div>

        {/* Recent activity timeline */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#26251e]">Activités récentes</h2>
          {recentActivities.length === 0 ? (
            <p className="text-xs text-[#7a7a76] py-6 text-center border border-dashed border-[#e5e5e0] rounded-xl">
              Aucune activité enregistrée.
            </p>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#e5e5e0] bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#26251e] truncate">{lead.business_name}</p>
                      <p className="text-[10px] text-[#7a7a76]">{lead.niche || '—'} · {fmt(lead.updated_at)}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-transparent',
                      statusColor[lead.status] ?? 'bg-neutral-100 text-neutral-600'
                    )}
                  >
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
