'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  OnChangeFn,
  PaginationState,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useQueryState, parseAsString, parseAsBoolean, parseAsInteger, parseAsStringLiteral, parseAsArrayOf } from 'nuqs';
import { Camera, Star } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import type { AuthResponse } from '@supabase/supabase-js';
import { getApiUrl } from '@/lib/api-helper';
import { cachedFetch } from '@/lib/fetch-cache';
import { Lead } from '@/lib/mock-data';
import { useIsMobile } from '@/lib/use-is-mobile';
import { buildColumns } from '../columns';
import { TEAM_ASSIGN_VALUE } from './leads-assign-cell';
import { DataTable } from '../data-table';
import { LeadsHeader } from './leads-header';
import { LeadsFilters } from './leads-filters';
import { LeadsEmptyState } from './leads-empty-state';
import { LeadsBulkActionsBar } from './leads-bulk-actions-bar';
import { LeadsSubNav } from './leads-sub-nav';

interface WorkspaceMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

const PAGE_SIZE = 10;

export function LeadsRoot() {
  const { leads, activeWorkspace, isDataReady } = useReach();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  // Cross-workspace leads assigned to the current user
  const [crossLeads, setCrossLeads] = useState<Lead[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const isMobile = useIsMobile();

  // Filtres/tri/pagination/vue — tous dans l'URL (nuqs) : une vue filtrée devient
  // un lien partageable/bookmarkable, indépendamment du branding visuel.
  const [globalFilter, setGlobalFilter] = useQueryState('q', parseAsString.withDefault(''));
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('all'));
  const [tempFilter, setTempFilter] = useQueryState('temp', parseAsString.withDefault('all'));
  const [nicheFilter, setNicheFilter] = useQueryState('niche', parseAsString.withDefault('all'));
  const [ownerFilter, setOwnerFilter] = useQueryState('owner', parseAsString.withDefault('all'));
  const [enrichFilter, setEnrichFilter] = useQueryState('enrich', parseAsString.withDefault('all'));
  const [sortParam, setSortParam] = useQueryState('sort', parseAsString.withDefault('intentScore:desc'));
  const [viewMode, setViewMode] = useQueryState('view', parseAsStringLiteral(['list', 'gallery']).withDefault('list'));
  const [showAssignedToMe, setShowAssignedToMe] = useQueryState('mine', parseAsBoolean.withDefault(false));
  const [pageIndex, setPageIndex] = useQueryState('page', parseAsInteger.withDefault(0));
  const [hiddenColumns, setHiddenColumns] = useQueryState('hide', parseAsArrayOf(parseAsString).withDefault([]));

  // Le tableau (colonnes denses, scroll horizontal) est peu utilisable sur petit écran —
  // la vue galerie (déjà responsive, une seule colonne sur mobile) devient la vue par
  // défaut dès que l'écran passe sous le seuil mobile. L'utilisateur reste libre de
  // repasser en liste ensuite ; ce n'est qu'un défaut initial, pas un verrou.
  useEffect(() => {
    if (isMobile) setViewMode('gallery');
  }, [isMobile, setViewMode]);

  // Fetch current user
  useEffect(() => {
    void createClient().auth.getUser().then((res: AuthResponse) => {
      if (res.data.user) setMyUserId(res.data.user.id);
    });
  }, []);

  // Fetch workspace members for assignment dropdown (30 s client cache — same TTL as server cache)
  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    const ownerParam = activeWorkspace.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
    try {
      const data = await cachedFetch<{ members: WorkspaceMember[] }>(
        getApiUrl(`/api/team/members${ownerParam}`),
        undefined,
        30_000
      );
      setWorkspaceMembers(data.members || []);
    } catch {}
  }, [activeWorkspace?.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Fetch cross-workspace leads when "Mes leads" filter is active
  const fetchCrossLeads = useCallback(async () => {
    if (!showAssignedToMe) { setCrossLeads([]); return; }
    try {
      const res = await fetch(getApiUrl('/api/leads/assigned'));
      if (res.ok) {
        const data = await res.json();
        setCrossLeads(data.leads || []);
      }
    } catch {}
  }, [showAssignedToMe]);

  useEffect(() => { fetchCrossLeads(); }, [fetchCrossLeads]);

  const [lastVisitedLeadId, setLastVisitedLeadId] = useState<string | null>(null);
  useEffect(() => {
    setLastVisitedLeadId(localStorage.getItem('minerva_last_visited_lead_id'));
  }, []);

  // Géolocalisation à la demande uniquement (pas de prompt silencieux au chargement),
  // même pattern que app/(app)/prospecting — alimente la colonne "Visitable".
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10_000 }
    );
  }, []);

  // "Mes leads" mode: merge current workspace leads + cross-workspace assigned leads, deduplicated
  const baseLeads = useMemo<Lead[]>(() => {
    if (!showAssignedToMe || !myUserId) return leads;
    const wsMatches = leads.filter(
      l => l.assignedTo === myUserId || l.assignedTo === TEAM_ASSIGN_VALUE
    );
    const wsIds = new Set(wsMatches.map(l => l.id));
    const crossOnly = crossLeads.filter(l => !wsIds.has(l.id));
    return [...wsMatches, ...crossOnly];
  }, [leads, showAssignedToMe, myUserId, crossLeads]);

  // Put last visited lead first — memoized so TanStack Table never sees an unstable data reference
  const visibleLeads = useMemo<Lead[]>(() => {
    if (!lastVisitedLeadId) return baseLeads;
    const idx = baseLeads.findIndex(l => l.id === lastVisitedLeadId);
    if (idx <= 0) return baseLeads;
    const reordered = [...baseLeads];
    const [visited] = reordered.splice(idx, 1);
    return [visited, ...reordered];
  }, [baseLeads, lastVisitedLeadId]);

  // Memoized so TanStack Table never receives new column-def references on every render
  const columns = useMemo(
    () => buildColumns(workspaceMembers, lastVisitedLeadId, userLocation),
    [workspaceMembers, lastVisitedLeadId, userLocation]
  );

  // Dérive le SortingState TanStack depuis le paramètre d'URL `sort=field:dir`.
  const sorting: SortingState = useMemo(() => {
    if (!sortParam) return [];
    const [id, dir] = sortParam.split(':');
    if (!id) return [];
    return [{ id, desc: dir === 'desc' }];
  }, [sortParam]);

  const handleSortingChange: OnChangeFn<SortingState> = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    if (!next.length) { setSortParam(null); return; }
    setSortParam(`${next[0].id}:${next[0].desc ? 'desc' : 'asc'}`);
  }, [sorting, setSortParam]);

  // Dérive le ColumnFiltersState TanStack depuis les paramètres d'URL individuels.
  const columnFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = [];
    if (statusFilter !== 'all') filters.push({ id: 'status', value: statusFilter });
    if (tempFilter !== 'all') filters.push({ id: 'temperature', value: tempFilter });
    if (nicheFilter !== 'all') filters.push({ id: 'niche', value: nicheFilter });
    if (ownerFilter !== 'all') filters.push({ id: 'assignedTo', value: ownerFilter });
    if (enrichFilter !== 'all') filters.push({ id: 'enrichmentStatus', value: enrichFilter });
    return filters;
  }, [statusFilter, tempFilter, nicheFilter, ownerFilter, enrichFilter]);

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(columnFilters) : updater;
    const byId = Object.fromEntries(next.map((f) => [f.id, f.value as string]));
    setStatusFilter(byId.status ?? 'all');
    setTempFilter(byId.temperature ?? 'all');
    setNicheFilter(byId.niche ?? 'all');
    setOwnerFilter(byId.assignedTo ?? 'all');
    setEnrichFilter(byId.enrichmentStatus ?? 'all');
  }, [columnFilters, setStatusFilter, setTempFilter, setNicheFilter, setOwnerFilter, setEnrichFilter]);

  const columnVisibility: VisibilityState = useMemo(
    () => Object.fromEntries(hiddenColumns.map((id) => [id, false])),
    [hiddenColumns]
  );

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
    const hidden = Object.entries(next).filter(([, visible]) => visible === false).map(([id]) => id);
    setHiddenColumns(hidden.length ? hidden : null);
  }, [columnVisibility, setHiddenColumns]);

  const pagination: PaginationState = useMemo(() => ({ pageIndex, pageSize: PAGE_SIZE }), [pageIndex]);

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    setPageIndex(next.pageIndex || null);
  }, [pagination, setPageIndex]);

  const table = useReactTable({
    data: visibleLeads,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection, columnVisibility, pagination },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: (val) => setGlobalFilter(val || null),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const isFilteredEmpty = table.getRowModel().rows.length === 0;
  // In "Mes leads" mode, empty state checks the merged list; otherwise the workspace list
  const isDatabaseEmpty = !showAssignedToMe && leads.length === 0;

  const filteredLeads = useMemo(() => {
    return table.getRowModel().rows.map(row => row.original);
  }, [table.getRowModel().rows]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <LeadsSubNav />
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 overflow-y-auto bg-[#fafaf8] relative min-h-0">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20" />
      <div className="flex flex-col gap-5 relative z-10 flex-1">
        <LeadsHeader />

        <LeadsFilters
          table={table}
          showAssignedToMe={showAssignedToMe}
          onToggleAssignedToMe={() => setShowAssignedToMe(showAssignedToMe ? null : true)}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode === 'list' ? null : mode)}
          workspaceMembers={workspaceMembers}
          userLocation={userLocation}
          locating={locating}
          onRequestLocation={requestLocation}
        />

        {!isDataReady ? (
          <DataTable columns={columns} table={table} isLoading={true} />
        ) : isDatabaseEmpty ? (
          <LeadsEmptyState
            type="no-leads"
            onAddLead={() => {
              const sheetTrigger = document.querySelector('[aria-haspopup="dialog"]') as HTMLElement;
              if (sheetTrigger) sheetTrigger.click();
            }}
          />
        ) : isFilteredEmpty ? (
          <LeadsEmptyState
            type="no-results"
            onResetFilters={() => {
              setGlobalFilter(null);
              setStatusFilter(null);
              setTempFilter(null);
              setNicheFilter(null);
              setOwnerFilter(null);
              setEnrichFilter(null);
              setShowAssignedToMe(null);
            }}
          />
        ) : viewMode === 'gallery' ? (
          <LeadsGallery leads={filteredLeads} />
        ) : (
          <DataTable columns={columns} table={table} />
        )}

        <LeadsBulkActionsBar table={table} workspaceMembers={workspaceMembers} />
      </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  'New': '#8A9098',
  'Contacted': '#4B5158',
  'Meeting Booked': '#E8A33D',
  'Proposal Sent': '#E8A33D',
  'Negotiation': '#E8A33D',
  'Won': '#167f5b',
  'Lost': '#D64545',
};

