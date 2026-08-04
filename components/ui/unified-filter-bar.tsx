'use client';

import React, { useState } from 'react';
import { Search, X, ChevronDown, Check, SlidersHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export interface FilterOption {
  id: string;
  label: string;
  dotColor?: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  options: FilterOption[];
}

export interface UnifiedFilterProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: FilterOption[];
  dateFilter?: string;
  onDateChange?: (date: string) => void;
  dateOptions?: FilterOption[];
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  sortOptions?: FilterOption[];
  /** Filtres additionnels génériques (Industrie, Owner, Enrichissement, ...) — un groupe par entrée. */
  extraFilters?: FilterGroup[];
  className?: string;
}

export function UnifiedFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions = [],
  dateFilter,
  onDateChange,
  dateOptions = [],
  sortBy,
  onSortChange,
  sortOptions = [],
  extraFilters = [],
  className,
}: UnifiedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeExtraCount = extraFilters.filter((g) => g.value && g.value !== 'all').length;

  const activeFiltersCount =
    (statusFilter && statusFilter !== 'all' ? 1 : 0) +
    (dateFilter && dateFilter !== 'all' ? 1 : 0) +
    (sortBy && sortBy !== 'default' && sortBy !== 'intentScore:desc' ? 1 : 0) +
    activeExtraCount;

  const clearAllFilters = () => {
    if (onStatusChange) onStatusChange('all');
    if (onDateChange) onDateChange('all');
    if (onSortChange) onSortChange('default');
    extraFilters.forEach((g) => g.onChange?.('all'));
    onSearchChange('');
  };

  const selectedStatus = statusOptions.find(o => o.id === statusFilter);
  const selectedDate = dateOptions.find(o => o.id === dateFilter);
  const selectedSort = sortOptions.find(o => o.id === sortBy);

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-2 text-left", className)}>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher par entreprise, contact, niche..."
              className="w-full h-9 pl-9 pr-14 bg-white border border-[#e5e5e0] rounded-xl text-xs text-[#14171A] placeholder:text-[#8A9098] shadow-xs focus:outline-none focus:border-[#167f5b] focus:ring-2 focus:ring-[#167f5b]/10 transition-all font-medium"
            />
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9098] hover:text-[#14171A] p-0.5 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#8A9098] bg-[#f4f4f3] border border-[#e5e5e0] rounded px-1 py-0.2 pointer-events-none">
                ⌘K
              </span>
            )}
          </div>

          {/* Filter Button & Popover — un seul point d'entrée, adapté au mobile */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className={cn(
                    "h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]",
                    activeFiltersCount > 0
                      ? "bg-[#167f5b] text-white border-[#167f5b] shadow-sm"
                      : "bg-white text-[#14171A] border-[#e5e5e0] hover:bg-[#fafaf8] hover:border-[#167f5b]/40"
                  )}
                >
                  <SlidersHorizontal className={cn("h-3.5 w-3.5", activeFiltersCount > 0 ? "text-white" : "text-[#167f5b]")} />
                  <span>Filtres</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-white text-[#167f5b] text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", activeFiltersCount > 0 ? "text-white/80" : "text-[#8A9098]", isOpen && "rotate-180")} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Ouvrir le panneau de filtres et tri</p>
              </TooltipContent>
            </Tooltip>

            {/* Filter Popover Menu */}
            {isOpen && (
              <>
                {/* Backdrop to close on outside click/tap — important on mobile where there's no hover-away */}
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-white border border-[#e5e5e0] rounded-2xl p-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
                <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#167f5b]" />
                    <span className="text-xs font-bold text-[#14171A]">Filtres Avancés</span>
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[10px] font-bold text-[#167f5b] hover:underline cursor-pointer"
                    >
                      Effacer tout
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                {statusOptions.length > 0 && onStatusChange && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Statut du lead</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {statusOptions.map((opt) => {
                        const isSelected = statusFilter === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onStatusChange(opt.id)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer border",
                              isSelected
                                ? "bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/30 font-bold shadow-2xs"
                                : "bg-[#fafaf8] text-[#4B5158] border-transparent hover:border-[#e5e5e0] hover:text-[#14171A]"
                            )}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? "bg-[#167f5b]" : "bg-[#8A9098]/40")} />
                              <span className="truncate">{opt.label}</span>
                            </span>
                            {isSelected && <Check className="h-3 w-3 text-[#167f5b] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Date Filter */}
                {dateOptions.length > 0 && onDateChange && (
                  <div className="space-y-2 pt-1 border-t border-[#e5e5e0]/60">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Période d'activité</label>
                    <div className="flex flex-wrap gap-1">
                      {dateOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onDateChange(opt.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border",
                            dateFilter === opt.id
                              ? "bg-[#14171A] text-white border-[#14171A]"
                              : "bg-[#fafaf8] text-[#8A9098] border-transparent hover:border-[#e5e5e0] hover:text-[#14171A]"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtres additionnels génériques (Industrie, Owner, Enrichissement...) */}
                {extraFilters.map((group) => (
                  <div key={group.key} className="space-y-2 pt-1 border-t border-[#e5e5e0]/60">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{group.label}</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.options.map((opt) => {
                        const isSelected = group.value === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => group.onChange?.(opt.id)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer border",
                              isSelected
                                ? "bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/30 font-bold shadow-2xs"
                                : "bg-[#fafaf8] text-[#4B5158] border-transparent hover:border-[#e5e5e0] hover:text-[#14171A]"
                            )}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isSelected && <Check className="h-3 w-3 text-[#167f5b] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Sort Options */}
                {sortOptions.length > 0 && onSortChange && (
                  <div className="space-y-2 pt-1 border-t border-[#e5e5e0]/60">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Ordre de tri</label>
                    <div className="space-y-1">
                      {sortOptions.map((opt) => {
                        const isSelected = sortBy === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSortChange(opt.id)}
                            className={cn(
                              "w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center justify-between cursor-pointer transition-all",
                              isSelected ? "bg-[#f4f4f3] font-bold text-[#14171A]" : "text-[#8A9098] hover:bg-[#fafaf8] hover:text-[#14171A]"
                            )}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="h-3 w-3 text-[#14171A]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active Filter Chips bar */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold text-[#8A9098]">Filtres actifs :</span>
            {selectedStatus && selectedStatus.id !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#167f5b]/10 text-[#167f5b] border border-[#167f5b]/20">
                Statut: {selectedStatus.label}
                <button onClick={() => onStatusChange && onStatusChange('all')} className="hover:opacity-75 cursor-pointer">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {selectedDate && selectedDate.id !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8A9098]/10 text-[#14171A] border border-[#e5e5e0]">
                Période: {selectedDate.label}
                <button onClick={() => onDateChange && onDateChange('all')} className="hover:opacity-75 cursor-pointer">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {extraFilters.map((group) => {
              const selected = group.options.find((o) => o.id === group.value);
              if (!selected || selected.id === 'all') return null;
              return (
                <span key={group.key} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8A9098]/10 text-[#14171A] border border-[#e5e5e0]">
                  {group.label}: {selected.label}
                  <button onClick={() => group.onChange?.('all')} className="hover:opacity-75 cursor-pointer">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
            {selectedSort && selectedSort.id !== 'default' && selectedSort.id !== 'intentScore:desc' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8A9098]/10 text-[#14171A] border border-[#e5e5e0]">
                Tri: {selectedSort.label}
                <button onClick={() => onSortChange && onSortChange('default')} className="hover:opacity-75 cursor-pointer">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
