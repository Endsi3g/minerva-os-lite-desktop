'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef, useId } from 'react';
import {
  Map, useMap, MapMarker, MarkerContent, MarkerTooltip,
  MapControls, MapRoute,
} from '@/components/ui/map';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, X, MapPin, Mail, Loader2,
  ChevronRight, Users, Zap, PanelLeft, Navigation, Star,
  Layers, Route, Plus, Trash2, CheckSquare, ExternalLink,
  ArrowRight, RefreshCw, Clock, Activity, Building2, Satellite,
  Brain, Play, Square, Camera, Globe, Pencil, Wifi, WifiOff,
  MapPinOff, LocateFixed,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  New: '#7a7a76', Contacted: '#6b7280', 'Meeting Booked': '#2563eb',
  'Proposal Sent': '#d97706', Negotiation: '#7c3aed', Won: '#059669', Lost: '#ef4444',
};
const STATUS_LABELS: Record<string, string> = {
  New: 'Nouveau', Contacted: 'Contacté', 'Meeting Booked': 'RDV planifié',
  'Proposal Sent': 'Proposition', Negotiation: 'Négociation', Won: 'Gagné', Lost: 'Perdu',
};
const ALL_STATUSES = Object.keys(STATUS_COLORS) as Lead['status'][];

const CITY_COORDS: Record<string, [number, number]> = {
  montreal: [45.5019, -73.5674], montréal: [45.5019, -73.5674],
  quebec: [46.8139, -71.2080], québec: [46.8139, -71.2080],
  laval: [45.6066, -73.7124], gatineau: [45.4765, -75.7013],
  longueuil: [45.5312, -73.5183], sherbrooke: [45.4042, -71.8929],
  saguenay: [48.4279, -71.0686], levis: [46.8033, -71.1778],
  lévis: [46.8033, -71.1778], terrebonne: [45.7000, -73.6334],
  repentigny: [45.7423, -73.4513], drummondville: [45.8835, -72.4831],
  granby: [45.4042, -72.7340], 'saint-jerome': [45.7805, -74.0034],
};
const DEFAULT_COORDS: [number, number] = [45.5019, -73.5674];

function resolveCoords(lead: Lead): { lat: number; lng: number; estimated: boolean } {
  if (lead.latitude && lead.longitude) return { lat: lead.latitude, lng: lead.longitude, estimated: false };
  const key = (lead.city || '').toLowerCase().trim().replace(/[éè]/g, 'e').replace(/[àâ]/g, 'a');
  const c = CITY_COORDS[key] ?? DEFAULT_COORDS;
  const jit = () => (Math.random() - 0.5) * 0.025;
  return { lat: c[0] + jit(), lng: c[1] + jit(), estimated: true };
}

type EnrichedLead = Lead & { _lat: number; _lng: number; _estimated: boolean };
type SidebarTab = 'leads' | 'prospection' | 'tournee';

interface ProspectResult {
  id: string; businessName: string; niche: string; city: string;
  phone: string; email: string; website: string; address: string;
  latitude?: number; longitude?: number; qualityScore: number;
  completenessScore: number; localFitScore: number; opportunityScore: number;
  source: string; rating?: number; reviewsCount?: number; originalTags?: Record<string, string>;
}

interface Waypoint extends EnrichedLead { _order: number }

// ── CRM leads layer (clustered, status-colored, heatmap) ───────────────────────

function CrmLeadsLayer({
  leads, onLeadClick, showHeatmap,
}: {
  leads: EnrichedLead[];
  onLeadClick: (id: string) => void;
  showHeatmap: boolean;
}) {
  const { map, isLoaded } = useMap();
  const uid = useId().replace(/:/g, '');
  const sourceId = `crm-src-${uid}`;
  const clustersId = `crm-clusters-${uid}`;
  const clusterCountId = `crm-cluster-count-${uid}`;
  const pointsId = `crm-points-${uid}`;
  const heatmapId = `crm-heat-${uid}`;
  const initialized = useRef(false);

  const geojson = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: leads.map(l => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l._lng, l._lat] },
      properties: { id: l.id, status: l.status || 'New', name: l.businessName || '' },
    })),
  }), [leads]);

  // Init layers once
  useEffect(() => {
    if (!map || !isLoaded || initialized.current) return;
    initialized.current = true;

    map.addSource(sourceId, { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });

    map.addLayer({ id: heatmapId, type: 'heatmap', source: sourceId, maxzoom: 13,
      paint: {
        'heatmap-weight': 1, 'heatmap-intensity': 1.2, 'heatmap-radius': 35,
        'heatmap-opacity': showHeatmap ? 0.65 : 0,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(5,150,105,0)', 0.3, 'rgba(5,150,105,0.3)',
          0.7, 'rgba(5,150,105,0.6)', 1, 'rgba(5,150,105,0.9)'],
      },
    });

    map.addLayer({ id: clustersId, type: 'circle', source: sourceId, filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#059669', 10, '#047857', 30, '#065f46'],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 30, 36],
        'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-opacity': 0.9,
      },
    });

    map.addLayer({ id: clusterCountId, type: 'symbol', source: sourceId, filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
      paint: { 'text-color': '#fff' },
    });

    map.addLayer({ id: pointsId, type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'status'],
          'New', '#7a7a76', 'Contacted', '#6b7280', 'Meeting Booked', '#2563eb',
          'Proposal Sent', '#d97706', 'Negotiation', '#7c3aed',
          'Won', '#059669', 'Lost', '#ef4444', '#7a7a76'],
        'circle-radius': 8, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });

    // Cluster click → zoom in
    map.on('click', clustersId, (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const src = map.getSource(sourceId) as any;
      src?.getClusterExpansionZoom(feat.properties?.cluster_id, (err: any, zoom: number) => {
        if (err) return;
        const geom = feat.geometry as GeoJSON.Point;
        map.easeTo({ center: geom.coordinates as [number, number], zoom });
      });
    });
    map.on('mouseenter', clustersId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', clustersId, () => { map.getCanvas().style.cursor = ''; });

    // Point click → select lead
    map.on('click', pointsId, (e) => {
      const feat = e.features?.[0];
      if (feat?.properties?.id) onLeadClick(feat.properties.id);
    });
    map.on('mouseenter', pointsId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', pointsId, () => { map.getCanvas().style.cursor = ''; });

    return () => {
      try {
        [heatmapId, clusterCountId, pointsId, clustersId].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore cleanup */ }
      initialized.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  // Live update data
  useEffect(() => {
    if (!map || !isLoaded || !map.getSource(sourceId)) return;
    (map.getSource(sourceId) as any)?.setData(geojson);
  }, [map, isLoaded, geojson, sourceId]);

  // Toggle heatmap opacity
  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(heatmapId)) return;
    map.setPaintProperty(heatmapId, 'heatmap-opacity', showHeatmap ? 0.65 : 0);
  }, [map, isLoaded, showHeatmap, heatmapId]);

  return null;
}

