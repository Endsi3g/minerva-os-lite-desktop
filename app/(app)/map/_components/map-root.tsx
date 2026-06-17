'use client';

import React, { useState, useMemo } from 'react';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
} from '@/components/ui/map';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, MapPin } from 'lucide-react';
import Link from 'next/link';

// Known Quebec city coords — same as scrape-maps/route.ts
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
  if (!lead.website) return '#7a7a76'; // No website = opportunity (gray)
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

// Apply small jitter so markers don't stack on the same city
function applyJitter(val: number): number {
  return val + (Math.random() - 0.5) * 0.03;
}

type TemperatureFilter = 'All' | 'Hot' | 'Warm' | 'Cold';

export function MapRoot() {
  const { leads } = useReach();
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Compute coords for each lead
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

  // Count by city for sidebar
  const cityCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const city = l.city || 'Inconnue';
      map[city] = (map[city] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredLeads]);

  const temperatureOptions: { value: TemperatureFilter; label: string; color: string }[] = [
    { value: 'All', label: 'Tous', color: '#26251e' },
    { value: 'Hot', label: 'Chauds', color: '#ef4444' },
    { value: 'Warm', label: 'Tièdes', color: '#f59e0b' },
    { value: 'Cold', label: 'Froids', color: '#3b82f6' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-[300px] flex flex-col border-r border-[#e5e5e0] bg-[#fafaf8] shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-[#e5e5e0]">
          <h2 className="text-sm font-black text-[#26251e] mb-3">Carte des leads</h2>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Temperature filters */}
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
        <div className="p-3 border-b border-[#e5e5e0] bg-white">
          <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider mb-2">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} affichés
          </p>
        </div>

        {/* City counts */}
        <div className="flex-1 p-3">
          <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider mb-2">
            Par ville
          </p>
          <div className="space-y-1">
            {cityCounts.length === 0 ? (
              <p className="text-[11px] text-[#7a7a76] italic">Aucun résultat</p>
            ) : (
              cityCounts.map(([city, count]) => (
                <div
                  key={city}
                  className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#e5e5e0]/40 transition-colors"
                >
                  <span className="text-xs text-[#26251e] flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-[#7a7a76]" />
                    {city}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold h-4 px-1.5 border-[#e5e5e0] text-[#7a7a76]"
                  >
                    {count}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-[#e5e5e0]">
          <p className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider mb-2">
            Légende
          </p>
          <div className="space-y-1.5">
            {[
              { color: '#ef4444', label: 'Lead chaud' },
              { color: '#f59e0b', label: 'Lead tiède' },
              { color: '#3b82f6', label: 'Lead froid' },
              { color: '#7a7a76', label: 'Sans site web (opportunité)' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0 border border-white shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-[#7a7a76]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map fills remaining space */}
      <div className="flex-1 relative">
        <Map
          center={[-73.5, 46.0]}
          zoom={7}
          className="h-full w-full"
        >
          <MapControls position="bottom-right" showZoom />

          {filteredLeads.map((lead) => {
            const color = getMarkerColor(lead);

            return (
              <MapMarker
                key={lead.id}
                longitude={lead._lng}
                latitude={lead._lat}
              >
                <MarkerContent>
                  <div
                    className="h-4 w-4 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-125"
                    style={{ backgroundColor: color }}
                    title={lead.businessName}
                  />
                </MarkerContent>

                <MarkerPopup closeButton>
                  <div className="min-w-[180px]">
                    <p className="text-sm font-bold text-[#26251e] mb-1 leading-tight">
                      {lead.businessName}
                    </p>
                    <div className="flex items-center gap-1 mb-2">
                      <span
                        className="text-[9px] font-bold rounded px-1.5 py-0.5 text-white"
                        style={{ backgroundColor: color }}
                      >
                        {getTemperatureLabel(lead.temperature)}
                      </span>
                      <span className="text-[10px] text-[#7a7a76]">{lead.status}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#7a7a76] mb-2">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {lead.city}
                    </div>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center text-[10px] font-bold text-[#f54e00] hover:underline"
                    >
                      Voir le lead →
                    </Link>
                  </div>
                </MarkerPopup>
              </MapMarker>
            );
          })}
        </Map>
      </div>
    </div>
  );
}

export default MapRoot;
