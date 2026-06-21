'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { getApiUrl } from '@/lib/api-helper';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  useMap,
} from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Search,
  MapPin,
  ChevronDown,
  ChevronRight,
  Route,
  X,
  Navigation,
  Clock,
  RotateCcw,
  Loader2,
  Footprints,
} from 'lucide-react';
import Link from 'next/link';

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

function getMarkerColor(lead: Lead): string {
  if (!lead.website) return '#7a7a76';
  switch (lead.temperature) {
    case 'Hot': return '#ef4444';
    case 'Warm': return '#f59e0b';
    case 'Cold': return '#3b82f6';
    default: return '#7a7a76';
  }
}

function getTemperatureLabel(temp: Lead['temperature']): string {
  switch (temp) {
    case 'Hot': return 'Chaud';
    case 'Warm': return 'Tiède';
    case 'Cold': return 'Froid';
    default: return temp;
  }
}

interface LeadWithCoords extends Lead {
  _lat: number;
  _lng: number;
}

function applyJitter(val: number): number {
  return val + (Math.random() - 0.5) * 0.03;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type TemperatureFilter = 'All' | 'Hot' | 'Warm' | 'Cold';

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  geometry: GeoJSON.LineString;
  legs?: { duration: number; distance: number }[];
  waypoints?: LeadWithCoords[];
}

// Optimization algorithm for Variante Géographique (Nearest Neighbor TSP)
const optimizeGeographical = (start: [number, number], stops: LeadWithCoords[]): LeadWithCoords[] => {
  const unvisited = [...stops];
  const ordered: LeadWithCoords[] = [];
  let currentLat = start[0];
  let currentLng = start[1];
  
  while (unvisited.length > 0) {
    let closestIdx = 0;
    let minDistance = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineKm(currentLat, currentLng, unvisited[i]._lat, unvisited[i]._lng);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = i;
      }
    }
    const nextStop = unvisited.splice(closestIdx, 1)[0];
    ordered.push(nextStop);
    currentLat = nextStop._lat;
    currentLng = nextStop._lng;
  }
  return ordered;
};

// Optimization algorithm for Variante Commerciale (Hot -> Warm -> Cold with local NN TSP)
const optimizeCommercial = (start: [number, number], stops: LeadWithCoords[]): LeadWithCoords[] => {
  const hot = stops.filter(s => s.temperature === 'Hot');
  const warm = stops.filter(s => s.temperature === 'Warm');
  const cold = stops.filter(s => s.temperature === 'Cold' || !s.temperature);
  
  const ordered: LeadWithCoords[] = [];
  let currentLat = start[0];
  let currentLng = start[1];
  
  const addNearest = (list: LeadWithCoords[]) => {
    const unvisited = [...list];
    while (unvisited.length > 0) {
      let closestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = haversineKm(currentLat, currentLng, unvisited[i]._lat, unvisited[i]._lng);
        if (d < minDistance) {
          minDistance = d;
          closestIdx = i;
        }
      }
      const nextStop = unvisited.splice(closestIdx, 1)[0];
      ordered.push(nextStop);
      currentLat = nextStop._lat;
      currentLng = nextStop._lng;
    }
  };
  
  addNearest(hot);
  addNearest(warm);
  addNearest(cold);
  
  return ordered;
};

