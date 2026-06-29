'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Mail,
  Loader2,
  ChevronRight,
  Users,
  Zap,
} from 'lucide-react';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  New: '#7a7a76',
  Contacted: '#6b7280',
  'Meeting Booked': '#2563eb',
  'Proposal Sent': '#d97706',
  Negotiation: '#7c3aed',
  Won: '#059669',
  Lost: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  New: 'Nouveau',
  Contacted: 'Contacté',
  'Meeting Booked': 'RDV planifié',
  'Proposal Sent': 'Proposition envoyée',
  Negotiation: 'Négociation',
  Won: 'Gagné',
  Lost: 'Perdu',
};

// Carto positron — same source as components/ui/map.tsx (known-working, no API key)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export function MapRoot() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { leads } = useReach();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [nicheFilter, setNicheFilter] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [showDraftArea, setShowDraftArea] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter leads to those with coordinates
  const leadsWithCoords = useMemo(
    () => leads.filter((l) => l.latitude && l.longitude),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    return leadsWithCoords.filter((lead) => {
      if (
        searchQuery &&
        !lead.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !lead.city?.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (statusFilters.size > 0 && !statusFilters.has(lead.status || 'New')) return false;
      if (nicheFilter && lead.niche !== nicheFilter) return false;
      const score = lead.score || 0;
      if (score < scoreRange[0] || score > scoreRange[1]) return false;
      return true;
    });
  }, [leadsWithCoords, searchQuery, statusFilters, nicheFilter, scoreRange]);

  const uniqueNiches = useMemo(
    () => [...new Set(leads.map((l) => l.niche).filter(Boolean))].sort() as string[],
    [leads]
  );

  const activeFilterCount =
    (statusFilters.size > 0 ? 1 : 0) +
    (nicheFilter ? 1 : 0) +
    (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0);

  // Initialize MapLibre
  useEffect(() => {
    // Guard: container must be mounted, no existing instance
    const container = mapContainer.current;
    if (!container || map.current) return;

    map.current = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [-73.5674, 45.5019], // Montréal
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.current.on('load', () => {
      // Force resize after load to fix blank map when container dimensions
      // weren't fully settled during the sidebar collapse animation
      map.current?.resize();
      setMapLoaded(true);
    });

    // Resize whenever the container dimensions change (sidebar toggle, window resize)
    const ro = new ResizeObserver(() => { map.current?.resize(); });
    ro.observe(container);

    return () => {
      ro.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const mapInstance = map.current;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Group leads that share (approximately) the same coordinates so we can
    // show a count badge rather than fully overlapping markers.
    const groups = new Map<string, Lead[]>();
    filteredLeads.forEach((lead) => {
      const key = `${lead.latitude!.toFixed(4)},${lead.longitude!.toFixed(4)}`;
      const arr = groups.get(key);
      if (arr) arr.push(lead);
      else groups.set(key, [lead]);
    });

    groups.forEach((group) => {
      const lead = group[0];
      const count = group.length;
      const el = document.createElement('div');
      el.className = 'lead-marker';
      const color = STATUS_COLORS[lead.status || 'New'] || '#7a7a76';
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 9px; font-weight: 900; color: white;
        transition: transform 0.15s ease; z-index: 1;
      `;
      el.textContent =
        count > 1 ? String(count) : (lead.businessName || '?')[0].toUpperCase();
      el.title = count > 1 ? `${count} leads` : lead.businessName || '';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.zIndex = '10';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      });
      el.addEventListener('click', () => {
        if (count > 1) {
          // Zoom into the cluster
          mapInstance.flyTo({
            center: [lead.longitude!, lead.latitude!],
            zoom: Math.max(mapInstance.getZoom() + 2, 15),
            duration: 600,
          });
          return;
        }
        setSelectedLead(lead);
        setDraftContent('');
        setShowDraftArea(false);
        mapInstance.flyTo({
          center: [lead.longitude!, lead.latitude!],
          zoom: Math.max(mapInstance.getZoom(), 14),
          duration: 600,
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lead.longitude!, lead.latitude!])
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });
  }, [filteredLeads, mapLoaded]);

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
      if (data.content) setDraftContent(data.content);
      else setDraftContent(data.error || 'Erreur de génération.');
    } catch {
      setDraftContent('Erreur réseau.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const resetFilters = () => {
    setStatusFilters(new Set());
    setNicheFilter('');
    setScoreRange([0, 100]);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#e5e5e0]">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Floating topbar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chercher un lead…"
            className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-white/90 backdrop-blur-md border border-[#e5e5e0] rounded-xl shadow-sm outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
          />
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
            activeFilterCount > 0
              ? 'bg-[#059669] text-white border-[#059669]'
              : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtres
          {activeFilterCount > 0 && (
            <span className="bg-white/30 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Stats pill */}
        <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/90 backdrop-blur-md border border-[#e5e5e0] shadow-sm">
          <Users className="h-3.5 w-3.5 text-[#059669]" />
          <span className="text-xs font-bold text-[#26251e]">{filteredLeads.length}</span>
          <span className="text-xs text-[#7a7a76]">leads</span>
        </div>

        {/* Terrain flow button */}
        <Link
          href="/field"
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#26251e] text-white text-xs font-bold shadow-sm hover:bg-[#3a3930] transition-colors whitespace-nowrap"
        >
          <MapPin className="h-3.5 w-3.5" />
          Planifier des visites
        </Link>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="absolute top-14 left-3 z-20 w-72 bg-white rounded-2xl border border-[#e5e5e0] shadow-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
              Filtres
            </span>
            <button
              onClick={resetFilters}
              className="text-[10px] font-bold text-[#059669] hover:underline"
            >
              Réinitialiser
            </button>
          </div>

          {/* Status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">
              Statut
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    const next = new Set(statusFilters);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    setStatusFilters(next);
                  }}
                  className={cn(
                    'px-2 py-1 rounded-full text-[9px] font-bold transition-colors border',
                    statusFilters.has(key)
                      ? 'text-white border-transparent'
                      : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#26251e]'
                  )}
                  style={statusFilters.has(key) ? { background: STATUS_COLORS[key] } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Score range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                Score
              </p>
              <span className="text-[10px] font-bold text-[#26251e]">
                {scoreRange[0]}–{scoreRange[1]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={scoreRange[1]}
              onChange={(e) => setScoreRange([scoreRange[0], +e.target.value])}
              className="w-full accent-[#059669]"
            />
          </div>

          {/* Niche */}
          {uniqueNiches.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">
                Niche
              </p>
              <select
                value={nicheFilter}
                onChange={(e) => setNicheFilter(e.target.value)}
                className="w-full h-8 border border-[#e5e5e0] rounded-lg px-2 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] bg-white"
              >
                <option value="">Toutes</option>
                {uniqueNiches.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-12 left-3 z-20 bg-white/90 backdrop-blur-md rounded-xl border border-[#e5e5e0] shadow p-2 space-y-1">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ background: STATUS_COLORS[key] }}
            />
            <span className="text-[9px] font-semibold text-[#555552]">{label}</span>
          </div>
        ))}
      </div>

      {/* Lead drawer */}
      {selectedLead && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-30 flex flex-col border-l border-[#e5e5e0]">
          {/* Drawer header */}
          <div className="p-4 border-b border-[#f0f0ec]">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#26251e] leading-tight truncate">
                  {selectedLead.businessName}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-[#7a7a76] shrink-0" />
                  <span className="text-[10px] text-[#7a7a76] truncate">
                    {selectedLead.city}
                    {selectedLead.niche && ` · ${selectedLead.niche}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-7 h-7 rounded-full hover:bg-[#f4f4f3] flex items-center justify-center ml-2 shrink-0"
              >
                <X className="h-3.5 w-3.5 text-[#7a7a76]" />
              </button>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 mt-3">
              <span
                className="text-[9px] font-bold px-2 py-1 rounded-full text-white"
                style={{ background: STATUS_COLORS[selectedLead.status || 'New'] }}
              >
                {STATUS_LABELS[selectedLead.status || 'New']}
              </span>
              {selectedLead.score !== undefined && selectedLead.score !== null && (
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="flex-1 h-1.5 bg-[#f0f0ec] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#059669] rounded-full transition-all"
                      style={{ width: `${selectedLead.score}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-[#26251e]">{selectedLead.score}</span>
                </div>
              )}
            </div>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
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
            {selectedLead.websiteDescription && (
              <div className="p-2.5 bg-[#fafaf8] rounded-xl border border-[#f0f0ec]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">
                  Description
                </p>
                <p className="text-[10px] text-[#555552] leading-relaxed line-clamp-3">
                  {selectedLead.websiteDescription}
                </p>
              </div>
            )}

            {/* Recent notes */}
            {selectedLead.notes && selectedLead.notes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Notes récentes
                </p>
                {selectedLead.notes.slice(0, 3).map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 bg-[#fafaf8] rounded-xl border border-[#f0f0ec]"
                  >
                    <p className="text-[10px] text-[#555552] leading-relaxed line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Draft area */}
            {showDraftArea && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Brouillon IA
                </p>
                {generatingDraft ? (
                  <div className="flex items-center gap-2 p-3 bg-[#fafaf8] rounded-xl">
                    <Loader2 className="h-4 w-4 animate-spin text-[#059669]" />
                    <span className="text-xs text-[#7a7a76]">Génération en cours…</span>
                  </div>
                ) : (
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={6}
                    className="w-full border border-[#e5e5e0] rounded-xl p-3 text-[10px] text-[#26251e] leading-relaxed resize-none outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                  />
                )}
              </div>
            )}
          </div>

          {/* Drawer footer */}
          <div className="p-4 border-t border-[#f0f0ec] space-y-2">
            <button
              onClick={handleGenerateDraft}
              disabled={generatingDraft}
              className="w-full h-9 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {generatingDraft ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Générer un email
            </button>
            <Link
              href={`/leads/${selectedLead.id}`}
              className="w-full h-9 border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#26251e] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              Voir le lead complet
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-[#fafaf8] flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#059669] flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-bold text-[#26251e]">Chargement de la carte…</p>
            <Loader2 className="h-5 w-5 animate-spin text-[#059669]" />
          </div>
        </div>
      )}
    </div>
  );
}

export default MapRoot;