// ── 3D Buildings layer ─────────────────────────────────────────────────────────

function ThreeDLayer({ enabled }: { enabled: boolean }) {
  const { map, isLoaded } = useMap();
  const initialized = useRef(false);
  const layerId = '3d-buildings-extrusion';
  const prevEnabled = useRef(enabled);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Tilt map when enabling 3D
    if (enabled !== prevEnabled.current) {
      map.easeTo({ pitch: enabled ? 52 : 0, bearing: enabled ? -17 : 0, duration: 600 });
      prevEnabled.current = enabled;
    }

    if (enabled && !initialized.current) {
      initialized.current = true;
      try {
        // CartoDB Positron GL style has 'carto' source with 'building' layer
        const style = map.getStyle();
        const sources = style?.sources ? Object.keys(style.sources) : [];
        const buildingSource = sources.find(s => s === 'carto' || s.includes('carto'));

        if (buildingSource && !map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            source: buildingSource,
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 14,
            paint: {
              'fill-extrusion-color': '#d4d4ce',
              'fill-extrusion-height': ['coalesce', ['get', 'height'], ['get', 'render_height'], 8],
              'fill-extrusion-base': ['coalesce', ['get', 'min_height'], ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.72,
            },
          });
        }
      } catch { /* source layer may not exist in this style, silently skip */ }
    }

    if (!enabled && initialized.current) {
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch { /* ignore */ }
      initialized.current = false;
    }

    return () => {
      if (initialized.current) {
        try { if (map?.getLayer(layerId)) map.removeLayer(layerId); } catch { /* ignore */ }
        initialized.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  return null;
}

// ── Satellite layer ────────────────────────────────────────────────────────────

function SatelliteLayer({ enabled }: { enabled: boolean }) {
  const { map, isLoaded } = useMap();
  const srcId = 'esri-satellite-src';
  const layId = 'esri-satellite-layer';
  const initialized = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (enabled && !initialized.current) {
      initialized.current = true;
      try {
        if (!map.getSource(srcId)) {
          map.addSource(srcId, {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Esri World Imagery',
          });
        }
        if (!map.getLayer(layId)) {
          // Insert below road/label layers for better UX
          const roadLayer = map.getStyle()?.layers?.find(l => l.type === 'line' && (l.id.includes('road') || l.id.includes('tunnel')));
          map.addLayer({ id: layId, type: 'raster', source: srcId, paint: { 'raster-opacity': 0.88 } }, roadLayer?.id);
        }
      } catch { /* ignore */ }
    }

    if (!enabled && initialized.current) {
      try {
        if (map.getLayer(layId)) map.removeLayer(layId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch { /* ignore */ }
      initialized.current = false;
    }

    return () => {
      if (initialized.current) {
        try {
          if (map?.getLayer(layId)) map.removeLayer(layId);
          if (map?.getSource(srcId)) map.removeSource(srcId);
        } catch { /* ignore */ }
        initialized.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, enabled]);

  return null;
}

// ── Fly-through controller ─────────────────────────────────────────────────────

function useFlyThrough(waypoints: { _lat: number; _lng: number; businessName: string }[]) {
  const { map, isLoaded } = useMap();
  const [isFlying, setIsFlying] = useState(false);
  const flyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFlyThrough = useCallback(() => {
    if (!map || !isLoaded || waypoints.length < 1) return;
    setIsFlying(true);
    let idx = 0;

    const flyNext = () => {
      if (idx >= waypoints.length) {
        setIsFlying(false);
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
        return;
      }
      const wp = waypoints[idx++];
      map.flyTo({
        center: [wp._lng, wp._lat],
        zoom: 16,
        pitch: 55,
        bearing: 30 + (idx * 45) % 360,
        duration: 2800,
        essential: true,
      });
      flyTimeoutRef.current = setTimeout(flyNext, 3200);
    };

    flyNext();
  }, [map, isLoaded, waypoints]);

  const stopFlyThrough = useCallback(() => {
    if (flyTimeoutRef.current) clearTimeout(flyTimeoutRef.current);
    setIsFlying(false);
    map?.easeTo({ pitch: 0, bearing: 0, duration: 600 });
  }, [map]);

  useEffect(() => () => { if (flyTimeoutRef.current) clearTimeout(flyTimeoutRef.current); }, []);

  return { isFlying, startFlyThrough, stopFlyThrough };
}

// ── FlyThrough wrapper (needs to be inside <Map> children) ────────────────────

function FlyThroughLayer({ waypoints }: { waypoints: { _lat: number; _lng: number; businessName: string }[] }) {
  const { isFlying, startFlyThrough, stopFlyThrough } = useFlyThrough(waypoints);
  return (
    <div className="absolute bottom-20 right-4 z-30">
      {waypoints.length >= 1 && (
        <button
          onClick={isFlying ? stopFlyThrough : startFlyThrough}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg border transition-colors',
            isFlying
              ? 'bg-[#ef4444] text-white border-[#ef4444] hover:bg-[#dc2626]'
              : 'bg-[#7c3aed] text-white border-[#7c3aed] hover:bg-[#6d28d9]',
          )}
          title={isFlying ? 'Arrêter le survol' : 'Survol cinématique de la tournée'}
        >
          {isFlying ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isFlying ? 'Arrêter' : 'Survol'}
        </button>
      )}
    </div>
  );
}

// ── Point-in-polygon (ray casting) ────────────────────────────────────────────

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > point[1]) !== (yj > point[1])) && (point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ── ORS route fetcher + display ────────────────────────────────────────────────

function RouteLayer({ waypoints }: { waypoints: Waypoint[] }) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    if (waypoints.length < 2) { setRouteCoords([]); setRouteInfo(null); return; }
    const coords = waypoints.map(w => [w._lng, w._lat] as [number, number]);
    fetch(getApiUrl('/api/routing'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints: coords }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.coordinates) {
          setRouteCoords(d.coordinates);
          setRouteInfo({ distanceKm: d.distanceKm, durationMin: d.durationMin });
        }
      })
      .catch(() => {});
  }, [waypoints]);

  if (routeCoords.length < 2) return null;

  return (
    <>
      <MapRoute
        coordinates={routeCoords}
        color="#059669"
        width={4}
        opacity={0.75}
      />
      {routeInfo && (
        <div className="absolute bottom-14 right-4 z-20 bg-white/95 backdrop-blur-md rounded-xl border border-[#e5e5e0] shadow-lg px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5 text-[#059669]" />
            <span className="text-xs font-bold text-[#26251e]">{routeInfo.distanceKm.toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#7a7a76]" />
            <span className="text-xs font-semibold text-[#7a7a76]">{routeInfo.durationMin} min</span>
          </div>
        </div>
      )}
    </>
  );
}

