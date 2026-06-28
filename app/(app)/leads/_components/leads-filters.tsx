'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Table as TableType } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, User, X, Clock } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'minerva_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  const prev = getRecentSearches().filter(s => s !== trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([trimmed, ...prev].slice(0, MAX_RECENT)));
}

interface LeadsFiltersProps<TData> {
  table: TableType<TData>;
  showAssignedToMe: boolean;
  onToggleAssignedToMe: () => void;
}

export function LeadsFilters<TData>({ table, showAssignedToMe, onToggleAssignedToMe }: LeadsFiltersProps<TData>) {
  const { leads } = useReach();

  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const niches = Array.from(new Set(leads.map((l) => l.niche).filter(Boolean)));

  const statusFilter = (table.getColumn('status')?.getFilterValue() as string) || 'all';
  const tempFilter = (table.getColumn('temperature')?.getFilterValue() as string) || 'all';
  const nicheFilter = (table.getColumn('niche')?.getFilterValue() as string) || 'all';

  const applySearch = useCallback((val: string) => {
    table.setGlobalFilter(val);
    if (val.trim().length >= 2) {
      saveRecentSearch(val);
      setRecentSearches(getRecentSearches());
    }
  }, [table]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applySearch(val), 220);
  };

  const handleSelectRecent = (term: string) => {
    setSearchQuery(term);
    applySearch(term);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClearRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = getRecentSearches().filter(s => s !== term);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    setRecentSearches(updated);
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
    nicheFilter !== 'all';

  const handleClearFilters = () => {
    handleClearSearch();
    table.getColumn('status')?.setFilterValue(undefined);
    table.getColumn('temperature')?.setFilterValue(undefined);
    table.getColumn('niche')?.setFilterValue(undefined);
  };

  const showDropdown = isFocused && !searchQuery && recentSearches.length > 0;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-2 bg-background">
      {/* Search Input (Left side) */}
      <div className="relative flex-1 max-w-sm" ref={dropdownRef}>
        <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none">
          <Search className="h-3.5 w-3.5" />
        </span>
        <Input
          ref={inputRef}
          placeholder="Rechercher par business, contact..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { handleClearSearch(); inputRef.current?.blur(); }
          }}
          className="pl-9 h-8.5 text-xs bg-card"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Effacer la recherche"
            title="Effacer la recherche"
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Recent searches dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e0] rounded-lg shadow-md z-30 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-[#7a7a76] uppercase tracking-wider">Recherches récentes</p>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleSelectRecent(term)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-[#26251e] hover:bg-[#f4f4f3] transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-[#7a7a76] shrink-0" />
                  <span className="truncate">{term}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleClearRecent(term, e)}
                  className="opacity-0 group-hover:opacity-100 text-[#7a7a76] hover:text-[#26251e] transition-opacity"
                  aria-label={`Supprimer "${term}"`}
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Select Filters (Right side) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) =>
            table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)
          }
        >
          <SelectTrigger className="h-8 min-w-[148px] text-xs bg-card">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
            <SelectItem value="New" className="text-xs">🟢 Nouveau</SelectItem>
            <SelectItem value="Contacted" className="text-xs">🟡 Contacté</SelectItem>
            <SelectItem value="Meeting Booked" className="text-xs">🟣 RDV Fixé</SelectItem>
            <SelectItem value="Proposal Sent" className="text-xs">🟪 Proposition envoyée</SelectItem>
            <SelectItem value="Negotiation" className="text-xs">🟠 Négociation</SelectItem>
            <SelectItem value="Won" className="text-xs">🔵 Gagné</SelectItem>
            <SelectItem value="Lost" className="text-xs">🔴 Perdu</SelectItem>
          </SelectContent>
        </Select>

        {/* Temperature Filter */}
        <Select
          value={tempFilter}
          onValueChange={(val) =>
            table.getColumn('temperature')?.setFilterValue(val === 'all' ? undefined : val)
          }
        >
          <SelectTrigger className="h-8 min-w-[160px] text-xs bg-card">
            <SelectValue placeholder="Toutes températures" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Toutes températures</SelectItem>
            <SelectItem value="Hot" className="text-xs">🔥 Chaud (Hot)</SelectItem>
            <SelectItem value="Warm" className="text-xs">☀️ Tiède (Warm)</SelectItem>
            <SelectItem value="Cold" className="text-xs">❄️ Froid (Cold)</SelectItem>
          </SelectContent>
        </Select>

        {/* Niche Filter */}
        <Select
          value={nicheFilter}
          onValueChange={(val) =>
            table.getColumn('niche')?.setFilterValue(val === 'all' ? undefined : val)
          }
        >
          <SelectTrigger className="h-8 min-w-[152px] text-xs bg-card">
            <SelectValue placeholder="Tous les secteurs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les secteurs</SelectItem>
            {niches.map((niche) => (
              <SelectItem key={niche} value={niche} className="text-xs">
                {niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assigned to me toggle */}
        <button
          onClick={onToggleAssignedToMe}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md border transition-colors',
            showAssignedToMe
              ? 'bg-[#059669] text-white border-[#059669] hover:bg-[#047857]'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <User className="h-3.5 w-3.5" />
          <span>Mes leads</span>
        </button>

        {/* Reset Filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              handleClearFilters();
              if (showAssignedToMe) onToggleAssignedToMe();
            }}
            className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <span>Réinitialiser</span>
          </Button>
        )}
      </div>
    </div>
  );
}
export default LeadsFilters;
