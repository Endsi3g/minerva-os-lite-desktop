'use client';

import { useState, useMemo, useRef, useId, useEffect } from 'react';
import Link from 'next/link';
import { Map, useMap } from '@/components/ui/map';
import type { Lead } from '@/lib/mock-data';
import { ChevronDown, ChevronUp, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMP_SCORE: Record<string, number> = { Hot: 100, Warm: 55, Cold: 15 };

function leadTempScore(lead: Lead): number {
  if (typeof lead.score === 'number' && lead.score > 0) return lead.score;
  return TEMP_SCORE[lead.temperature] ?? 30;
}

type ClusterLead = { id: string; businessName: string; city?: string; temperature: Lead['temperature']; score: number };

// Couche de clusters — mêmes principes que CrmLeadsLayer de /map (source
// GeoJSON clusterisée nativement par MapLibre), mais colorée par température
// moyenne du cluster plutôt que par statut, et avec un clic qui liste les
// leads du cluster au lieu de zoomer seulement.
function ClusterLayer({
  leads,
  onClusterClick,
  onLeadClick,
}: {
  leads: (Lead & { _lat: number; _lng: number })[];
  onClusterClick: (leads: ClusterLead[], coords: [number, number]) => void;
  onLeadClick: (leadId: string) => void;
}) {
  const { map, isLoaded } = useMap();
  const uid = useId().replace(/:/g, '');
  const sourceId = `prosp-cluster-src-${uid}`;
  const clustersId = `prosp-clusters-${uid}`;
  const countId = `prosp-cluster-count-${uid}`;
  const pointsId = `prosp-points-${uid}`;
  const initialized = useRef(false);

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: leads.map((l) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l._lng, l._lat] },
      properties: {
        id: l.id,
        businessName: l.businessName || '',
        city: l.city || '',
        temperature: l.temperature || 'Cold',
        score: leadTempScore(l),
      },
    })),
  }), [leads]);

  useEffect(() => {
    if (!map || !isLoaded || initialized.current) return;
    initialized.current = true;

    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
      clusterProperties: {
        // Somme des scores du cluster — divisée par point_count au paint pour la moyenne.
        sum_score: ['+', ['accumulated'], ['get', 'score']],
      },
    });

    map.addLayer({
      id: clustersId, type: 'circle', source: sourceId, filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'interpolate', ['linear'],
          ['/', ['get', 'sum_score'], ['get', 'point_count']],
          0, '#93c5fd', 50, '#f59e0b', 100, '#dc2626',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 26, 30, 34],
        'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-opacity': 0.9,
      },
    });

    map.addLayer({
      id: countId, type: 'symbol', source: sourceId, filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 11, 'text-font': ['Open Sans Bold'] },
      paint: { 'text-color': '#fff' },
    });

    map.addLayer({
      id: pointsId, type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'temperature'], 'Hot', '#dc2626', 'Warm', '#f59e0b', '#93c5fd'],
        'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-opacity': 0.95,
      },
    });

    map.on('click', clustersId, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const src = map.getSource(sourceId) as any;
      const clusterId = feat.properties?.cluster_id;
      const geom = feat.geometry as GeoJSON.Point;
      const coords = geom.coordinates as [number, number];

      // Zoom in a bit AND list the leads inside — pas juste l'un ou l'autre.
      src.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
        if (!err && zoom) map.easeTo({ center: coords, zoom: Math.min(zoom, 15) });
      });
      src.getClusterLeaves(clusterId, 100, 0, (err: unknown, features: GeoJSON.Feature[]) => {
        if (err || !features) return;
        const clusterLeads: ClusterLead[] = features.map((f) => ({
          id: f.properties?.id, businessName: f.properties?.businessName,
          city: f.properties?.city, temperature: f.properties?.temperature, score: f.properties?.score,
        }));
        onClusterClick(clusterLeads, coords);
      });
    });
    map.on('mouseenter', clustersId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', clustersId, () => { map.getCanvas().style.cursor = ''; });

    map.on('click', pointsId, (e) => {
      const feat = e.features?.[0];
      if (feat?.properties?.id) onLeadClick(feat.properties.id);
    });
    map.on('mouseenter', pointsId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', pointsId, () => { map.getCanvas().style.cursor = ''; });

    return () => {
      try {
        [countId, pointsId, clustersId].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* style may be mid-reload */ }
      initialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const src = map.getSource(sourceId) as any;
    src?.setData(geojson);
  }, [map, isLoaded, geojson, sourceId]);

  return null;
}