const STATUS_LABELS: Record<string, string> = {
  'New': 'Nouveau',
  'Contacted': 'Contacté',
  'Meeting Booked': 'RDV Fixé',
  'Proposal Sent': 'Proposition envoyée',
  'Negotiation': 'Négociation',
  'Won': 'Gagné',
  'Lost': 'Perdu',
};

function LeadsGallery({ leads }: { leads: Lead[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
      {leads.map((lead) => (
        <div
          key={lead.id}
          onClick={() => {
            localStorage.setItem('minerva_last_visited_lead_id', lead.id);
            router.push(`/leads/${lead.id}`);
          }}
          className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden shadow-xs hover:border-[#8A9098] cursor-pointer transition-all duration-150 flex flex-col group h-full"
        >
          {/* Cover image / storefront */}
          <div className="aspect-video w-full bg-[#f4f4f3] border-b border-[#e5e5e0] relative flex items-center justify-center overflow-hidden shrink-0">
            {lead.imageUrl ? (
              <img
                src={lead.imageUrl}
                alt={lead.businessName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-[#8A9098]">
                <Camera className="h-6 w-6 opacity-30" />
                <span className="text-[10px] font-medium">Aucune photo</span>
              </div>
            )}

            {/* Quick status indicator in top corner — petit carré coloré, pas un badge plein */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-white/95 rounded-full px-2 py-0.5 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-sm shrink-0" style={{ backgroundColor: STATUS_COLORS[lead.status || 'New'] }} />
              <span className="text-[9px] font-bold text-[#14171A]">{STATUS_LABELS[lead.status || 'New']}</span>
            </div>
          </div>

          {/* Card Info */}
          <div className="p-3 flex-1 flex flex-col justify-between gap-3 bg-white">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-[#14171A] line-clamp-1 group-hover:text-[#167f5b] transition-colors">
                {lead.businessName}
              </h3>
              <p className="text-[10px] text-[#8A9098] truncate">
                {lead.city || 'Ville inconnue'}{lead.niche ? ` · ${lead.niche}` : ''}
              </p>
            </div>

            {/* Google review star rating */}
            {lead.rating !== undefined && lead.rating !== null && (
              <div className="flex items-center gap-1 text-[10px] leading-none">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-bold text-[#14171A]">{lead.rating.toFixed(1)}</span>
                {lead.reviewsCount !== undefined && (
                  <span className="text-[#8A9098] text-[9px]">({lead.reviewsCount} avis)</span>
                )}
              </div>
            )}

            {/* Website description snippet if exists */}
            {lead.websiteDescription && (
              <p className="text-[9px] text-[#8A9098] line-clamp-2 bg-[#f4f4f3]/40 p-2 rounded border border-[#e5e5e0]/50 italic">
                {lead.websiteDescription}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LeadsRoot;