// ── Drawing layer (polygon → auto-tournée) ────────────────────────────────────

interface DrawingLayerProps {
  leads: EnrichedLead[];
  onCreateTournee: (leads: EnrichedLead[]) => void;
}

function DrawingLayer({ leads, onCreateTournee }: DrawingLayerProps) {
  const { map } = useMap();
  const [isDrawing, setIsDrawing] = useState(false);
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [closedPolygon, setClosedPolygon] = useState<[number, number][] | null>(null);
  const [leadsInZone, setLeadsInZone] = useState<EnrichedLead[]>([]);

  const SRC_ID = 'draw-polygon-src';
  const FILL_ID = 'draw-polygon-fill';
  const LINE_ID = 'draw-polygon-line';

  // Sync polygon to MapLibre source
  useEffect(() => {
    if (!map) return;
    const poly = closedPolygon ?? (vertices.length > 1 ? [...vertices, vertices[0]] : []);
    const geojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [poly] },
      properties: {},
    };
    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, { type: 'geojson', data: geojson });
      map.addLayer({ id: FILL_ID, type: 'fill', source: SRC_ID, paint: { 'fill-color': '#059669', 'fill-opacity': 0.12 } });
      map.addLayer({ id: LINE_ID, type: 'line', source: SRC_ID, paint: { 'line-color': '#059669', 'line-width': 2, 'line-dasharray': [2, 2] } });
    } else {
      (map.getSource(SRC_ID) as any).setData(geojson);
    }
    return () => {
      if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(SRC_ID)) map.removeSource(SRC_ID);
    };
  }, [map, vertices, closedPolygon]);

  // Click handler
  useEffect(() => {
    if (!map || !isDrawing) return;
    const onClick = (e: any) => {
      setVertices(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    const onDblClick = (e: any) => {
      e.preventDefault();
      setVertices(prev => {
        if (prev.length < 3) return prev;
        const closed = [...prev, prev[0]];
        setClosedPolygon(closed);
        const inside = leads.filter(l => l._lng && l._lat && pointInPolygon([l._lng, l._lat], closed));
        setLeadsInZone(inside);
        return prev;
      });
      setIsDrawing(false);
    };
    map.on('click', onClick);
    map.on('dblclick', onDblClick);
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      map.off('click', onClick);
      map.off('dblclick', onDblClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isDrawing, leads]);

  const handleReset = () => {
    setVertices([]);
    setClosedPolygon(null);
    setLeadsInZone([]);
    setIsDrawing(false);
  };

  return (
    <div className="absolute bottom-32 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
      {leadsInZone.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-xl border border-[#059669]/30 shadow-lg px-3 py-2.5 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-[#26251e]">{leadsInZone.length} leads dans la zone</p>
          <button
            onClick={() => { onCreateTournee(leadsInZone); handleReset(); }}
            className="text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Créer tournée →
          </button>
          <button onClick={handleReset} className="text-[10px] text-[#7a7a76] hover:text-[#26251e] text-center">Effacer zone</button>
        </div>
      )}
      {!leadsInZone.length && (
        <button
          onClick={() => { if (isDrawing) { handleReset(); } else { setIsDrawing(true); } }}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
            isDrawing ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white'
          )}
          title={isDrawing ? 'Double-clic pour fermer la zone' : 'Dessiner une zone'}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isDrawing ? 'Dbl-clic pour clore' : 'Zone'}</span>
        </button>
      )}
    </div>
  );
}

// ── GPS real-time tracking ─────────────────────────────────────────────────────

interface TeamPosition {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  updatedAt: number;
}

interface GpsTrackingLayerProps {
  workspaceId: string | undefined;
  onPositionUpdate?: (pos: { lat: number; lng: number } | null) => void;
}