const CITY_COORDS: Record<string, [number, number]> = {
  montreal: [45.5019, -73.5674], montréal: [45.5019, -73.5674],
  quebec: [46.8139, -71.2080], québec: [46.8139, -71.2080],
  laval: [45.6066, -73.7124], gatineau: [45.4765, -75.7013],
  longueuil: [45.5312, -73.5183], sherbrooke: [45.4042, -71.8929],
};
const DEFAULT_COORDS: [number, number] = [45.5019, -73.5674];

function resolveCoords(lead: Lead): { lat: number; lng: number } {
  if (lead.latitude && lead.longitude) return { lat: lead.latitude, lng: lead.longitude };
  const key = (lead.city || '').toLowerCase().trim();
  const c = CITY_COORDS[key] ?? DEFAULT_COORDS;
  const jit = () => (Math.random() - 0.5) * 0.02;
  return { lat: c[0] + jit(), lng: c[1] + jit() };
}

export function ProspectingMiniMap({ leads }: { leads: Lead[] }) {
  const [expanded, setExpanded] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Lead['status']>('all');
  const [minScore, setMinScore] = useState(0);
  const [clusterPanel, setClusterPanel] = useState<ClusterLead[] | null>(null);

  const filtered = useMemo(() => {
    return leads
      .filter((l) => statusFilter === 'all' || l.status === statusFilter)
      .filter((l) => leadTempScore(l) >= minScore)
      .map((l) => {
        const { lat, lng } = resolveCoords(l);
        return { ...l, _lat: lat, _lng: lng };
      });
  }, [leads, statusFilter, minScore]);

  return (
    <div className="border border-[#e5e5e0] rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
      >
        <span className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#059669]" />
          Carte des leads ({filtered.length})
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-[#7a7a76]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76]" />}
      </button>

      {expanded && (
        <div className="border-t border-[#e5e5e0]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#e5e5e0] bg-[#fafaf8] flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-[11px] border border-[#e5e5e0] rounded px-2 py-1 bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="New">Nouveau</option>
              <option value="Contacted">Contacté</option>
              <option value="Meeting Booked">RDV planifié</option>
              <option value="Won">Gagné</option>
              <option value="Lost">Perdu</option>
            </select>
            <label className="flex items-center gap-1.5 text-[11px] text-[#7a7a76]">
              Score min.
              <input
                type="range" min={0} max={100} step={10}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-24"
              />
              <span className="font-bold text-[#26251e] w-7">{minScore}</span>
            </label>
          </div>

          <div className="relative h-64">
            <Map viewport={{ center: [-73.5674, 45.5019], zoom: 9 }} onViewportChange={() => {}}>
              <ClusterLayer
                leads={filtered}
                onClusterClick={(clusterLeads) => setClusterPanel(clusterLeads)}
                onLeadClick={(leadId) => setClusterPanel(filtered.filter((l) => l.id === leadId).map((l) => ({ id: l.id, businessName: l.businessName, city: l.city, temperature: l.temperature, score: leadTempScore(l) })))}
              />
            </Map>

            {clusterPanel && (
              <div className="absolute top-2 right-2 bottom-2 w-56 bg-white border border-[#e5e5e0] rounded-lg shadow-lg overflow-hidden flex flex-col z-10">
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e5e0] shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{clusterPanel.length} lead{clusterPanel.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setClusterPanel(null)} className="text-[#7a7a76] hover:text-[#26251e]"><X className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#e5e5e0]/60">
                  {clusterPanel.map((l) => (
                    <Link key={l.id} href={`/leads/${l.id}`} className="block px-3 py-2 hover:bg-[#f4f4f3] transition-colors">
                      <p className="text-xs font-semibold text-[#26251e] truncate">{l.businessName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {l.city && <span className="text-[10px] text-[#7a7a76]">{l.city}</span>}
                        <span className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto',
                          l.temperature === 'Hot' ? 'bg-red-50 text-red-600' : l.temperature === 'Warm' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                        )}>
                          {l.temperature === 'Hot' ? '🔥' : l.temperature === 'Warm' ? '☀️' : '❄️'} {l.temperature}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