// Inner component that renders multi-stop routes on MapLibre
function RouteLayer({
  activeRoute,
  commercialRoute,
  shortestRoute,
  customRoute,
  onSelectVariant,
}: {
  activeRoute: RouteInfo | null;
  commercialRoute: RouteInfo | null;
  shortestRoute: RouteInfo | null;
  customRoute: RouteInfo | null;
  onSelectVariant: (v: 'commercial' | 'shortest' | 'custom') => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const ids = ['active-route', 'comm-route', 'short-route', 'cust-route'];
    
    const cleanup = () => {
      ids.forEach(id => {
        if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
        if (map.getSource(id)) map.removeSource(id);
      });
    };

    cleanup();

    const addRouteSourceAndLayer = (id: string, geometry: any, color: string, width: number, opacity: number) => {
      map.addSource(id, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: geometry,
        },
      });

      map.addLayer({
        id: `${id}-line`,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
        },
      });
    };

    // 1. Draw alternative routes in semi-transparent gray
    if (commercialRoute && activeRoute !== commercialRoute) {
      addRouteSourceAndLayer('comm-route', commercialRoute.geometry, '#9ca3af', 3, 0.45);
    }
    if (shortestRoute && activeRoute !== shortestRoute) {
      addRouteSourceAndLayer('short-route', shortestRoute.geometry, '#9ca3af', 3, 0.45);
    }
    if (customRoute && activeRoute !== customRoute) {
      addRouteSourceAndLayer('cust-route', customRoute.geometry, '#9ca3af', 3, 0.45);
    }

    // 2. Draw active route in emerald green on top
    if (activeRoute) {
      addRouteSourceAndLayer('active-route', activeRoute.geometry, '#059669', 5, 0.9);
    }

    // Click handlers to select route variant from the map directly
    const handleCommClick = () => onSelectVariant('commercial');
    const handleShortClick = () => onSelectVariant('shortest');
    const handleCustClick = () => onSelectVariant('custom');

    if (map.getLayer('comm-route-line')) map.on('click', 'comm-route-line', handleCommClick);
    if (map.getLayer('short-route-line')) map.on('click', 'short-route-line', handleShortClick);
    if (map.getLayer('cust-route-line')) map.on('click', 'cust-route-line', handleCustClick);

    return () => {
      if (map.getLayer('comm-route-line')) map.off('click', 'comm-route-line', handleCommClick);
      if (map.getLayer('short-route-line')) map.off('click', 'short-route-line', handleShortClick);
      if (map.getLayer('cust-route-line')) map.off('click', 'cust-route-line', handleCustClick);
      cleanup();
    };
  }, [map, isLoaded, activeRoute, commercialRoute, shortestRoute, customRoute, onSelectVariant]);

  return null;
}