function GpsTrackingLayer({ workspaceId, onPositionUpdate }: GpsTrackingLayerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [teamPositions, setTeamPositions] = useState<TeamPosition[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const myUserIdRef = useRef<string | null>(null);
  const myUserNameRef = useRef<string>('Moi');

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        myUserIdRef.current = user.id;
        myUserNameRef.current = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Moi';
      }
    };
    getUser();
  }, []);

  const startTracking = useCallback(() => {
    if (!workspaceId || !navigator.geolocation) return;
    setIsTracking(true);

    const supabase = createClient();
    const channel = supabase.channel(`team-gps-${workspaceId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'position' }, ({ payload }: { payload: TeamPosition }) => {
        setTeamPositions(prev => {
          const others = prev.filter(p => p.userId !== payload.userId);
          return [...others, payload];
        });
      })
      .subscribe();

    channelRef.current = channel;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPosition({ lat, lng });
        onPositionUpdate?.({ lat, lng });
        if (myUserIdRef.current) {
          channel.send({
            type: 'broadcast',
            event: 'position',
            payload: {
              userId: myUserIdRef.current,
              userName: myUserNameRef.current,
              lat,
              lng,
              updatedAt: Date.now(),
            } as TeamPosition,
          });
        }
      },
      () => { /* geolocation denied */ },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }, [workspaceId]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    setMyPosition(null);
    setTeamPositions([]);
    onPositionUpdate?.(null);
  }, [onPositionUpdate]);

  useEffect(() => () => { stopTracking(); }, [stopTracking]);

  // Remove stale positions older than 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000;
      setTeamPositions(prev => prev.filter(p => p.updatedAt > cutoff));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* My position marker */}
      {myPosition && (
        <MapMarker longitude={myPosition.lng} latitude={myPosition.lat}>
          <MarkerContent>
            <div className="flex items-center justify-center rounded-full border-2 border-white shadow-lg text-white text-[9px] font-black animate-pulse"
              style={{ width: 28, height: 28, background: '#059669' }}>
              <LocateFixed className="h-3.5 w-3.5" />
            </div>
          </MarkerContent>
          <MarkerTooltip>Vous (live)</MarkerTooltip>
        </MapMarker>
      )}

      {/* Team member markers */}
      {teamPositions.map(p => (
        <MapMarker key={p.userId} longitude={p.lng} latitude={p.lat}>
          <MarkerContent>
            <div className="flex items-center justify-center rounded-full border-2 border-white shadow-md text-white text-[9px] font-black"
              style={{ width: 26, height: 26, background: '#7c3aed' }}>
              {p.userName[0]?.toUpperCase() || '?'}
            </div>
          </MarkerContent>
          <MarkerTooltip>{p.userName}</MarkerTooltip>
        </MapMarker>
      ))}

      {/* Toggle button */}
      <div className="absolute bottom-48 right-4 z-20 pointer-events-auto">
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
            isTracking
              ? 'bg-[#059669] text-white border-[#059669]'
              : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white'
          )}
          title={isTracking ? 'Arrêter le partage GPS' : 'Partager ma position en live'}
        >
          {isTracking ? <Wifi className="h-3.5 w-3.5 animate-pulse" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">GPS</span>
          {teamPositions.length > 0 && (
            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-white/20 text-[9px] font-black">
              {teamPositions.length}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

// ── Haversine distance (km) ────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Fly controller (must live inside <Map>) ────────────────────────────────────

function FlyController({ target }: { target: EnrichedLead | null }) {
  const { map, isLoaded } = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || !target) return;
    if (prevId.current === target.id) return;
    prevId.current = target.id;
    map.flyTo({ center: [target._lng, target._lat], zoom: 15, duration: 900, essential: true });
  }, [map, isLoaded, target]);

  return null;
}

// ── Lead popup on map (must live inside <Map>) ─────────────────────────────────

interface LeadMapPopupProps {
  lead: EnrichedLead | null;
  onClose: () => void;
  onOpenDetail: () => void;
  distanceKm?: number | null;
}

function LeadMapPopup({ lead, onClose, onOpenDetail, distanceKm }: LeadMapPopupProps) {
  const { map, isLoaded } = useMap();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!map || !isLoaded || !lead) { setPos(null); return; }
    const update = () => {
      const pt = map.project([lead._lng, lead._lat]);
      setPos({ x: pt.x, y: pt.y });
    };
    update();
    map.on('move', update);
    map.on('zoom', update);
    return () => { map.off('move', update); map.off('zoom', update); };
  }, [map, isLoaded, lead]);

  if (!lead || !pos) return null;

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y - 14, transform: 'translate(-50%, -100%)', zIndex: 60, pointerEvents: 'auto' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e5e5e0] w-64 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#f0f0ec] flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#26251e] truncate leading-tight">{lead.businessName}</p>
            <p className="text-[9px] text-[#7a7a76] mt-0.5 flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 shrink-0" />{lead.city}{lead.niche ? ` · ${lead.niche}` : ''}
              {distanceKm != null && <span className="ml-1 text-[#059669] font-bold">{distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}</span>}
            </p>
          </div>
          <button onClick={onClose} className="w-5 h-5 rounded-full hover:bg-[#f4f4f3] flex items-center justify-center shrink-0">
            <X className="h-3 w-3 text-[#7a7a76]" />
          </button>
        </div>
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: STATUS_COLORS[lead.status || 'New'] }}>
            {STATUS_LABELS[lead.status || 'New']}
          </span>
          {lead.score != null && <span className="text-[9px] font-black text-[#059669]">Score {lead.score}</span>}
        </div>
        {(lead.contactEmail || lead.phone) && (
          <div className="px-4 pb-2 space-y-1">
            {lead.contactEmail && <p className="text-[9px] text-[#7a7a76] truncate flex items-center gap-1"><Mail className="h-2.5 w-2.5 shrink-0" />{lead.contactEmail}</p>}
            {lead.phone && <p className="text-[9px] text-[#7a7a76] truncate">📞 {lead.phone}</p>}
          </div>
        )}
        <div className="px-4 pb-3 flex gap-2">
          <button onClick={onOpenDetail} className="flex-1 h-7 bg-[#059669] hover:bg-[#047857] text-white text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors">
            <ChevronRight className="h-3 w-3" /> Voir détails
          </button>
          <a href={`/leads/${lead.id}`} className="flex-1 h-7 bg-[#f4f4f3] hover:bg-[#e5e5e0] text-[#26251e] text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors">
            <ExternalLink className="h-3 w-3" /> Fiche
          </a>
        </div>
      </div>
      {/* Arrow */}
      <div className="flex justify-center">
        <div className="w-3 h-2 overflow-hidden"><div className="w-3 h-3 bg-white border-r border-b border-[#e5e5e0] rotate-45 -translate-y-1/2 shadow-sm" /></div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MapRoot() {
  const { leads, addLeadValidations, updateLeadStatus, addTask, activeWorkspace } = useReach();

  // Sidebar & map state
  const [activeTab, setActiveTab] = useState<SidebarTab>('leads');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [nicheFilter, setNicheFilter] = useState('');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [cityFilter, setCityFilter] = useState('');
  const [notContactedDaysFilter, setNotContactedDaysFilter] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Lead detail drawer + map popup
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [showDraftArea, setShowDraftArea] = useState(false);
  const [quickStatus, setQuickStatus] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // GPS shared position for nearby leads
  const [myGpsPosition, setMyGpsPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Advanced map features
  const [show3D, setShow3D] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [showAiQueryBar, setShowAiQueryBar] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiQueryLoading, setAiQueryLoading] = useState(false);

  // AI spatial query handler
  const handleAiQuery = useCallback(async () => {
    if (!aiQuery.trim()) return;
    setAiQueryLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyse cette requête spatiale CRM et retourne un objet JSON de filtres. Requête: "${aiQuery}"

Retourne UNIQUEMENT un JSON valide (pas de texte autour) avec ces clés optionnelles:
{
  "statuses": ["New","Contacted","Meeting Booked","Proposal Sent","Negotiation","Won","Lost"],
  "niche": "string ou null",
  "city": "string ou null",
  "minScore": 0-100,
  "maxScore": 0-100,
  "notContactedSinceDays": null ou nombre de jours,
  "searchQuery": "string ou null"
}`,
          }],
          model: 'claude-haiku-4-5-20251001',
          provider: 'anthropic',
          system: 'Tu es un moteur de filtres CRM. Retourne UNIQUEMENT du JSON valide selon le schéma demandé.',
        }),
      });
      if (!res.ok || !res.body) throw new Error('API error');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try { raw += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ''; } catch { /* ignore */ }
          }
        }
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const filters = JSON.parse(jsonMatch[0]);
        if (filters.statuses?.length) setStatusFilters(new Set(filters.statuses));
        if (filters.niche) setNicheFilter(filters.niche);
        if (filters.searchQuery) setSearchQuery(filters.searchQuery);
        if (filters.city) setCityFilter(filters.city);
        if (filters.notContactedSinceDays != null) setNotContactedDaysFilter(filters.notContactedSinceDays);
        if (filters.minScore != null || filters.maxScore != null) {
          setScoreRange([filters.minScore ?? 0, filters.maxScore ?? 100]);
        }
      }
    } catch { /* keep current filters */ }
    finally {
      setAiQueryLoading(false);
      setShowAiQueryBar(false);
      setAiQuery('');
    }
  }, [aiQuery]);

  // Prospection
  const [prospNiche, setProspNiche] = useState('');
  const [prospCity, setProspCity] = useState('Montréal');
  const [prospRadius, setProspRadius] = useState(5000);
  const [prospLoading, setProspLoading] = useState(false);
  const [prospResults, setProspResults] = useState<ProspectResult[]>([]);
  const [prospError, setProspError] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Tournée (route planning)
  const [tourWaypoints, setTourWaypoints] = useState<Waypoint[]>([]);

  const handleCreateTourneeFromZone = useCallback((zoneLeads: EnrichedLead[]) => {
    const valid = zoneLeads.filter(l => l._lat && l._lng);
    setTourWaypoints(valid.map(l => ({ ...l } as unknown as Waypoint)));
    setActiveTab('tournee' as SidebarTab);
  }, []);

  // Enrich leads with coordinates
  const enrichedLeads = useMemo<EnrichedLead[]>(() => {
    return leads.map(lead => {
      const c = resolveCoords(lead);
      return { ...lead, _lat: c.lat, _lng: c.lng, _estimated: c.estimated };
    });
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const now = Date.now();
    return enrichedLeads.filter(lead => {
      if (searchQuery &&
        !lead.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !lead.city?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilters.size > 0 && !statusFilters.has(lead.status || 'New')) return false;
      if (nicheFilter && lead.niche !== nicheFilter) return false;
      if (cityFilter && !lead.city?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (notContactedDaysFilter != null) {
        const lastContact = lead.firstContactAt ? new Date(lead.firstContactAt).getTime() : 0;
        const daysSince = (now - lastContact) / 86_400_000;
        if (daysSince < notContactedDaysFilter) return false;
      }
      const score = lead.score ?? 0;
      return score >= scoreRange[0] && score <= scoreRange[1];
    });
  }, [enrichedLeads, searchQuery, statusFilters, nicheFilter, scoreRange, cityFilter, notContactedDaysFilter]);

  const uniqueNiches = useMemo(
    () => [...new Set(leads.map(l => l.niche).filter(Boolean))].sort() as string[],
    [leads]
  );

  const activeFilterCount = (statusFilters.size > 0 ? 1 : 0) + (nicheFilter ? 1 : 0) + (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0);

  // Lead click from map or sidebar list
  const handleLeadClick = useCallback((id: string) => {
    const lead = enrichedLeads.find(l => l.id === id) ?? null;
    setSelectedLead(lead);
    setShowDetailPanel(false); // show popup first, user can open detail panel from popup
    setQuickStatus(lead?.status || '');
    setShowDraftArea(false);
    setDraftContent('');
  }, [enrichedLeads]);

  const distanceToSelected = useMemo(() => {
    if (!myGpsPosition || !selectedLead) return null;
    return haversine(myGpsPosition.lat, myGpsPosition.lng, selectedLead._lat, selectedLead._lng);
  }, [myGpsPosition, selectedLead]);

  // Distance from GPS for each lead
  const leadsWithDistance = useMemo(() => {
    if (!myGpsPosition) return filteredLeads.map(l => ({ ...l, _distance: null as number | null }));
    return filteredLeads
      .map(l => ({ ...l, _distance: haversine(myGpsPosition.lat, myGpsPosition.lng, l._lat, l._lng) }))
      .sort((a, b) => (a._distance ?? 9999) - (b._distance ?? 9999));
  }, [filteredLeads, myGpsPosition]);

  // Quick status update
  const handleStatusChange = async (status: string) => {
    if (!selectedLead) return;
    setQuickStatus(status);
    await updateLeadStatus(selectedLead.id, status as Lead['status']);
    setSelectedLead(prev => prev ? { ...prev, status: status as Lead['status'] } : null);
  };

  // Quick task creation
  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !selectedLead) return;
    setCreatingTask(true);
    await addTask(`${taskTitle} — ${selectedLead.businessName}`, 'Follow-up');
    setTaskTitle('');
    setCreatingTask(false);
  };

  // Draft generation
  const handleGenerateDraft = async () => {
    if (!selectedLead) return;
    setGeneratingDraft(true);
    setShowDraftArea(true);
    try {
      const res = await fetch(getApiUrl('/api/generate-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, channel: 'Email', tone: 'Direct' }),
      });
      const data = await res.json();
      setDraftContent(data.content || data.error || 'Erreur.');
    } catch { setDraftContent('Erreur réseau.'); }
    finally { setGeneratingDraft(false); }
  };

  // Prospection live
  const handleProspSearch = async () => {
    if (!prospNiche.trim()) return;
    setProspLoading(true);
    setProspError('');
    setProspResults([]);
    try {
      const res = await fetch(getApiUrl('/api/prospect/search'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niches: [prospNiche], cities: [prospCity], radius: prospRadius }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProspResults(data.leads || []);
    } catch (e: any) {
      setProspError(e.message || 'Erreur réseau');
    } finally { setProspLoading(false); }
  };

  const handleAddProspect = async (r: ProspectResult) => {
    await addLeadValidations([{
      businessName: r.businessName, niche: r.niche, city: r.city,
      phone: r.phone || '', email: r.email || '', website: r.website || '',
      address: r.address || '', rating: r.rating ?? 0, reviewsCount: r.reviewsCount ?? 0,
      latitude: r.latitude, longitude: r.longitude, source: 'osm', status: 'to_verify',
      originalTags: r.originalTags || {},
      qualityScore: r.qualityScore, completenessScore: r.completenessScore,
      localFitScore: r.localFitScore, opportunityScore: r.opportunityScore,
    }]);
    setAddedIds(prev => new Set([...prev, r.id]));
  };

  // Tournée — add/remove waypoints
  const toggleWaypoint = (lead: EnrichedLead) => {
    setTourWaypoints(prev => {
      const exists = prev.find(w => w.id === lead.id);
      if (exists) return prev.filter(w => w.id !== lead.id);
      return [...prev, { ...lead, _order: prev.length }];
    });
  };

  const mapCenter: [number, number] = [-73.5674, 45.5019];

  return (
    <div className="relative w-full h-full overflow-hidden flex">

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <div className={cn(
        'relative z-20 flex flex-col bg-white border-r border-[#e5e5e0] shrink-0 transition-all duration-300 overflow-hidden',
        showSidebar ? 'w-72' : 'w-0',
      )}>
        <div className="w-72 flex flex-col h-full">

          {/* Tab bar */}
          <div className="flex border-b border-[#e5e5e0] shrink-0">
            {([
              { id: 'leads', icon: Users, label: 'Leads' },
              { id: 'prospection', icon: Search, label: 'Prospection' },
              { id: 'tournee', icon: Route, label: 'Tournée' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[9px] font-bold transition-colors border-b-2',
                  activeTab === tab.id
                    ? 'border-[#059669] text-[#059669] bg-[#059669]/5'
                    : 'border-transparent text-[#7a7a76] hover:text-[#26251e] hover:bg-[#fafaf8]'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === 'leads' && filteredLeads.length > 0 && (
                  <span className={cn('text-[8px] font-black px-1 py-0.5 rounded-full', activeTab === 'leads' ? 'bg-[#059669] text-white' : 'bg-[#e5e5e0] text-[#7a7a76]')}>
                    {filteredLeads.length}
                  </span>
                )}
                {tab.id === 'tournee' && tourWaypoints.length > 0 && (
                  <span className="text-[8px] font-black px-1 py-0.5 rounded-full bg-[#7c3aed] text-white">
                    {tourWaypoints.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Leads ── */}
          {activeTab === 'leads' && (
            <>
              <div className="px-3 py-2 border-b border-[#f0f0ec] shrink-0 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#7a7a76]" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Chercher un lead…"
                    className="w-full h-7 pl-7 pr-2 text-xs bg-[#f7f7f4] border border-[#e5e5e0] rounded-lg outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
                  />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        const next = new Set(statusFilters);
                        if (next.has(s)) next.delete(s); else next.add(s);
                        setStatusFilters(next);
                      }}
                      className={cn('px-1.5 py-0.5 rounded-full text-[8px] font-bold border transition-colors',
                        statusFilters.has(s) ? 'text-white border-transparent' : 'bg-white text-[#7a7a76] border-[#e5e5e0]')}
                      style={statusFilters.has(s) ? { background: STATUS_COLORS[s] } : {}}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {leadsWithDistance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <MapPin className="h-6 w-6 text-[#e5e5e0] mb-2" />
                    <p className="text-xs font-semibold text-[#7a7a76]">Aucun lead</p>
                  </div>
                ) : leadsWithDistance.map(lead => {
                  const isSelected = selectedLead?.id === lead.id;
                  const inTour = tourWaypoints.some(w => w.id === lead.id);
                  return (
                    <div key={lead.id} className={cn('flex items-center border-b border-[#f4f4f3] transition-colors', isSelected ? 'bg-[#059669]/5' : 'hover:bg-[#fafaf8]')}>
                      <button onClick={() => handleLeadClick(lead.id)} className="flex-1 text-left px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5" style={{ background: STATUS_COLORS[lead.status || 'New'] }}>
                            {(lead.businessName || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-semibold leading-tight truncate', isSelected ? 'text-[#059669]' : 'text-[#26251e]')}>{lead.businessName}</p>
                            <span className="text-[9px] text-[#7a7a76] flex items-center gap-0.5 mt-0.5">
                              <Navigation className="h-2.5 w-2.5" />{lead.city}
                              {lead._distance != null && (
                                <span className="ml-1 text-[#059669] font-bold">
                                  {lead._distance < 1 ? `${Math.round(lead._distance * 1000)} m` : `${lead._distance.toFixed(1)} km`}
                                </span>
                              )}
                            </span>
                          </div>
                          {lead.score != null && <span className="text-[9px] font-black text-[#059669] shrink-0">{lead.score}</span>}
                        </div>
                      </button>
                      <button
                        onClick={() => toggleWaypoint(lead)}
                        className={cn('px-2 py-2 shrink-0 transition-colors', inTour ? 'text-[#7c3aed]' : 'text-[#e5e5e0] hover:text-[#7c3aed]')}
                        title={inTour ? 'Retirer de la tournée' : 'Ajouter à la tournée'}
                      >
                        <Route className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Tab: Prospection ── */}
          {activeTab === 'prospection' && (
            <>
              <div className="px-3 py-3 border-b border-[#f0f0ec] shrink-0 space-y-2">
                <input
                  value={prospNiche}
                  onChange={e => setProspNiche(e.target.value)}
                  placeholder="Niche (ex: restaurant, coiffeur…)"
                  className="w-full h-8 px-3 text-xs bg-[#f7f7f4] border border-[#e5e5e0] rounded-lg outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
                />
                <div className="flex gap-2">
                  <input
                    value={prospCity}
                    onChange={e => setProspCity(e.target.value)}
                    placeholder="Ville"
                    className="flex-1 h-8 px-3 text-xs bg-[#f7f7f4] border border-[#e5e5e0] rounded-lg outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e]"
                  />
                  <select
                    value={prospRadius}
                    onChange={e => setProspRadius(+e.target.value)}
                    className="h-8 px-2 text-xs border border-[#e5e5e0] rounded-lg bg-white text-[#26251e] outline-none"
                  >
                    <option value={2000}>2 km</option>
                    <option value={5000}>5 km</option>
                    <option value={10000}>10 km</option>
                    <option value={20000}>20 km</option>
                  </select>
                </div>
                <button
                  onClick={handleProspSearch}
                  disabled={!prospNiche.trim() || prospLoading}
                  className="w-full h-8 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {prospLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  {prospLoading ? 'Recherche en cours…' : 'Lancer la prospection'}
                </button>
                {prospError && <p className="text-[10px] text-red-600 font-semibold">{prospError}</p>}
              </div>
              <div className="flex-1 overflow-y-auto">
                {prospResults.length === 0 && !prospLoading && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Search className="h-6 w-6 text-[#e5e5e0] mb-2" />
                    <p className="text-xs font-semibold text-[#7a7a76]">Entrez une niche et lancez la recherche</p>
                  </div>
                )}
                {prospResults.map(r => {
                  const added = addedIds.has(r.id);
                  return (
                    <div key={r.id} className="px-3 py-2.5 border-b border-[#f4f4f3] hover:bg-[#fafaf8] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#26251e] truncate">{r.businessName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-[#7a7a76]">{r.city}</span>
                            {r.phone && <span className="text-[9px] text-[#7a7a76]">· {r.phone}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex-1 h-1 bg-[#f0f0ec] rounded-full overflow-hidden">
                              <div className="h-full bg-[#059669] rounded-full" style={{ width: `${r.qualityScore}%` }} />
                            </div>
                            <span className="text-[8px] font-bold text-[#059669] shrink-0">{r.qualityScore}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => !added && handleAddProspect(r)}
                          disabled={added}
                          className={cn('shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors',
                            added ? 'bg-[#f0fdf4] text-[#059669]' : 'bg-[#059669] text-white hover:bg-[#047857]')}
                        >
                          {added ? <CheckSquare className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          {added ? 'Ajouté' : 'Inbox'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Tab: Tournée ── */}
          {activeTab === 'tournee' && (
            <>
              <div className="px-3 py-2 border-b border-[#f0f0ec] shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Route className="h-3.5 w-3.5 text-[#7c3aed]" />
                  <span className="text-xs font-bold text-[#26251e]">{tourWaypoints.length} étape{tourWaypoints.length !== 1 ? 's' : ''}</span>
                </div>
                {tourWaypoints.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`https://www.google.com/maps/dir/${tourWaypoints.map(w => `${w._lat},${w._lng}`).join('/')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-[#f0fdf4] text-[#059669] text-[9px] font-bold rounded-lg hover:bg-[#dcfce7] transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Google Maps
                    </a>
                    <button onClick={() => setTourWaypoints([])} className="text-[#ef4444] hover:bg-red-50 p-1 rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {tourWaypoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Route className="h-6 w-6 text-[#e5e5e0] mb-2" />
                    <p className="text-xs font-semibold text-[#7a7a76]">Aucun point d'arrêt</p>
                    <p className="text-[10px] text-[#a3a197] mt-1">Cliquez sur l'icône route dans l'onglet Leads pour ajouter des étapes.</p>
                  </div>
                ) : tourWaypoints.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f4f4f3]">
                    <div className="h-6 w-6 rounded-full bg-[#7c3aed] text-white text-[9px] font-black flex items-center justify-center shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#26251e] truncate">{w.businessName}</p>
                      <span className="text-[9px] text-[#7a7a76]">{w.city}</span>
                    </div>
                    <button onClick={() => toggleWaypoint(w)} className="text-[#e5e5e0] hover:text-[#ef4444] transition-colors p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {tourWaypoints.length >= 2 && (
                <div className="px-3 py-3 border-t border-[#e5e5e0] shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">Ordre de visite</p>
                  <p className="text-[10px] text-[#a3a197]">L'itinéraire OSRM calcule la route routière en temps réel sur la carte.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Map area ──────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <Map center={mapCenter} zoom={11} theme="light" className="w-full h-full">
            <MapControls position="bottom-right" />

            {/* Fly to selected lead */}
            <FlyController target={selectedLead} />

            {/* CRM leads layer — clustered + status colored + heatmap */}
            <CrmLeadsLayer leads={filteredLeads} onLeadClick={handleLeadClick} showHeatmap={showHeatmap} />

            {/* Advanced layers */}
            <ThreeDLayer enabled={show3D} />
            <SatelliteLayer enabled={showSatellite} />

            {/* GPS team tracking */}
            <GpsTrackingLayer workspaceId={activeWorkspace?.id} onPositionUpdate={setMyGpsPosition} />

            {/* Lead popup on map — shows info inline instead of right sidebar */}
            {!showDetailPanel && (
              <LeadMapPopup
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onOpenDetail={() => setShowDetailPanel(true)}
                distanceKm={distanceToSelected}
              />
            )}

            {/* Fly-through for tournée */}
            <FlyThroughLayer waypoints={tourWaypoints} />

            {/* Prospect search results — teal markers */}
            {prospResults.map(r => r.latitude && r.longitude ? (
              <MapMarker key={r.id} longitude={r.longitude} latitude={r.latitude}>
                <MarkerContent>
                  <div
                    className="flex items-center justify-center rounded-full border-2 border-white shadow-md text-white text-[8px] font-black"
                    style={{ width: 24, height: 24, background: addedIds.has(r.id) ? '#059669' : '#0ea5e9' }}
                  >
                    {(r.businessName || '?')[0].toUpperCase()}
                  </div>
                </MarkerContent>
                <MarkerTooltip>{r.businessName}</MarkerTooltip>
              </MapMarker>
            ) : null)}

            {/* Tournée waypoints — numbered purple markers */}
            {tourWaypoints.map((w, i) => (
              <MapMarker key={`wp-${w.id}`} longitude={w._lng} latitude={w._lat}>
                <MarkerContent>
                  <div className="flex items-center justify-center rounded-full border-2 border-white shadow-md text-white text-[9px] font-black"
                    style={{ width: 26, height: 26, background: '#7c3aed' }}>
                    {i + 1}
                  </div>
                </MarkerContent>
                <MarkerTooltip>{w.businessName}</MarkerTooltip>
              </MapMarker>
            ))}

            {/* Route */}
            <RouteLayer waypoints={tourWaypoints} />

            {/* Drawing tool — zone polygon → auto-tournée */}
            <DrawingLayer leads={filteredLeads} onCreateTournee={handleCreateTourneeFromZone} />
          </Map>
        </div>

        {/* Floating topbar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setShowSidebar(v => !v)}
            className={cn('pointer-events-auto flex items-center justify-center h-9 w-9 rounded-xl border shadow-sm backdrop-blur-md transition-colors',
              showSidebar ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white')}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>

          <div className="relative flex-1 max-w-xs pointer-events-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Chercher un lead…"
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-white/90 backdrop-blur-md border border-[#e5e5e0] rounded-xl shadow-sm outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
            />
          </div>

          {/* Heatmap toggle */}
          <button
            onClick={() => setShowHeatmap(v => !v)}
            className={cn('pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
              showHeatmap ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white')}
            title="Heatmap densité"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>

          {/* 3D buildings toggle */}
          <button
            onClick={() => setShow3D(v => !v)}
            className={cn('pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
              show3D ? 'bg-[#26251e] text-white border-[#26251e]' : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white')}
            title="Bâtiments 3D"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">3D</span>
          </button>

          {/* Satellite toggle */}
          <button
            onClick={() => setShowSatellite(v => !v)}
            className={cn('pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
              showSatellite ? 'bg-[#0369a1] text-white border-[#0369a1]' : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white')}
            title="Vue satellite Esri"
          >
            <Satellite className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Satellite</span>
          </button>

          {/* AI spatial query */}
          <button
            onClick={() => setShowAiQueryBar(v => !v)}
            className={cn('pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
              showAiQueryBar ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white')}
            title="Filtrage IA — langage naturel"
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">IA</span>
          </button>

          <div className="pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/90 backdrop-blur-md border border-[#e5e5e0] shadow-sm">
            <Users className="h-3.5 w-3.5 text-[#059669]" />
            <span className="text-xs font-bold text-[#26251e]">{filteredLeads.length}</span>
            <span className="text-xs text-[#7a7a76]">leads</span>
          </div>

          {prospResults.length > 0 && (
            <div className="pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] shadow-sm">
              <Search className="h-3.5 w-3.5 text-[#2563eb]" />
              <span className="text-xs font-bold text-[#1d4ed8]">{prospResults.length}</span>
              <span className="text-xs text-[#3b82f6]">prospects</span>
            </div>
          )}
        </div>

        {/* AI Query bar */}
        {showAiQueryBar && (
          <div className="absolute top-16 left-3 right-3 z-30 pointer-events-auto">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#059669]/30 rounded-2xl shadow-xl px-4 py-2.5">
              <Brain className="h-4 w-4 text-[#059669] shrink-0" />
              <input
                autoFocus
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAiQuery(); if (e.key === 'Escape') { setShowAiQueryBar(false); setAiQuery(''); } }}
                placeholder="Ex: prospects non contactés depuis 30 jours à Montréal…"
                className="flex-1 text-sm text-[#26251e] placeholder:text-[#7a7a76] bg-transparent outline-none"
              />
              {aiQueryLoading ? (
                <Loader2 className="h-4 w-4 text-[#059669] animate-spin shrink-0" />
              ) : (
                <button
                  onClick={handleAiQuery}
                  disabled={!aiQuery.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  Filtrer
                </button>
              )}
            </div>
            <p className="text-[9px] text-[#7a7a76] mt-1 ml-4">Langage naturel → filtres automatiques · Entrée pour confirmer · Échap pour annuler</p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-12 left-3 z-20 bg-white/90 backdrop-blur-md rounded-xl border border-[#e5e5e0] shadow p-2 space-y-1">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: STATUS_COLORS[key] }} />
              <span className="text-[9px] font-semibold text-[#555552]">{label}</span>
            </div>
          ))}
          {prospResults.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-[#f0f0ec] mt-1">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm bg-[#3b82f6]" />
              <span className="text-[9px] text-[#2563eb] font-semibold">Prospect OSM</span>
            </div>
          )}
          {tourWaypoints.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border border-white shadow-sm bg-[#7c3aed]" />
              <span className="text-[9px] text-[#7c3aed] font-semibold">Tournée</span>
            </div>
          )}
        </div>

        {/* Lead detail panel — opens when user clicks "Voir détails" in popup */}
        {selectedLead && showDetailPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-30 flex flex-col border-l border-[#e5e5e0]">
            <div className="p-4 border-b border-[#f0f0ec]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#26251e] leading-tight truncate">{selectedLead.businessName}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3 w-3 text-[#7a7a76] shrink-0" />
                    <span className="text-[10px] text-[#7a7a76] truncate">{selectedLead.city}{selectedLead.niche && ` · ${selectedLead.niche}`}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedLead(null); setShowDetailPanel(false); }} className="w-7 h-7 rounded-full hover:bg-[#f4f4f3] flex items-center justify-center ml-2 shrink-0">
                  <X className="h-3.5 w-3.5 text-[#7a7a76]" />
                </button>
              </div>
              {selectedLead.score != null && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex-1 h-1.5 bg-[#f0f0ec] rounded-full overflow-hidden">
                    <div className="h-full bg-[#059669] rounded-full" style={{ width: `${selectedLead.score}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-[#26251e]">{selectedLead.score}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Quick status */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">Statut</p>
                <select
                  value={quickStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  className="w-full h-8 border border-[#e5e5e0] rounded-lg px-2 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                  style={{ color: STATUS_COLORS[quickStatus] || '#26251e' }}
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s} style={{ color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Quick task */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">Créer une tâche</p>
                <div className="flex gap-2">
                  <input
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Titre de la tâche…"
                    onKeyDown={e => e.key === 'Enter' && handleCreateTask()}
                    className="flex-1 h-8 px-2.5 text-xs border border-[#e5e5e0] rounded-lg outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#a3a197]"
                  />
                  <button
                    onClick={handleCreateTask}
                    disabled={!taskTitle.trim() || creatingTask}
                    className="h-8 w-8 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white rounded-lg flex items-center justify-center"
                  >
                    {creatingTask ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Coordonnées */}
              {selectedLead.contactEmail && (
                <div className="flex items-center gap-2 p-2.5 bg-[#fafaf8] rounded-xl border border-[#f0f0ec]">
                  <Mail className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                  <span className="text-xs text-[#26251e] truncate">{selectedLead.contactEmail}</span>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex items-center gap-2 p-2.5 bg-[#fafaf8] rounded-xl border border-[#f0f0ec]">
                  <span className="text-[10px] text-[#7a7a76]">📞</span>
                  <span className="text-xs text-[#26251e]">{selectedLead.phone}</span>
                </div>
              )}

              {showDraftArea && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Brouillon IA</p>
                  {generatingDraft ? (
                    <div className="flex items-center gap-2 p-3 bg-[#fafaf8] rounded-xl">
                      <Loader2 className="h-4 w-4 animate-spin text-[#059669]" />
                      <span className="text-xs text-[#7a7a76]">Génération…</span>
                    </div>
                  ) : (
                    <textarea
                      value={draftContent}
                      onChange={e => setDraftContent(e.target.value)}
                      rows={5}
                      className="w-full border border-[#e5e5e0] rounded-xl p-3 text-[10px] text-[#26251e] leading-relaxed resize-none outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#f0f0ec] space-y-2">
              {/* Google Maps */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selectedLead.businessName || '') + ' ' + (selectedLead.city || ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#26251e] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#7a7a76]" />
                Ouvrir dans Google Maps
              </a>
              <button
                onClick={handleGenerateDraft}
                disabled={generatingDraft}
                className="w-full h-9 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {generatingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Générer un email
              </button>
              <Link
                href={`/leads/${selectedLead.id}`}
                className="w-full h-9 bg-[#f4f4f3] hover:bg-[#e5e5e0] text-[#26251e] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                Fiche complète <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapRoot;
