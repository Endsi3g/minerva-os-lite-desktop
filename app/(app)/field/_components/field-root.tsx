'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  MapPin, Phone, Globe, CheckCircle2, Clock, X, ChevronRight,
  Loader2, ArrowLeft, Navigation, RefreshCw, Star, Calendar,
  AlertCircle, MessageSquare, Route, Users, PartyPopper, Camera,
} from 'lucide-react';

// Build a turn-by-turn directions deep link (opens native maps app on mobile)
function directionsUrl(lead: { latitude?: number; longitude?: number; businessName: string; city?: string; _lat?: number; _lng?: number }): string {
  const lat = lead._lat ?? lead.latitude;
  const lng = lead._lng ?? lead.longitude;
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const q = encodeURIComponent(`${lead.businessName} ${lead.city || ''}`.trim());
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

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

// ─── Geographic Fallbacks ──────────────────────────────────────────────────────

const QUEBEC_CITY_COORDS: Record<string, [number, number]> = {
  'montreal': [45.5019, -73.5674],
  'montréal': [45.5019, -73.5674],
  'quebec': [46.8139, -71.2080],
  'québec': [46.8139, -71.2080],
  'laval': [45.6066, -73.7124],
  'gatineau': [45.4765, -75.7013],
  'longueuil': [45.5312, -73.5183],
  'sherbrooke': [45.4042, -71.8929],
  'saguenay': [48.4279, -71.0686],
  'levis': [46.8033, -71.1778],
  'lévis': [46.8033, -71.1778],
  'trois-rivieres': [46.3432, -72.5429],
  'trois-rivières': [46.3432, -72.5429],
  'terrebonne': [45.7000, -73.6334],
  'saint-jean-sur-richelieu': [45.3072, -73.2619],
  'repentigny': [45.7423, -73.4513],
  'drummondville': [45.8835, -72.4831],
  'granby': [45.4042, -72.7340],
  'saint-jerome': [45.7805, -74.0034],
  'saint-jérôme': [45.7805, -74.0034],
};

const DEFAULT_COORDS: [number, number] = [46.8, -72.5];

function applyJitter(val: number): number {
  return val + (Math.random() - 0.5) * 0.03;
}

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
  eta,
  isNextStop,
}: {
  lead: ReturnType<typeof useReach>['leads'][number];
  index: number;
  visitLog: VisitLog | undefined;
  planId: string;
  userLat: number | null;
  userLng: number | null;
  eta?: string;
  isNextStop?: boolean;
}) {
  const router = useRouter();
  const distance = userLat && userLng
    ? Math.round(haversine(userLat, userLng, (lead as any)._lat || lead.latitude, (lead as any)._lng || lead.longitude) * 10) / 10
    : null;

  const badge = visitLog ? OUTCOME_BADGE[visitLog.outcome] : null;

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 space-y-3 transition-all',
      visitLog
        ? 'border-[#e5e5e0] opacity-70'
        : isNextStop
        ? 'border-[#059669] shadow-sm ring-1 ring-[#059669]/20'
        : 'border-[#e5e5e0] shadow-sm',
    )}>
      {/* Next-stop marker */}
      {isNextStop && !visitLog && (
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#059669]">
          <Navigation className="h-3 w-3" />
          Prochain arrêt
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          visitLog ? 'bg-[#e5e5e0] text-[#7a7a76]' : 'bg-[#26251e] text-white',
        )}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-[#26251e] leading-snug">{lead.businessName}</p>
            {badge ? (
              <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0', badge.classes)}>
                {badge.label}
              </span>
            ) : eta ? (
              <div className="text-right shrink-0">
                <span className="text-[10px] font-black text-[#059669] block font-mono leading-none">{eta}</span>
                <span className="text-[7px] text-[#7a7a76] block uppercase tracking-wider text-right">ETA</span>
              </div>
            ) : null}
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
        <a href={directionsUrl(lead)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-[#059669] font-semibold hover:underline">
          <Route className="h-3 w-3" />
          Itinéraire
        </a>
      </div>

      {/* CTA: navigate to outcome page */}
      {!visitLog ? (
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/field/${planId}/prepare/${lead.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-[#059669] text-[#059669] text-xs font-bold hover:bg-[#059669]/5 transition-colors"
          >
            Préparer →
          </button>
          <button
            onClick={() => router.push(`/field/${planId}/outcome/${lead.id}`)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
          >
            Enregistrer →
          </button>
        </div>
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

export function FieldRoot({ planId, refreshToken = '' }: { planId: string; refreshToken?: string }) {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();

  const [notifyingTeam, setNotifyingTeam] = useState(false);
  const [teamNotified, setTeamNotified] = useState(false);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [orderedLeads, setOrderedLeads] = useState<typeof leads>([]);
  const [visitLogs, setVisitLogs] = useState<Record<string, VisitLog>>({});
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Recalculation states
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);
  const [remainingDurationMin, setRemainingDurationMin] = useState<number | null>(null);
  const [remainingEtas, setRemainingEtas] = useState<Record<string, string>>({});

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
  }, [planId, refreshToken]);

  // Geolocation with watchPosition
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      (err) => {
        console.error('[watchPosition error]', err);
      },
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Compute fallbacks for lead coordinates
  const orderedLeadsWithCoords = useMemo(() => {
    return orderedLeads.map((lead) => {
      let lat: number;
      let lng: number;
      if (lead.latitude && lead.longitude) {
        lat = lead.latitude;
        lng = lead.longitude;
      } else {
        const key = (lead.city || '').toLowerCase().trim();
        const coords = QUEBEC_CITY_COORDS[key] || DEFAULT_COORDS;
        lat = applyJitter(coords[0]);
        lng = applyJitter(coords[1]);
      }
      return { ...lead, _lat: lat, _lng: lng };
    });
  }, [orderedLeads]);

  // Fetch remaining route from current GPS location using OSRM
  useEffect(() => {
    const remaining = orderedLeadsWithCoords.filter((l) => !visitLogs[l.id]);
    if (remaining.length === 0) {
      setRemainingDistanceKm(null);
      setRemainingDurationMin(null);
      setRemainingEtas({});
      return;
    }

    let isCancelled = false;

    async function fetchRoute() {
      try {
        const seqCoords: string[] = [];
        if (userLat !== null && userLng !== null) {
          seqCoords.push(`${userLng},${userLat}`);
        }
        remaining.forEach((lead) => {
          seqCoords.push(`${lead._lng},${lead._lat}`);
        });

        if (seqCoords.length < 2) {
          const now = new Date();
          const h = String(now.getHours()).padStart(2, '0');
          const m = String(now.getMinutes()).padStart(2, '0');
          if (!isCancelled) {
            setRemainingDistanceKm(0);
            setRemainingDurationMin(0);
            setRemainingEtas({ [remaining[0].id]: `${h}:${m}` });
          }
          return;
        }

        const coords = seqCoords.join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM HTTP error ${res.status}`);
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route found');

        const route = data.routes[0];
        const legs = route.legs || [];
        const distanceKm = Math.round(route.distance / 100) / 10;
        const durationMin = Math.round(route.duration / 60);

        const etas: Record<string, string> = {};
        const now = new Date();
        let currentMinutes = now.getHours() * 60 + now.getMinutes();
        const visitDuration = 20; // fallback standard visit duration in minutes

        remaining.forEach((lead, i) => {
          let travelMin = 0;
          if (userLat !== null && userLng !== null) {
            const legDurationSec = legs[i]?.duration || 0;
            travelMin = Math.round(legDurationSec / 60);
          } else if (i > 0) {
            const legDurationSec = legs[i - 1]?.duration || 0;
            travelMin = Math.round(legDurationSec / 60);
          }

          currentMinutes += travelMin;
          const hours = Math.floor(currentMinutes / 60) % 24;
          const mins = currentMinutes % 60;
          etas[lead.id] = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

          currentMinutes += visitDuration;
        });

        if (!isCancelled) {
          setRemainingDistanceKm(distanceKm);
          setRemainingDurationMin(durationMin);
          setRemainingEtas(etas);
        }
      } catch (err) {
        console.error('[fetchRemainingRoute error]', err);
      }
    }

    const timer = setTimeout(() => {
      fetchRoute();
    }, 1500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [userLat, userLng, orderedLeadsWithCoords, visitLogs]);

  const handleNotifyDeparture = async () => {
    if (!activeWorkspace || teamNotified) return;
    setNotifyingTeam(true);
    try {
      const ownerId = (activeWorkspace as { owner_id?: string }).owner_id;
      const res = await fetch(getApiUrl('/api/notifications/team'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWorkspace.id,
          workspaceOwnerId: ownerId,
          title: 'Départ en tournée terrain',
          body: `Une tournée de ${totalCount} visite${totalCount > 1 ? 's' : ''} vient de démarrer.`,
          type: 'field_visit',
          link: `/field/${planId}`,
        }),
      });
      if (res.ok) {
        setTeamNotified(true);
        setTimeout(() => setTeamNotified(false), 4000);
      }
    } catch { /* ignore */ }
    finally { setNotifyingTeam(false); }
  };

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
  const totalCount = orderedLeadsWithCoords.length;
  const progress = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;
  // First unvisited lead = the next stop to highlight
  const nextStopId = orderedLeadsWithCoords.find((l) => !visitLogs[l.id])?.id;

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
            <p className="text-xs font-bold text-[#26251e] flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#059669]" />
              Mode Terrain
            </p>
            <p className="text-[10px] text-[#7a7a76]">
              {visitedCount}/{totalCount} visites
              {remainingDistanceKm !== null ? (
                ` · Reste ${remainingDistanceKm.toFixed(1)} km (~${remainingDurationMin} min)`
              ) : (
                <>
                  {routePlan?.distance_km && ` · ${routePlan.distance_km.toFixed(1)} km`}
                  {routePlan?.duration_min && ` · ~${routePlan.duration_min} min`}
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push('/field/gallery')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-[#e5e5e0] text-[#555552] hover:bg-[#f4f4f3] transition-colors"
            title="Galerie des preuves de visite"
          >
            <Camera className="h-3 w-3" />
            Preuves
          </button>
          <button
            onClick={handleNotifyDeparture}
            disabled={notifyingTeam || teamNotified || totalCount === 0}
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-70',
              teamNotified
                ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20'
                : 'border border-[#e5e5e0] text-[#555552] hover:bg-[#f4f4f3]',
            )}
          >
            {notifyingTeam ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
            {teamNotified ? 'Équipe prévenue' : 'Prévenir l\'équipe'}
          </button>
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
        {orderedLeadsWithCoords.length === 0 ? (
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
            {orderedLeadsWithCoords.map((lead, i) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={i}
                visitLog={visitLogs[lead.id]}
                planId={planId}
                userLat={userLat}
                userLng={userLng}
                eta={remainingEtas[lead.id]}
                isNextStop={lead.id === nextStopId}
              />
            ))}

            {visitedCount === totalCount && totalCount > 0 && (
              <div className="bg-[#059669] rounded-xl p-5 text-white text-center space-y-2">
                <PartyPopper className="h-7 w-7 mx-auto" />
                <p className="text-sm font-bold">Tournée terminée !</p>
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
