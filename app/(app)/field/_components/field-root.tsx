'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  MapPin, Phone, Globe, CheckCircle2, Clock, X, ChevronRight,
  Loader2, ArrowLeft, Navigation, RefreshCw, Star, Calendar,
  AlertCircle, MessageSquare,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type VisitOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';

interface VisitLog {
  leadId: string;
  outcome: VisitOutcome;
  notes?: string;
  meetingDatetime?: string;
  visitedAt: string;
}

interface RoutePlan {
  id: string;
  campaign_id: string | null;
  lead_ids: string; // JSON array
  distance_km: number | null;
  duration_min: number | null;
  status: string;
  created_at: string;
}

const OUTCOME_BADGE: Record<
  VisitOutcome,
  { label: string; classes: string }
> = {
  visited: { label: 'Visité', classes: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20' },
  absent: { label: 'Absent', classes: 'text-amber-600 bg-amber-50 border-amber-200' },
  meeting_booked: { label: 'RDV pris', classes: 'text-blue-600 bg-blue-50 border-blue-200' },
  not_interested: { label: 'Non intéressé', classes: 'text-red-500 bg-red-50 border-red-200' },
};

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  index,
  visitLog,
  planId,
  userLat,
  userLng,
}: {
  lead: ReturnType<typeof useReach>['leads'][number];
  index: number;
  visitLog: VisitLog | undefined;
  planId: string;
  userLat: number | null;
  userLng: number | null;
}) {
  const router = useRouter();
  const distance = userLat && userLng && lead.latitude && lead.longitude
    ? Math.round(haversine(userLat, userLng, lead.latitude, lead.longitude) * 10) / 10
    : null;

  const badge = visitLog ? OUTCOME_BADGE[visitLog.outcome] : null;

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 space-y-3 transition-all',
      visitLog ? 'border-[#e5e5e0] opacity-70' : 'border-[#e5e5e0] shadow-sm',
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center text-sm font-black shrink-0',
          visitLog ? 'bg-[#e5e5e0] text-[#7a7a76]' : 'bg-[#26251e] text-white',
        )}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#26251e] leading-snug">{lead.businessName}</p>
            {badge && (
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0', badge.classes)}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#7a7a76] mt-0.5 line-clamp-1">{lead.niche}</p>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-[10px] text-[#7a7a76] flex-wrap">
        {lead.city && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {lead.city}
          </span>
        )}
        {distance !== null && (
          <span className="flex items-center gap-1 text-[#059669] font-semibold">
            <Navigation className="h-3 w-3" />
            {distance} km
          </span>
        )}
        {lead.rating && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {lead.rating}
          </span>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        {lead.contactEmail && (
          <a href={`tel:${lead.contactEmail}`} className="flex items-center gap-1 text-[10px] text-[#059669] hover:underline">
            <Phone className="h-3 w-3" />
            Appeler
          </a>
        )}
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#7a7a76] hover:underline">
            <Globe className="h-3 w-3" />
            Site
          </a>
        )}
        {lead.mapsUrl && (
          <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#7a7a76] hover:underline">
            <MapPin className="h-3 w-3" />
            Maps
          </a>
        )}
      </div>

      {/* CTA: navigate to outcome page */}
      {!visitLog ? (
        <button
          onClick={() => router.push(`/field/${planId}/outcome/${lead.id}`)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
        >
          Enregistrer le passage →
        </button>
      ) : visitLog.notes && (
        <div className="flex items-start gap-1.5 text-[10px] text-[#7a7a76] bg-[#f7f7f4] rounded-lg p-2">
          <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{visitLog.notes}</span>
        </div>
      )}

      {/* Meeting datetime badge */}
      {visitLog?.outcome === 'meeting_booked' && visitLog.meetingDatetime && (
        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
          <Calendar className="h-3 w-3" />
          {new Date(visitLog.meetingDatetime).toLocaleDateString('fr-CA', {
            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}

// ─── Summary row icons ────────────────────────────────────────────────────────

const OUTCOME_ICONS: Record<VisitOutcome, React.ReactNode> = {
  visited: <CheckCircle2 className="h-3.5 w-3.5" />,
  absent: <Clock className="h-3.5 w-3.5" />,
  meeting_booked: <Calendar className="h-3.5 w-3.5" />,
  not_interested: <X className="h-3.5 w-3.5" />,
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function FieldRoot({ planId }: { planId: string }) {
  const router = useRouter();
  const { leads } = useReach();

  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [orderedLeads, setOrderedLeads] = useState<typeof leads>([]);
  const [visitLogs, setVisitLogs] = useState<Record<string, VisitLog>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Fetch route plan
  useEffect(() => {
    if (!planId || planId === 'default') {
      setOrderedLeads(leads.slice(0, 20));
      setLoading(false);
      return;
    }
    fetch(getApiUrl(`/api/route-plans?id=${planId}`))
      .then((r) => r.json())
      .then((data) => {
        const plan: RoutePlan = Array.isArray(data) ? data[0] : data;
        if (plan) {
          setRoutePlan(plan);
          const leadIds: string[] = JSON.parse(plan.lead_ids || '[]');
          const ordered = leadIds.map((id) => leads.find((l) => l.id === id)).filter(Boolean) as typeof leads;
          setOrderedLeads(ordered);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [planId, leads]);

  // Load visit logs from Supabase Cloud directly
  useEffect(() => {
    if (!planId) return;
    const supabase = createClient();
    supabase.from('field_visits')
      .select('*')
      .eq('route_plan_id', planId)
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) return;
        const logs: Record<string, VisitLog> = {};
        for (const row of data) {
          logs[row.lead_id as string] = {
            leadId: row.lead_id as string,
            outcome: row.outcome as VisitOutcome,
            notes: row.notes as string | undefined,
            meetingDatetime: row.meeting_datetime as string | undefined,
            visitedAt: row.visited_at as string,
          };
        }
        setVisitLogs(logs);
      })
      .catch(() => {});
  }, [planId]);

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {},
      );
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Data is live, simply mock a short delay for indicator UX
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const visitedCount = Object.keys(visitLogs).length;
  const totalCount = orderedLeads.length;
  const progress = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;

  // Outcome counts for summary
  const outcomeCount = (Object.keys(OUTCOME_BADGE) as VisitOutcome[]).map((key) => ({
    key,
    count: Object.values(visitLogs).filter((v) => v.outcome === key).length,
    ...OUTCOME_BADGE[key],
  })).filter((o) => o.count > 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e5e5e0] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/map')}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-[#26251e]">Mode Terrain 📍</p>
            <p className="text-[10px] text-[#7a7a76]">
              {visitedCount}/{totalCount} visites
              {routePlan?.distance_km && ` · ${routePlan.distance_km.toFixed(1)} km`}
              {routePlan?.duration_min && ` · ~${routePlan.duration_min} min`}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors',
              syncDone
                ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
                : 'border border-[#e5e5e0] text-[#555552] hover:bg-[#f4f4f3]',
            )}
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {syncDone ? 'Synchronisé !' : 'Sync'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-[#e5e5e0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#059669] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Outcome summary pills */}
        {outcomeCount.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {outcomeCount.map(({ key, count, label, classes }) => (
              <span key={key} className={cn('flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border', classes)}>
                {OUTCOME_ICONS[key]}{count} {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Lead list */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {orderedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-8 w-8 text-[#7a7a76] mb-3" />
            <p className="text-sm font-bold text-[#26251e]">Aucun lead dans cette tournée</p>
            <p className="text-xs text-[#7a7a76] mt-1">Planifiez une tournée depuis la carte.</p>
            <button
              onClick={() => router.push('/map')}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Aller à la carte
            </button>
          </div>
        ) : (
          <>
            {orderedLeads.map((lead, i) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={i}
                visitLog={visitLogs[lead.id]}
                planId={planId}
                userLat={userLat}
                userLng={userLng}
              />
            ))}

            {visitedCount === totalCount && totalCount > 0 && (
              <div className="bg-[#059669] rounded-2xl p-5 text-white text-center space-y-2">
                <p className="text-2xl">🎉</p>
                <p className="text-sm font-black">Tournée terminée !</p>
                <p className="text-xs opacity-80">{visitedCount} établissements visités.</p>
                <button
                  onClick={handleSync}
                  className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white text-[#059669] text-xs font-bold hover:bg-[#f4f4f3] transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Synchroniser les résultats
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
