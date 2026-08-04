'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Table as TableType } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, X, LayoutGrid, List, Columns3, MapPinned, Loader2 } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { UnifiedFilterBar, type FilterGroup } from '@/components/ui/unified-filter-bar';

interface WorkspaceMember {
  id: string;
  email: string;
  member_user_id: string | null;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'intentScore:desc', label: 'Intent (décroissant)' },
  { value: 'score:desc', label: 'Score (décroissant)' },
  { value: 'businessName:asc', label: 'Entreprise (A→Z)' },
  { value: 'businessName:desc', label: 'Entreprise (Z→A)' },
  { value: 'lastActivityAt:desc', label: 'Activité récente' },
];

const COLUMN_LABELS: Record<string, string> = {
  domain: 'Domaine',
  niche: 'Industrie',
  assignedTo: 'Owner',
  contactName: 'Contact',
  status: 'Statut prospection',
  lastActivityAt: 'Dernière activité',
  visitable: 'Visitable',
  temperature: 'Température',
  nextAction: 'Action suivante',
  enrichmentStatus: 'Enrichissement',
  score: 'Score',
  intentScore: 'Intent',
  opportunityScore: 'Opportunité',
  tags: 'Tags',
};

interface LeadsFiltersProps<TData> {
  table: TableType<TData>;
  showAssignedToMe: boolean;
  onToggleAssignedToMe: () => void;
  viewMode: 'list' | 'gallery';
  onViewModeChange: (mode: 'list' | 'gallery') => void;
  workspaceMembers?: WorkspaceMember[];
  userLocation?: { lat: number; lon: number } | null;
  locating?: boolean;
  onRequestLocation?: () => void;
}