export function MapRoot() {
  const router = useRouter();
  const { leads, activeWorkspace } = useReach();
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [collapsedCities, setCollapsedCities] = useState<Record<string, boolean>>({});
  const leadItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Geolocation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const mapRef = useRef<any>(null);
  const geoWatchRef = useRef<number | null>(null);

  // Route planning state
  const [routeMode, setRouteMode] = useState(false);
  const [waypoints, setWaypoints] = useState<LeadWithCoords[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [terrainSaving, setTerrainSaving] = useState(false);

  // New Route Planning configuration
  const [departureType, setDepartureType] = useState<'gps' | 'first_lead'>('gps');
  const [arrivalType, setArrivalType] = useState<'loop' | 'last_lead'>('loop');
  const [departureTime, setDepartureTime] = useState('09:00');
  const [visitDuration, setVisitDuration] = useState(20); // in minutes
  const [selectedVariant, setSelectedVariant] = useState<'commercial' | 'shortest' | 'custom'>('commercial');

  // Variant routes
  const [commercialRoute, setCommercialRoute] = useState<RouteInfo | null>(null);
  const [shortestRoute, setShortestRoute] = useState<RouteInfo | null>(null);
  const [customRoute, setCustomRoute] = useState<RouteInfo | null>(null);

  // Drag and drop state for manual reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const leadsWithCoords = useMemo<LeadWithCoords[]>(() => {
    return leads.map((lead) => {
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
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leadsWithCoords.filter((lead) => {
      const matchesTemp = temperatureFilter === 'All' || lead.temperature === temperatureFilter;
      const matchesSearch =
        !searchQuery ||
        lead.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.city.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTemp && matchesSearch;
    });
  }, [leadsWithCoords, temperatureFilter, searchQuery]);

  const leadsByCity = useMemo(() => {
    const map: Record<string, LeadWithCoords[]> = {};
    filteredLeads.forEach((l) => {
      const city = l.city || 'Inconnue';
      if (!map[city]) map[city] = [];
      map[city].push(l);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [filteredLeads]);

  const toggleCity = (city: string) => {
    setCollapsedCities((prev) => ({ ...prev, [city]: !prev[city] }));
  };

  useEffect(() => {
    if (selectedLeadId && leadItemRefs.current[selectedLeadId]) {
      leadItemRefs.current[selectedLeadId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedLeadId]);

  // Compute start coordinates
  const startCoords = useMemo<[number, number]>(() => {
    if (departureType === 'gps' && userLocation) {
      return userLocation;
    }
    if (waypoints.length > 0) {
      return [waypoints[0]._lat, waypoints[0]._lng];
    }
    return DEFAULT_COORDS;
  }, [departureType, userLocation, waypoints]);

  // Badge "Le plus rapide" sur la variante la moins longue
  const fastestVariant = useMemo<'commercial' | 'shortest' | 'custom' | null>(() => {
    const candidates: { id: 'commercial' | 'shortest' | 'custom'; dur: number }[] = [];
    if (commercialRoute) candidates.push({ id: 'commercial', dur: commercialRoute.durationMin });
    if (shortestRoute) candidates.push({ id: 'shortest', dur: shortestRoute.durationMin });
    if (customRoute) candidates.push({ id: 'custom', dur: customRoute.durationMin });
    if (candidates.length < 2) return null;
    return candidates.reduce((a, b) => (a.dur <= b.dur ? a : b)).id;
  }, [commercialRoute, shortestRoute, customRoute]);

  // Toggle waypoint in route mode
  const toggleWaypoint = useCallback((lead: LeadWithCoords) => {
    setWaypoints((prev) => {
      const exists = prev.find((w) => w.id === lead.id);
      if (exists) return prev.filter((w) => w.id !== lead.id);
      return [...prev, lead];
    });
    setRouteInfo(null);
    setCommercialRoute(null);
    setShortestRoute(null);
    setCustomRoute(null);
    setRouteError(null);
  }, []);

  // Fetch OSRM routes for all 3 variants
  const fetchRoute = useCallback(async () => {
    if (waypoints.length < 1) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const start = startCoords;

      // 1. Commercial optimization (Grouped Hot -> Warm -> Cold + Nearest Neighbor)
      const commercialWaypoints = optimizeCommercial(start, waypoints);
      // 2. Shortest route optimization (Geographical TSP)
      const shortestWaypoints = optimizeGeographical(start, waypoints);
      // 3. Custom order variant (exactly as arranged by user)
      const customWaypoints = [...waypoints];

      const fetchSingleRoute = async (orderedStops: LeadWithCoords[]): Promise<RouteInfo> => {
        const seqCoords: string[] = [];

        // Add departure point
        if (departureType === 'gps' && userLocation) {
          seqCoords.push(`${userLocation[1]},${userLocation[0]}`);
        }

        // Add stops
        orderedStops.forEach((w) => {
          // If first lead matches start point and GPS is not used, don't duplicate
          if (departureType === 'first_lead' && seqCoords.length === 0) {
            seqCoords.push(`${w._lng},${w._lat}`);
          } else {
            seqCoords.push(`${w._lng},${w._lat}`);
          }
        });

        // Add loop return coordinates
        if (arrivalType === 'loop') {
          if (departureType === 'gps' && userLocation) {
            seqCoords.push(`${userLocation[1]},${userLocation[0]}`);
          } else if (orderedStops.length > 0) {
            seqCoords.push(`${orderedStops[0]._lng},${orderedStops[0]._lat}`);
          }
        }

        if (seqCoords.length < 2) {
          throw new Error('Pas assez d\'étapes pour calculer l\'itinéraire.');
        }

        const coords = seqCoords.join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erreur OSRM HTTP ${res.status}`);
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Aucun itinéraire trouvé.');
        const route = data.routes[0];

        return {
          distanceKm: Math.round(route.distance / 100) / 10,
          durationMin: Math.round(route.duration / 60),
          geometry: route.geometry,
          legs: route.legs?.map((l: any) => ({ duration: l.duration, distance: l.distance })),
          waypoints: orderedStops,
        };
      };

      const [commRes, shortRes, custRes] = await Promise.allSettled([
        fetchSingleRoute(commercialWaypoints),
        fetchSingleRoute(shortestWaypoints),
        fetchSingleRoute(customWaypoints),
      ]);

      if (commRes.status === 'fulfilled') setCommercialRoute(commRes.value);
      if (shortRes.status === 'fulfilled') setShortestRoute(shortRes.value);
      if (custRes.status === 'fulfilled') setCustomRoute(custRes.value);

      if (commRes.status === 'rejected' && shortRes.status === 'rejected' && custRes.status === 'rejected') {
        const errorMsg = [commRes, shortRes, custRes]
          .filter((r) => r.status === 'rejected')
          .map((r: any) => r.reason?.message || 'Erreur inconnue')
          .join(' / ');
        throw new Error(`Échec du calcul : ${errorMsg}`);
      }
    } catch (err: any) {
      setRouteError(err?.message || 'Erreur OSRM');
    } finally {
      setRouteLoading(false);
    }
  }, [waypoints, startCoords, departureType, arrivalType, userLocation]);

  // Handle Drag & Drop reordering of waypoints
  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...waypoints];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    setWaypoints(reordered);
    setDraggedIndex(null);
    // Clear computed routes to force recalculation
    setRouteInfo(null);
    setCommercialRoute(null);
    setShortestRoute(null);
    setCustomRoute(null);
  };

  const activeRouteInfo = useMemo(() => {
    if (selectedVariant === 'commercial') return commercialRoute;
    if (selectedVariant === 'shortest') return shortestRoute;
    return customRoute;
  }, [selectedVariant, commercialRoute, shortestRoute, customRoute]);

  // Sync routeInfo state with active route
  useEffect(() => {
    setRouteInfo(activeRouteInfo);
  }, [activeRouteInfo]);

  const clearRoute = () => {
    setWaypoints([]);
    setRouteInfo(null);
    setCommercialRoute(null);
    setShortestRoute(null);
    setCustomRoute(null);
    setRouteError(null);
  };

  const exitRouteMode = () => {
    setRouteMode(false);
    clearRoute();
  };

  // Save route plan + launch field mode
  const handleLaunchTerrain = useCallback(async () => {
    const activeRoute = selectedVariant === 'commercial' ? commercialRoute : selectedVariant === 'shortest' ? shortestRoute : customRoute;
    if (!activeRoute || !activeRoute.waypoints || activeRoute.waypoints.length === 0) return;
    
    setTerrainSaving(true);
    try {
      const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electron;
      let planId: string;
      const plannedWaypoints = activeRoute.waypoints;

      if (isElectron) {
        const electron = (window as unknown as Record<string, unknown>).electron as {
          dbRun: (sql: string, params: unknown[]) => Promise<void>;
          triggerSync: () => void;
        };
        planId = crypto.randomUUID();
        const now = new Date().toISOString();
        await electron.dbRun(
          `INSERT INTO route_plans (id, workspace_id, user_id, campaign_id, lead_ids, distance_km, duration_min, status, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, 'pending_insert')`,
          [planId, activeWorkspace?.id ?? '', '', null, JSON.stringify(plannedWaypoints.map((w) => w.id)), activeRoute.distanceKm, activeRoute.durationMin, now, now]
        );
        electron.triggerSync();
      } else {
        const res = await fetch(getApiUrl('/api/route-plans'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: activeWorkspace?.id,
            lead_ids: plannedWaypoints.map((w) => w.id),
            distance_km: activeRoute.distanceKm,
            duration_min: activeRoute.durationMin,
          }),
        });
        const data = await res.json();
        planId = data.id;
      }

      router.push(`/field?plan=${planId}`);
    } catch (err) {
      console.error('[handleLaunchTerrain]', err);
    } finally {
      setTerrainSaving(false);
    }
  }, [selectedVariant, commercialRoute, shortestRoute, customRoute, activeWorkspace, router]);

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation?.clearWatch(geoWatchRef.current);
      }
    };
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;

    // Toggle off: stop live tracking
    if (geoWatchRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
      setLiveTracking(false);
      setUserLocation(null);
      return;
    }

    setGeoLoading(true);

    // One-shot initial position (fast feedback + map fly-to)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setGeoLoading(false);
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13, speed: 1.2, essential: true });
        }
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Continuous live tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLiveTracking(true);
        setGeoLoading(false);
      },
      (err) => {
        console.error('[GPS watchPosition]', err);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true }
    );
    geoWatchRef.current = watchId;
    setLiveTracking(true);
  }, []);

  const temperatureOptions: { value: TemperatureFilter; label: string }[] = [
    { value: 'All', label: 'Tous' },
    { value: 'Hot', label: 'Chauds' },
    { value: 'Warm', label: 'Tièdes' },
    { value: 'Cold', label: 'Froids' },
  ];

  // Helper function to calculate stop ETAs based OSRM legs duration
  const stopsWithEtas = useMemo(() => {
    const stops = activeRouteInfo?.waypoints || waypoints;
    const legs = activeRouteInfo?.legs;
    if (!legs || legs.length === 0 || stops.length === 0) {
      return stops.map(s => ({ ...s, eta: '--:--' }));
    }

    const [startHours, startMinutes] = departureTime.split(':').map(Number);
    let currentMinutes = startHours * 60 + startMinutes;
    
    return stops.map((stop, i) => {
      // Travel duration of the leg leading to this stop (leg index matches stop index)
      const legDurationSec = legs[i]?.duration || 0;
      const travelMin = Math.round(legDurationSec / 60);
      
      currentMinutes += travelMin;
      const hours = Math.floor(currentMinutes / 60) % 24;
      const mins = currentMinutes % 60;
      const etaStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      
      // Add visit duration spent on site
      currentMinutes += visitDuration;
      
      return { ...stop, eta: etaStr };
    });
  }, [activeRouteInfo, waypoints, departureTime, visitDuration]);

  // Summary Metrics calculations
  const totalTravelMin = activeRouteInfo?.durationMin ?? 0;
  const totalTimeMin = totalTravelMin + (waypoints.length * visitDuration);
  const etaFinStr = useMemo(() => {
    const [h, m] = departureTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m + totalTimeMin);
    return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
  }, [departureTime, totalTimeMin]);

  const potentialRevenue = useMemo(() => {
    return waypoints.reduce((sum, w) => sum + (w.dealAmount || 1000), 0);
  }, [waypoints]);

  const priorityRate = useMemo(() => {
    if (waypoints.length === 0) return 0;
    const highPriority = waypoints.filter(w => w.temperature === 'Hot' || w.temperature === 'Warm').length;
    return Math.round((highPriority / waypoints.length) * 100);
  }, [waypoints]);

  const activeWaypointsList = activeRouteInfo?.waypoints || waypoints;

  return (
    <div className="flex h-full w-full overflow-hidden absolute inset-0 text-foreground">
      {routeMode ? (
        <>
          {/* === PANEL LEFT: Route steps and configuration === */}
          <div className="w-[320px] flex flex-col border-r border-[#e5e5e0] bg-[#fafaf8] shrink-0 overflow-hidden">
            <div className="p-4 border-b border-[#e5e5e0] shrink-0 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#26251e] flex items-center gap-1.5">
                  <Route className="h-4 w-4 text-[#059669]" />
                  Planificateur de route
                </h2>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[10px] font-bold gap-1 px-2"
                  onClick={exitRouteMode}
                >
                  <X className="h-3.5 w-3.5" />
                  Quitter
                </Button>
              </div>

              {/* Start & End Settings */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-[#7a7a76]">Départ</span>
                  <select
                    value={departureType}
                    onChange={(e) => {
                      setDepartureType(e.target.value as any);
                      clearRoute();
                    }}
                    className="w-full bg-white border border-[#e5e5e0] rounded px-1.5 py-1 text-[11px] focus:outline-none"
                  >
                    <option value="gps">📍 Ma Position GPS</option>
                    <option value="first_lead">🎯 Premier Lead</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-[#7a7a76]">Arrivée</span>
                  <select
                    value={arrivalType}
                    onChange={(e) => {
                      setArrivalType(e.target.value as any);
                      clearRoute();
                    }}
                    className="w-full bg-white border border-[#e5e5e0] rounded px-1.5 py-1 text-[11px] focus:outline-none"
                  >
                    <option value="loop">🔄 Retour / Boucle</option>
                    <option value="last_lead">🏁 Dernier Lead</option>
                  </select>
                </div>
              </div>

              {/* Temporal Parameters Settings */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-[#7a7a76]">Heure de départ</span>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full bg-white border border-[#e5e5e0] rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-[#7a7a76]">Visite (minutes)</span>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    step={5}
                    value={visitDuration}
                    onChange={(e) => setVisitDuration(parseInt(e.target.value) || 20)}
                    className="w-full bg-white border border-[#e5e5e0] rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
                  />
                </div>
              </div>

              {/* Waypoint controls */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={fetchRoute}
                  disabled={waypoints.length < (departureType === 'gps' ? 1 : 2) || routeLoading}
                  className="flex-1 h-8 text-[11px] font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1"
                >
                  {routeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                  Calculer l'itinéraire
                </Button>
                {waypoints.length > 0 && (
                  <Button size="sm" variant="outline" onClick={clearRoute} className="h-8 px-2 border-[#e5e5e0]">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {routeError && (
                <p className="text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">{routeError}</p>
              )}
            </div>

            {/* List of stops with drag and drop order and ETA labels */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block mb-1">
                {waypoints.length} étape{waypoints.length !== 1 ? 's' : ''} dans la tournée
              </span>
              
              {activeWaypointsList.length === 0 ? (
                <p className="text-[11px] text-[#7a7a76] italic p-3 text-center border border-dashed border-[#e5e5e0] rounded-xl bg-white">
                  Sélectionnez des leads dans la liste ci-dessous ou cliquez sur la carte.
                </p>
              ) : (
                stopsWithEtas.map((w, index) => {
                  const color = getMarkerColor(w);
                  const isWaypoint = waypoints.some(x => x.id === w.id);
                  const itemIndex = activeWaypointsList.findIndex(x => x.id === w.id);
                  const isDragged = draggedIndex === itemIndex;

                  return (
                    <div
                      key={w.id}
                      draggable={selectedVariant === 'custom'}
                      onDragStart={() => selectedVariant === 'custom' && setDraggedIndex(itemIndex)}
                      onDragOver={(e) => selectedVariant === 'custom' && e.preventDefault()}
                      onDrop={() => selectedVariant === 'custom' && handleDrop(itemIndex)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 bg-white border border-[#e5e5e0] rounded-xl text-xs transition-all shadow-sm',
                        selectedVariant === 'custom' && 'cursor-grab active:cursor-grabbing',
                        isDragged && 'opacity-35 border-dashed border-primary',
                        selectedVariant === 'custom' && 'hover:border-primary/50'
                      )}
                    >
                      <span className="h-5 w-5 rounded-full bg-[#059669] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[#26251e] block truncate leading-tight">{w.businessName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-[#7a7a76] truncate max-w-[120px]">{w.niche}</span>
                          <span className="text-[9px] text-[#7a7a76] font-bold">·</span>
                          <span className="text-[9px] text-blue-500 font-extrabold">{getTemperatureLabel(w.temperature)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-[#059669] block font-mono">{w.eta}</span>
                        <span className="text-[8px] text-[#7a7a76] block uppercase tracking-wider">ETA</span>
                      </div>
                      {selectedVariant === 'custom' && (
                        <div className="flex flex-col gap-0.5 text-[#7a7a76] shrink-0 pl-1">
                          <div className="w-2.5 h-0.5 bg-[#e5e5e0] rounded" />
                          <div className="w-2.5 h-0.5 bg-[#e5e5e0] rounded" />
                          <div className="w-2.5 h-0.5 bg-[#e5e5e0] rounded" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* === PANEL CENTER: Interactive Map === */}
          <div className="flex-1 relative min-h-0">
            <Map
              ref={mapRef}
              center={userLocation ? [userLocation[1], userLocation[0]] : [-73.5674, 45.5019]}
              zoom={userLocation ? 13 : 12}
              className="absolute inset-0 w-full h-full"
            >
              <MapControls position="bottom-right" showZoom />
              <RouteLayer
                activeRoute={routeInfo}
                commercialRoute={commercialRoute}
                shortestRoute={shortestRoute}
                customRoute={customRoute}
                onSelectVariant={setSelectedVariant}
              />

              {filteredLeads.map((lead) => {
                const color = getMarkerColor(lead);
                const isSelected = selectedLeadId === lead.id;
                
                // Index is computed from the active route order
                const waypointIdx = activeWaypointsList.findIndex((w) => w.id === lead.id);
                const isWaypoint = waypointIdx !== -1;

                return (
                  <MapMarker key={lead.id} longitude={lead._lng} latitude={lead._lat}>
                    <MarkerContent>
                      <div
                        className={cn(
                          'rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-125',
                          isSelected || isWaypoint ? 'h-6 w-6 scale-125' : 'h-4 w-4'
                        )}
                        style={{ backgroundColor: isWaypoint ? '#059669' : color }}
                        title={lead.businessName}
                        onClick={() => toggleWaypoint(lead)}
                      >
                        {isWaypoint && (
                          <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">
                            {waypointIdx + 1}
                          </span>
                        )}
                      </div>
                    </MarkerContent>
                  </MapMarker>
                );
              })}

              {userLocation && (
                <MapMarker longitude={userLocation[1]} latitude={userLocation[0]}>
                  <MarkerContent>
                    <div
                      className="h-5 w-5 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center cursor-default"
                      title="Votre position"
                    >
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </MarkerContent>
                </MapMarker>
              )}
            </Map>
          </div>

          {/* === PANEL RIGHT: Commercial summary & Actions === */}
          <div className="w-[280px] flex flex-col border-l border-[#e5e5e0] bg-[#fafaf8] shrink-0 overflow-hidden">
            <div className="p-4 border-b border-[#e5e5e0]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block mb-2">Variantes d'itinéraires</span>
              <div className="space-y-2">
                {[
                  { id: 'commercial', title: '⭐ Optimisation Commerciale', desc: 'Priorité leads chauds (Hot d\'abord) puis regroupement par proximité.', value: commercialRoute },
                  { id: 'shortest', title: '🏁 Itinéraire le plus court', desc: 'Optimisation TSP géographique pure (plus court trajet).', value: shortestRoute },
                  { id: 'custom', title: '✏️ Ordre personnalisé', desc: 'Routage exact suivant l\'ordre défini manuellement (Drag & Drop).', value: customRoute },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedVariant(item.id as any)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl border text-xs transition-all bg-white',
                      selectedVariant === item.id
                        ? 'border-[#059669] ring-2 ring-[#059669]/10 shadow-sm'
                        : 'border-[#e5e5e0] hover:border-[#26251e]/20'
                    )}
                  >
                    <div className="font-bold text-[#26251e] leading-snug">{item.title}</div>
                    <p className="text-[9px] text-[#7a7a76] mt-0.5 leading-normal">{item.desc}</p>
                    {item.value ? (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#059669] font-mono">
                          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{item.value.durationMin} min</span>
                          <span className="flex items-center gap-1"><Route className="h-2.5 w-2.5" />{item.value.distanceKm} km</span>
                        </div>
                        {fastestVariant === item.id && (
                          <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                            Le plus rapide
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1.5 text-[9px] text-muted-foreground italic">Non calculé</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume and KPI metrics */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block">Résumé de la tournée</span>
              
              {activeRouteInfo ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white border border-[#e5e5e0] rounded-xl p-2.5">
                      <span className="text-[8px] text-[#7a7a76] font-bold uppercase tracking-wider block">Distance</span>
                      <span className="text-sm font-black font-mono text-foreground block mt-0.5">{activeRouteInfo.distanceKm} km</span>
                    </div>
                    <div className="bg-white border border-[#e5e5e0] rounded-xl p-2.5">
                      <span className="text-[8px] text-[#7a7a76] font-bold uppercase tracking-wider block">Temps Route</span>
                      <span className="text-sm font-black font-mono text-foreground block mt-0.5">~{activeRouteInfo.durationMin} min</span>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e5e5e0] rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#7a7a76] font-medium">Fin de tournée</span>
                      <span className="font-bold text-[#26251e] font-mono">{etaFinStr}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#7a7a76] font-medium">Temps Total (Terrain)</span>
                      <span className="font-bold text-[#26251e] font-mono">
                        {totalTimeMin < 60 ? `${totalTimeMin} min` : `${Math.floor(totalTimeMin / 60)}h${(totalTimeMin % 60).toString().padStart(2, '0')}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-[#e5e5e0] pt-2">
                      <span className="text-[#7a7a76] font-medium">CA Potentiel</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(potentialRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#7a7a76] font-medium">Taux Priorité</span>
                      <span className="font-bold text-blue-500 font-mono">{priorityRate}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed border-[#e5e5e0] bg-white rounded-xl text-xs text-muted-foreground italic">
                  Calculez un itinéraire pour afficher le résumé.
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="p-3 border-t border-[#e5e5e0] bg-white space-y-2">
              <Button
                size="sm"
                onClick={handleLaunchTerrain}
                disabled={!activeRouteInfo || terrainSaving}
                className="w-full h-9 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1.5 shadow-sm"
              >
                {terrainSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Footprints className="h-3.5 w-3.5" />}
                Démarrer sur le terrain →
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* === PREVIOUS NORMAL MAP SIDEBAR === */}
          <div className="w-[300px] flex flex-col border-r border-[#e5e5e0] bg-[#fafaf8] shrink-0 overflow-hidden">
            <div className="p-4 border-b border-[#e5e5e0] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-[#26251e]">
                  Carte des leads
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] font-bold gap-1 px-2 border-[#059669] text-[#059669] hover:bg-[#059669]/10"
                  onClick={() => setRouteMode(true)}
                >
                  <Route className="h-3 w-3" /> Itinéraire
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'h-7 text-[10px] font-bold gap-1 px-2 w-full mb-3',
                  userLocation
                    ? 'border-blue-400 text-blue-600 hover:bg-blue-50'
                    : 'border-[#e5e5e0] text-[#7a7a76] hover:border-[#26251e]/30'
                )}
                onClick={requestGeolocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                {liveTracking ? '● GPS actif — Arrêter le suivi' : userLocation ? 'Position localisée — Réactiver GPS' : 'Afficher ma position + distances'}
              </Button>

              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {temperatureOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTemperatureFilter(opt.value)}
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all',
                      temperatureFilter === opt.value
                        ? 'bg-[#26251e] text-white border-[#26251e]'
                        : 'bg-white text-[#7a7a76] border-[#e5e5e0] hover:border-[#26251e]/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="p-3 border-b border-[#e5e5e0] bg-white shrink-0">
              <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} affichés
              </p>
            </div>

            {/* Lead list grouped by city */}
            <div className="flex-1 overflow-y-auto p-2">
              {leadsByCity.length === 0 ? (
                <p className="text-[11px] text-[#7a7a76] italic p-3">Aucun résultat</p>
              ) : (
                leadsByCity.map(([city, cityLeads]) => {
                  const isCityCollapsed = collapsedCities[city] ?? false;
                  return (
                    <div key={city} className="mb-1">
                      <button
                        onClick={() => toggleCity(city)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider hover:text-[#26251e] transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] font-bold h-4 px-1.5 border-[#e5e5e0] text-[#7a7a76]">
                            {cityLeads.length}
                          </Badge>
                          {isCityCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </span>
                      </button>

                      {!isCityCollapsed && (
                        <div className="space-y-0.5">
                          {cityLeads.map((lead) => {
                            const color = getMarkerColor(lead);
                            const isSelected = selectedLeadId === lead.id;

                            return (
                              <div
                                key={lead.id}
                                ref={(el) => { leadItemRefs.current[lead.id] = el; }}
                                onClick={() => setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id)}
                                className={cn(
                                  'flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-all text-left border border-transparent',
                                  isSelected ? 'bg-[#059669]/10 border-[#059669]/20' : 'hover:bg-[#e5e5e0]/40'
                                )}
                              >
                                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[#26251e] truncate">{lead.businessName}</p>
                                  {lead.niche && <p className="text-[9px] text-[#7a7a76] truncate">{lead.niche}</p>}
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    <span className="text-[9px] font-semibold text-[#7a7a76]">{getTemperatureLabel(lead.temperature)}</span>
                                    <span className="text-[9px] text-[#7a7a76]">·</span>
                                    <span
                                      className="text-[9px] font-bold px-1 py-0.5 rounded border"
                                      style={{
                                        color: lead.status === 'Won' ? '#059669' : lead.status === 'New' ? '#3b82f6' : '#7a7a76',
                                        borderColor: lead.status === 'Won' ? '#05966940' : lead.status === 'New' ? '#3b82f640' : '#e5e5e0',
                                        backgroundColor: lead.status === 'Won' ? '#05966910' : lead.status === 'New' ? '#3b82f610' : 'transparent',
                                      }}
                                    >
                                      {lead.status}
                                    </span>
                                    {userLocation && (
                                      <>
                                        <span className="text-[9px] text-[#7a7a76]">·</span>
                                        <span className="text-[9px] font-bold text-blue-500">
                                          {haversineKm(userLocation[0], userLocation[1], lead._lat, lead._lng).toFixed(1)} km
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-[#e5e5e0] shrink-0">
              <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider mb-2">Légende</p>
              <div className="space-y-1.5">
                {[
                  { color: '#ef4444', label: 'Lead chaud' },
                  { color: '#f59e0b', label: 'Lead tiède' },
                  { color: '#3b82f6', label: 'Lead froid' },
                  { color: '#7a7a76', label: 'Sans site web (opportunité)' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-[#7a7a76]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* === PREVIOUS NORMAL MAP === */}
          <div className="flex-1 relative min-h-0">
            <Map
              ref={mapRef}
              center={userLocation ? [userLocation[1], userLocation[0]] : [-73.5674, 45.5019]}
              zoom={userLocation ? 13 : 12}
              className="absolute inset-0 w-full h-full"
            >
              <MapControls position="bottom-right" showZoom />
              <RouteLayer
                activeRoute={routeInfo}
                commercialRoute={commercialRoute}
                shortestRoute={shortestRoute}
                customRoute={customRoute}
                onSelectVariant={setSelectedVariant}
              />

              {filteredLeads.map((lead) => {
                const color = getMarkerColor(lead);
                const isSelected = selectedLeadId === lead.id;

                return (
                  <MapMarker key={lead.id} longitude={lead._lng} latitude={lead._lat}>
                    <MarkerContent>
                      <div
                        className={cn(
                          'rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-125',
                          isSelected ? 'h-6 w-6 scale-125' : 'h-4 w-4'
                        )}
                        style={{ backgroundColor: color }}
                        title={lead.businessName}
                        onClick={() => setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id)}
                      />
                    </MarkerContent>

                    <MarkerPopup closeButton>
                      <div className="min-w-[180px]">
                        <p className="text-sm font-bold text-[#26251e] mb-0.5 leading-tight">{lead.businessName}</p>
                        {lead.niche && <p className="text-[10px] text-[#7a7a76] mb-1">{lead.niche}</p>}
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-[9px] font-bold rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: color }}>
                            {getTemperatureLabel(lead.temperature)}
                          </span>
                          <span className="text-[10px] text-[#7a7a76]">{lead.status}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#7a7a76] mb-2 flex-wrap">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {lead.city}
                          {userLocation && (
                            <span className="font-bold text-blue-500">
                              · {haversineKm(userLocation[0], userLocation[1], lead._lat, lead._lng).toFixed(1)} km
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="inline-flex items-center text-[10px] font-bold text-[#059669] hover:underline"
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          Voir le lead →
                        </Link>
                      </div>
                    </MarkerPopup>
                  </MapMarker>
                );
              })}

              {userLocation && (
                <MapMarker longitude={userLocation[1]} latitude={userLocation[0]}>
                  <MarkerContent>
                    <div
                      className="h-5 w-5 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center cursor-default"
                      title="Votre position"
                    >
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  </MarkerContent>
                </MapMarker>
              )}
            </Map>
          </div>
        </>
      )}
    </div>
  );
}

export default MapRoot;
