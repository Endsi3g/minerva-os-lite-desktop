'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
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
}

// Inner component that has access to the MapLibre instance via useMap()
function RouteLayer({ routeInfo }: { routeInfo: RouteInfo | null }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const SOURCE_ID = 'osrm-route';
    const LAYER_ID = 'osrm-route-line';

    const cleanup = () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };

    cleanup();

    if (!routeInfo) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: routeInfo.geometry,
      },
    });

    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#059669',
        'line-width': 4,
        'line-opacity': 0.85,
      },
    });

    return cleanup;
  }, [map, isLoaded, routeInfo]);

  return null;
}

export function MapRoot() {
  const { leads } = useReach();
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [collapsedCities, setCollapsedCities] = useState<Record<string, boolean>>({});
  const leadItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Geolocation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Route planning state
  const [routeMode, setRouteMode] = useState(false);
  const [waypoints, setWaypoints] = useState<LeadWithCoords[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

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

  // Toggle waypoint in route mode
  const toggleWaypoint = useCallback((lead: LeadWithCoords) => {
    setWaypoints((prev) => {
      const exists = prev.find((w) => w.id === lead.id);
      if (exists) return prev.filter((w) => w.id !== lead.id);
      return [...prev, lead];
    });
    setRouteInfo(null);
    setRouteError(null);
  }, []);

  // Fetch OSRM route
  const fetchRoute = useCallback(async () => {
    if (waypoints.length < 2) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const coords = waypoints.map((w) => `${w._lng},${w._lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Aucun itinéraire trouvé');
      const route = data.routes[0];
      setRouteInfo({
        distanceKm: Math.round(route.distance / 100) / 10,
        durationMin: Math.round(route.duration / 60),
        geometry: route.geometry,
      });
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : 'Erreur OSRM');
    } finally {
      setRouteLoading(false);
    }
  }, [waypoints]);

  const clearRoute = () => {
    setWaypoints([]);
    setRouteInfo(null);
    setRouteError(null);
  };

  const exitRouteMode = () => {
    setRouteMode(false);
    clearRoute();
  };

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const temperatureOptions: { value: TemperatureFilter; label: string }[] = [
    { value: 'All', label: 'Tous' },
    { value: 'Hot', label: 'Chauds' },
    { value: 'Warm', label: 'Tièdes' },
    { value: 'Cold', label: 'Froids' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[300px] flex flex-col border-r border-[#e5e5e0] bg-[#fafaf8] shrink-0 overflow-hidden">
        <div className="p-4 border-b border-[#e5e5e0] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-[#26251e]">
              {routeMode ? 'Planifier une route' : 'Carte des leads'}
            </h2>
            <Button
              size="sm"
              variant={routeMode ? 'destructive' : 'outline'}
              className={cn(
                'h-7 text-[10px] font-bold gap-1 px-2',
                !routeMode && 'border-[#059669] text-[#059669] hover:bg-[#059669]/10'
              )}
              onClick={routeMode ? exitRouteMode : () => setRouteMode(true)}
            >
              {routeMode ? <><X className="h-3 w-3" /> Quitter</> : <><Route className="h-3 w-3" /> Itinéraire</>}
            </Button>
          </div>

          {!routeMode && (
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
              {userLocation ? 'Position localisée — Actualiser' : 'Afficher ma position + distances'}
            </Button>
          )}

          {routeMode ? (
            /* Route planning panel */
            <div className="space-y-2">
              <p className="text-[10px] text-[#7a7a76]">
                Cliquez sur les leads dans la liste pour les ajouter comme étapes.
              </p>
              {waypoints.length > 0 && (
                <div className="space-y-1">
                  {waypoints.map((w, i) => (
                    <div key={w.id} className="flex items-center gap-2 bg-white border border-[#e5e5e0] rounded px-2 py-1.5 text-xs">
                      <span className="h-4 w-4 rounded-full bg-[#059669] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate font-semibold text-[#26251e]">{w.businessName}</span>
                      <button onClick={() => toggleWaypoint(w)} className="text-[#7a7a76] hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={fetchRoute}
                  disabled={waypoints.length < 2 || routeLoading}
                  className="flex-1 h-7 text-[10px] font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1"
                >
                  {routeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                  {routeLoading ? 'Calcul...' : 'Calculer'}
                </Button>
                {(waypoints.length > 0 || routeInfo) && (
                  <Button size="sm" variant="outline" onClick={clearRoute} className="h-7 px-2">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {routeError && (
                <p className="text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded">{routeError}</p>
              )}

              {routeInfo && (
                <div className="bg-[#059669]/10 border border-[#059669]/20 rounded p-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#059669]">
                    <Navigation className="h-3 w-3" />
                    {routeInfo.distanceKm} km
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#7a7a76]">
                    <Clock className="h-3 w-3" />
                    ~{routeInfo.durationMin < 60
                      ? `${routeInfo.durationMin} min`
                      : `${Math.floor(routeInfo.durationMin / 60)}h${(routeInfo.durationMin % 60).toString().padStart(2, '0')}`}
                  </div>
                  <p className="text-[9px] text-[#7a7a76]">{waypoints.length} arrêts</p>
                </div>
              )}
            </div>
          ) : (
            /* Normal filters */
            <>
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
            </>
          )}
        </div>

        {/* Stats */}
        <div className="p-3 border-b border-[#e5e5e0] bg-white shrink-0">
          <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">
            {routeMode
              ? `${waypoints.length} étape${waypoints.length !== 1 ? 's' : ''} sélectionnée${waypoints.length !== 1 ? 's' : ''}`
              : `${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''} affichés`}
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
                        const waypointIdx = waypoints.findIndex((w) => w.id === lead.id);
                        const isWaypoint = waypointIdx !== -1;

                        return (
                          <div
                            key={lead.id}
                            ref={(el) => { leadItemRefs.current[lead.id] = el; }}
                            onClick={() => {
                              if (routeMode) {
                                toggleWaypoint(lead);
                              } else {
                                setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id);
                              }
                            }}
                            className={cn(
                              'flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-all text-left',
                              routeMode && isWaypoint
                                ? 'bg-[#059669]/10 border border-[#059669]/30'
                                : isSelected
                                ? 'bg-[#059669]/10 border border-[#059669]/20'
                                : 'hover:bg-[#e5e5e0]/40 border border-transparent'
                            )}
                          >
                            {routeMode && isWaypoint ? (
                              <span className="h-4 w-4 rounded-full bg-[#059669] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                {waypointIdx + 1}
                              </span>
                            ) : (
                              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            )}
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
        {!routeMode && (
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
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map center={userLocation ?? [45.5019, -73.5674]} zoom={userLocation ? 13 : 12} className="h-full w-full">
          <MapControls position="bottom-right" showZoom />
          <RouteLayer routeInfo={routeInfo} />

          {filteredLeads.map((lead) => {
            const color = getMarkerColor(lead);
            const isSelected = selectedLeadId === lead.id;
            const waypointIdx = waypoints.findIndex((w) => w.id === lead.id);
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
                    onClick={() => {
                      if (routeMode) toggleWaypoint(lead);
                      else setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id);
                    }}
                  >
                    {isWaypoint && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">
                        {waypointIdx + 1}
                      </span>
                    )}
                  </div>
                </MarkerContent>

                {!routeMode && (
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
                )}
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
    </div>
  );
}

export default MapRoot;