export function LeadsFilters<TData>({
  table,
  showAssignedToMe,
  onToggleAssignedToMe,
  viewMode,
  onViewModeChange,
  workspaceMembers = [],
  userLocation,
  locating,
  onRequestLocation,
}: LeadsFiltersProps<TData>) {
  const { leads } = useReach();

  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Garde le champ de recherche synchronisé si le filtre change en dehors de ce
  // composant (bouton Réinitialiser, navigation avant/arrière sur un lien partagé).
  const externalGlobalFilter = (table.getState().globalFilter as string) ?? '';
  useEffect(() => {
    setSearchQuery(externalGlobalFilter);
  }, [externalGlobalFilter]);

  const niches = Array.from(new Set(leads.map((l) => l.niche).filter(Boolean)));
  const activeMembers = workspaceMembers.filter((m) => m.member_user_id);

  const statusFilter = (table.getColumn('status')?.getFilterValue() as string) || 'all';
  const tempFilter = (table.getColumn('temperature')?.getFilterValue() as string) || 'all';
  const nicheFilter = (table.getColumn('niche')?.getFilterValue() as string) || 'all';
  const ownerFilter = (table.getColumn('assignedTo')?.getFilterValue() as string) || 'all';
  const enrichFilter = (table.getColumn('enrichmentStatus')?.getFilterValue() as string) || 'all';

  const currentSort = table.getState().sorting[0];
  const sortValue = currentSort ? `${currentSort.id}:${currentSort.desc ? 'desc' : 'asc'}` : 'intentScore:desc';

  const applySearch = useCallback((val: string) => {
    table.setGlobalFilter(val);
  }, [table]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applySearch(val), 220);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    table.setGlobalFilter('');
  };

  const hasActiveFilters =
    showAssignedToMe ||
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    tempFilter !== 'all' ||
    nicheFilter !== 'all' ||
    ownerFilter !== 'all' ||
    enrichFilter !== 'all';

  const handleClearFilters = () => {
    handleClearSearch();
    table.getColumn('status')?.setFilterValue(undefined);
    table.getColumn('temperature')?.setFilterValue(undefined);
    table.getColumn('niche')?.setFilterValue(undefined);
    table.getColumn('assignedTo')?.setFilterValue(undefined);
    table.getColumn('enrichmentStatus')?.setFilterValue(undefined);
  };

  const extraFilters: FilterGroup[] = [
    {
      key: 'niche',
      label: 'Industrie',
      value: nicheFilter,
      onChange: (val) => table.getColumn('niche')?.setFilterValue(val === 'all' ? undefined : val),
      options: [
        { id: 'all', label: 'Toutes industries' },
        ...niches.map((n) => ({ id: n, label: n })),
      ],
    },
    {
      key: 'owner',
      label: 'Owner',
      value: ownerFilter,
      onChange: (val) => table.getColumn('assignedTo')?.setFilterValue(val === 'all' ? undefined : val),
      options: [
        { id: 'all', label: 'Tous les owners' },
        ...activeMembers.map((m) => ({ id: m.member_user_id as string, label: m.profile?.full_name || m.email.split('@')[0] })),
      ],
    },
    {
      key: 'temperature',
      label: 'Température',
      value: tempFilter,
      onChange: (val) => table.getColumn('temperature')?.setFilterValue(val === 'all' ? undefined : val),
      options: [
        { id: 'all', label: 'Toutes températures' },
        { id: 'Hot', label: '🔥 Chaud' },
        { id: 'Warm', label: '☀️ Tiède' },
        { id: 'Cold', label: '❄️ Froid' },
      ],
    },
    {
      key: 'enrichment',
      label: 'Enrichissement',
      value: enrichFilter,
      onChange: (val) => table.getColumn('enrichmentStatus')?.setFilterValue(val === 'all' ? undefined : val),
      options: [
        { id: 'all', label: 'Tout statut' },
        { id: 'enriched', label: 'Enrichi' },
        { id: 'pending', label: 'À valider' },
        { id: 'none', label: 'Non enrichi' },
      ],
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fafaf8] py-1 text-left">
      {/* Unified Filter Bar with integrated Search */}
      <UnifiedFilterBar
        className="flex-1 min-w-[280px]"
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)}
        statusOptions={[
          { id: 'all', label: 'Tous les statuts' },
          { id: 'New', label: 'Nouveau' },
          { id: 'Contacted', label: 'Contacté' },
          { id: 'Meeting Booked', label: 'RDV Fixé' },
          { id: 'Proposal Sent', label: 'Proposition' },
          { id: 'Negotiation', label: 'Négociation' },
          { id: 'Won', label: 'Gagné' },
          { id: 'Lost', label: 'Perdu' },
        ]}
        extraFilters={extraFilters}
        sortBy={sortValue}
        onSortChange={(val) => {
          const [id, dir] = val.split(':');
          table.setSorting([{ id, desc: dir === 'desc' }]);
        }}
        sortOptions={SORT_OPTIONS.map(opt => ({ id: opt.value, label: opt.label }))}
      />

      {/* Control buttons right side */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Columns visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs bg-white border-[#e5e5e0]">
              <Columns3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Colonnes</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[#8A9098]">Colonnes visibles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                className="text-xs"
                onSelect={(e) => e.preventDefault()}
              >
                {COLUMN_LABELS[column.id] || column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Localisation — active la colonne Visitable */}
        {onRequestLocation && (
          <button
            onClick={onRequestLocation}
            disabled={locating}
            title={userLocation ? 'Position activée' : 'Activer la position pour voir les prospects visitables'}
            className={cn(
              'flex items-center justify-center h-9 w-9 rounded-xl border transition-colors cursor-pointer shrink-0',
              userLocation
                ? 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20'
                : 'bg-white border-[#e5e5e0] text-[#8A9098] hover:text-[#14171A]'
            )}
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPinned className="h-3.5 w-3.5" />}
          </button>
        )}

        {/* Assigned to me toggle */}
        <button
          onClick={onToggleAssignedToMe}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 text-xs font-bold rounded-xl border transition-colors cursor-pointer',
            showAssignedToMe
              ? 'bg-[#167f5b] text-white border-[#167f5b] hover:bg-[#0f6b4c]'
              : 'bg-white border-[#e5e5e0] text-[#8A9098] hover:text-[#14171A]'
          )}
        >
          <User className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Mes leads</span>
        </button>

        {/* Reset Filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              handleClearFilters();
              if (showAssignedToMe) onToggleAssignedToMe();
            }}
            className="h-9 px-3 text-xs gap-1.5 text-[#8A9098] hover:text-[#14171A]"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
        )}

        {/* View Switcher (Table vs Gallery) */}
        <div className="flex items-center bg-[#f4f4f3] p-0.5 rounded-xl border border-[#e5e5e0] shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            title="Vue Tableau"
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              viewMode === 'list' ? "bg-white text-[#14171A] shadow-xs" : "text-[#8A9098] hover:text-[#14171A]"
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('gallery')}
            title="Vue Catalogue (Photos)"
            className={cn(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              viewMode === 'gallery' ? "bg-white text-[#14171A] shadow-xs" : "text-[#8A9098] hover:text-[#14171A]"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default LeadsFilters;
