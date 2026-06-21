'use client';

import React, { useState } from 'react';
import { Table as TableType } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, User, X } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';

interface LeadsFiltersProps<TData> {
  table: TableType<TData>;
  showAssignedToMe: boolean;
  onToggleAssignedToMe: () => void;
}

export function LeadsFilters<TData>({ table, showAssignedToMe, onToggleAssignedToMe }: LeadsFiltersProps<TData>) {
  const { leads } = useReach();
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique niches from current leads to populate filters
  const niches = Array.from(new Set(leads.map((l) => l.niche).filter(Boolean)));

  // Current values from table filters
  const statusFilter = (table.getColumn('status')?.getFilterValue() as string) || 'all';
  const tempFilter = (table.getColumn('temperature')?.getFilterValue() as string) || 'all';
  const nicheFilter = (table.getColumn('niche')?.getFilterValue() as string) || 'all';

  // Handle search text changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    table.setGlobalFilter(val);
  };

  // Check if filters are active
  const hasActiveFilters =
    showAssignedToMe ||
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    tempFilter !== 'all' ||
    nicheFilter !== 'all';

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    table.setGlobalFilter('');
    table.getColumn('status')?.setFilterValue(undefined);
    table.getColumn('temperature')?.setFilterValue(undefined);
    table.getColumn('niche')?.setFilterValue(undefined);
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-2 bg-background">
      {/* Search Input (Left side) */}
      <div className="relative flex-1 max-w-sm">
        <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
        </span>
        <Input
          placeholder="Rechercher par business, contact..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 h-8.5 text-xs bg-card"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => handleSearchChange('')}
            aria-label="Effacer la recherche"
            title="Effacer la recherche"
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Select Filters (Right side) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(val) => 
            table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)
          }
        >
          <SelectTrigger className="h-8.5 w-[130px] text-xs bg-card">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
            <SelectItem value="New" className="text-xs">🟢 Nouveau</SelectItem>
            <SelectItem value="Contacted" className="text-xs">🟡 Contacté</SelectItem>
            <SelectItem value="Meeting Booked" className="text-xs">🟣 RDV Fixé</SelectItem>
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
          <SelectTrigger className="h-8.5 w-[140px] text-xs bg-card">
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
          <SelectTrigger className="h-8.5 w-[140px] text-xs bg-card">
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
            'flex items-center gap-1.5 h-8.5 px-3 text-xs font-semibold rounded-md border transition-colors',
            showAssignedToMe
              ? 'bg-[#f54e00] text-white border-[#f54e00] hover:bg-[#e04300]'
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
            className="h-8.5 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
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
