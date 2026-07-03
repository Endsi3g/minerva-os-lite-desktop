'use client';

import React, { useState, useMemo } from 'react';
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls } from '@/components/ui/map';
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
  PanelLeft,
  Navigation,
  Star,
} from 'lucide-react';

// ── Status config ──────────────────────────────────────────────────────────────

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
  'Proposal Sent': 'Proposition',
  Negotiation: 'Négociation',
  Won: 'Gagné',
  Lost: 'Perdu',
};

// ── Coordinate resolution ──────────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  montreal: [45.5019, -73.5674], montréal: [45.5019, -73.5674],
  quebec: [46.8139, -71.2080], québec: [46.8139, -71.2080],
  laval: [45.6066, -73.7124], gatineau: [45.4765, -75.7013],
  longueuil: [45.5312, -73.5183], sherbrooke: [45.4042, -71.8929],
  saguenay: [48.4279, -71.0686], levis: [46.8033, -71.1778],
  lévis: [46.8033, -71.1778], 'trois-rivieres': [46.3432, -72.5429],
  'trois-rivières': [46.3432, -72.5429], terrebonne: [45.7000, -73.6334],
  'saint-jean-sur-richelieu': [45.3072, -73.2619], repentigny: [45.7423, -73.4513],
  drummondville: [45.8835, -72.4831], granby: [45.4042, -72.7340],
  'saint-jerome': [45.7805, -74.0034], 'saint-jérôme': [45.7805, -74.0034],
};
const DEFAULT_COORDS: [number, number] = [45.5019, -73.5674];

function applyJitter(v: number): number {
  return v + (Math.random() - 0.5) * 0.025;
}

function resolveCoords(lead: Lead): { lat: number; lng: number; estimated: boolean } {
  if (lead.latitude && lead.longitude) {
    return { lat: lead.latitude, lng: lead.longitude, estimated: false };
  }
  const key = (lead.city || '').toLowerCase().trim();
  const c = CITY_COORDS[key] ?? DEFAULT_COORDS;
  return { lat: applyJitter(c[0]), lng: applyJitter(c[1]), estimated: true };
}

type EnrichedLead = Lead & { _lat: number; _lng: number; _estimated: boolean };

// ── Main component ─────────────────────────────────────────────────────────────

export function MapRoot() {
  const { leads } = useReach();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [nicheFilter, setNicheFilter] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [showDraftArea, setShowDraftArea] = useState(false);

  const enrichedLeads = useMemo<EnrichedLead[]>(() => {
    return leads.map((lead) => {
      const coords = resolveCoords(lead);
      return { ...lead, _lat: coords.lat, _lng: coords.lng, _estimated: coords.estimated };
    });
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return enrichedLeads.filter((lead) => {
      if (
        searchQuery &&
        !lead.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !lead.city?.toLowerCase().includes(searchQuery.toLowerCase())
      ) return false;
      if (statusFilters.size > 0 && !statusFilters.has(lead.status || 'New')) return false;
      if (nicheFilter && lead.niche !== nicheFilter) return false;
      const score = lead.score ?? 0;
      if (score < scoreRange[0] || score > scoreRange[1]) return false;
      return true;
    });
  }, [enrichedLeads, searchQuery, statusFilters, nicheFilter, scoreRange]);

  const uniqueNiches = useMemo(
    () => [...new Set(leads.map((l) => l.niche).filter(Boolean))].sort() as string[],
    [leads]
  );

  const activeFilterCount =
    (statusFilters.size > 0 ? 1 : 0) +
    (nicheFilter ? 1 : 0) +
    (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0);

  // Montréal centre [lng, lat] — mapcn uses [lng, lat] order
  const mapCenter: [number, number] = [-73.5674, 45.5019];

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
      setDraftContent(data.content || data.error || 'Erreur de génération.');
    } catch {
      setDraftContent('Erreur réseau.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex">

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <div className={cn(
        'relative z-20 flex flex-col bg-white border-r border-[#e5e5e0] shrink-0 transition-all duration-300 overflow-hidden',
        showSidebar ? 'w-72' : 'w-0',
      )}>
        <div className="w-72 flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e0] shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-[#059669]" />
              <span className="text-xs font-bold text-[#26251e]">Leads</span>
              <span className="text-[10px] font-bold text-white bg-[#059669] px-1.5 py-0.5 rounded-full">{filteredLeads.length}</span>
            </div>
            <button
              onClick={() => setShowSidebar(false)}
              className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="px-3 py-2 border-b border-[#f0f0ec] shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#7a7a76]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chercher…"
                className="w-full h-7 pl-7 pr-2 text-xs bg-[#f7f7f4] border border-[#e5e5e0] rounded-lg outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MapPin className="h-6 w-6 text-[#e5e5e0] mb-2" />
                <p className="text-xs font-semibold text-[#7a7a76]">Aucun lead à afficher</p>
                <p className="text-[10px] text-[#a3a197] mt-1">Modifiez les filtres pour en voir plus.</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 border-b border-[#f4f4f3] transition-colors',
                      isSelected ? 'bg-[#059669]/5 border-l-2 border-l-[#059669]' : 'hover:bg-[#fafaf8]',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5"
                        style={{ background: STATUS_COLORS[lead.status || 'New'] }}
                      >
                        {(lead.businessName || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold leading-tight truncate', isSelected ? 'text-[#059669]' : 'text-[#26251e]')}>
                          {lead.businessName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {lead.city && (
                            <span className="text-[9px] text-[#7a7a76] flex items-center gap-0.5 truncate">
                              <Navigation className="h-2.5 w-2.5" />
                              {lead.city}
                              {lead._estimated && <span className="text-[#a3a197] italic"> approx.</span>}
                            </span>
                          )}
                          {lead.rating && (
                            <span className="text-[9px] text-[#7a7a76] flex items-center gap-0.5 shrink-0">
                              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                              {lead.rating}
                            </span>
                          )}
                        </div>
                      </div>
                      {lead.score != null && (
                        <span className="text-[9px] font-black text-[#059669] shrink-0 mt-1">{lead.score}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-3 border-t border-[#e5e5e0] shrink-0">
            <Link
              href="/field"
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              Planifier des visites
            </Link>
          </div>
        </div>
      </div>

      {/* ── Map area ──────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Map canvas — @mapcn/map handles all MapLibre internals */}
        <div className="absolute inset-0">
          <Map center={mapCenter} zoom={11} theme="light" className="w-full h-full">
            <MapControls position="bottom-right" />

            {filteredLeads.map((lead) => {
              const color = STATUS_COLORS[lead.status || 'New'];
              return (
                <MapMarker
                  key={lead.id}
                  longitude={lead._lng}
                  latitude={lead._lat}
                >
                  <MarkerContent>
                    <button
                      onClick={() => setSelectedLead(lead)}
                      title={lead.businessName || ''}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: color,
                        border: '3px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 900,
                        color: 'white',
                        cursor: 'pointer',
                        opacity: lead._estimated ? 0.65 : 1,
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.25)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    >
                      {(lead.businessName || '?')[0].toUpperCase()}
                    </button>
                  </MarkerContent>
                  <MarkerTooltip>{lead.businessName}</MarkerTooltip>
                </MapMarker>
              );
            })}
          </Map>
        </div>

        {/* Floating topbar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className={cn(
              'pointer-events-auto flex items-center justify-center h-9 w-9 rounded-xl border shadow-sm backdrop-blur-md transition-colors shrink-0',
              showSidebar
                ? 'bg-[#059669] text-white border-[#059669]'
                : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white'
            )}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>

          <div className="relative flex-1 max-w-xs pointer-events-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chercher un lead…"
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-white/90 backdrop-blur-md border border-[#e5e5e0] rounded-xl shadow-sm outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e] placeholder:text-[#7a7a76]"
            />
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold shadow-sm backdrop-blur-md transition-colors',
              activeFilterCount > 0
                ? 'bg-[#059669] text-white border-[#059669]'
                : 'bg-white/90 text-[#26251e] border-[#e5e5e0] hover:bg-white'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="bg-white/30 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
            )}
          </button>

          <div className="pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/90 backdrop-blur-md border border-[#e5e5e0] shadow-sm">
            <Users className="h-3.5 w-3.5 text-[#059669]" />
            <span className="text-xs font-bold text-[#26251e]">{filteredLeads.length}</span>
            <span className="text-xs text-[#7a7a76]">leads</span>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="absolute top-14 left-3 z-20 w-72 bg-white rounded-2xl border border-[#e5e5e0] shadow-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">Filtres</span>
              <button
                onClick={() => { setStatusFilters(new Set()); setNicheFilter(''); setScoreRange([0, 100]); }}
                className="text-[10px] font-bold text-[#059669] hover:underline"
              >
                Réinitialiser
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-2">Statut</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const next = new Set(statusFilters);
                      if (next.has(key)) next.delete(key); else next.add(key);
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Score</p>
                <span className="text-[10px] font-bold text-[#26251e]">{scoreRange[0]}–{scoreRange[1]}</span>
              </div>
              <input
                type="range" min={0} max={100} value={scoreRange[1]}
                onChange={(e) => setScoreRange([scoreRange[0], +e.target.value])}
                className="w-full accent-[#059669]"
              />
            </div>

            {uniqueNiches.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">Niche</p>
                <select
                  value={nicheFilter}
                  onChange={(e) => setNicheFilter(e.target.value)}
                  className="w-full h-8 border border-[#e5e5e0] rounded-lg px-2 text-xs font-semibold text-[#26251e] outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                >
                  <option value="">Toutes</option>
                  {uniqueNiches.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
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
          <div className="flex items-center gap-2 pt-1 border-t border-[#f0f0ec] mt-1">
            <div className="w-3 h-3 rounded-full border border-white shadow-sm opacity-60 bg-[#7a7a76]" />
            <span className="text-[9px] text-[#a3a197] italic">Position approx.</span>
          </div>
        </div>

        {/* Lead detail drawer */}
        {selectedLead && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-30 flex flex-col border-l border-[#e5e5e0]">
            <div className="p-4 border-b border-[#f0f0ec]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#26251e] leading-tight truncate">{selectedLead.businessName}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3 w-3 text-[#7a7a76] shrink-0" />
                    <span className="text-[10px] text-[#7a7a76] truncate">
                      {selectedLead.city}{selectedLead.niche && ` · ${selectedLead.niche}`}
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

              <div className="flex items-center gap-2 mt-3">
                <span
                  className="text-[9px] font-bold px-2 py-1 rounded-full text-white"
                  style={{ background: STATUS_COLORS[selectedLead.status || 'New'] }}
                >
                  {STATUS_LABELS[selectedLead.status || 'New']}
                </span>
                {selectedLead.score != null && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="flex-1 h-1.5 bg-[#f0f0ec] rounded-full overflow-hidden">
                      <div className="h-full bg-[#059669] rounded-full" style={{ width: `${selectedLead.score}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-[#26251e]">{selectedLead.score}</span>
                  </div>
                )}
              </div>
            </div>

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
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">Description</p>
                  <p className="text-[10px] text-[#555552] leading-relaxed line-clamp-3">{selectedLead.websiteDescription}</p>
                </div>
              )}
              {selectedLead.notes && selectedLead.notes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Notes récentes</p>
                  {selectedLead.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-2.5 bg-[#fafaf8] rounded-xl border border-[#f0f0ec]">
                      <p className="text-[10px] text-[#555552] leading-relaxed line-clamp-2">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {showDraftArea && (
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Brouillon IA</p>
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

            <div className="p-4 border-t border-[#f0f0ec] space-y-2">
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
                className="w-full h-9 border border-[#e5e5e0] hover:bg-[#f4f4f3] text-[#26251e] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                Voir le lead complet <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapRoot;
