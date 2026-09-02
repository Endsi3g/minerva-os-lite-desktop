'use client';

import React, { useState, useMemo } from 'react';
import { Search, Tag, Sparkles, User, Info, Check } from 'lucide-react';
import { DYNAMIC_VARIABLES, DynamicVariable } from './composer-types';
import { SubstitutionContext, substituteVariables } from './composer-utils';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VariablesSidebarProps {
  substitutionCtx: SubstitutionContext;
  onInsertVariable: (token: string) => void;
}

export function VariablesSidebar({ substitutionCtx, onInsertVariable }: VariablesSidebarProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'prospect' | 'signal' | 'sender'>('all');
  const [recentlyClicked, setRecentlyClicked] = useState<string | null>(null);

  const filteredVariables = useMemo(() => {
    return DYNAMIC_VARIABLES.filter(v => {
      const matchesCategory = categoryFilter === 'all' || v.category === categoryFilter;
      const matchesSearch = !search.trim() ||
        v.token.toLowerCase().includes(search.toLowerCase()) ||
        v.label.toLowerCase().includes(search.toLowerCase()) ||
        v.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, search]);

  const handleVariableClick = (token: string) => {
    onInsertVariable(token);
    setRecentlyClicked(token);
    setTimeout(() => setRecentlyClicked(null), 1200);
  };

  const getResolvedPreview = (token: string): string => {
    return substituteVariables(token, substitutionCtx);
  };

  const categories = [
    { id: 'all', label: 'Toutes' },
    { id: 'prospect', label: 'Prospect', icon: User },
    { id: 'signal', label: 'Signaux & IA', icon: Sparkles },
    { id: 'sender', label: 'Expéditeur', icon: Tag },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#fdfdfc] border-l border-[#e5e5e0]">
      {/* Header */}
      <div className="p-3 border-b border-[#e5e5e0] space-y-2.5 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[#059669]" />
            <h3 className="text-xs font-bold text-[#1a1f1c]">Variables dynamiques</h3>
          </div>
          <span className="text-[10px] font-semibold text-[#7a7a76] bg-[#f4f4f3] px-2 py-0.5 rounded-full">
            {filteredVariables.length} disponibles
          </span>
        </div>

        <p className="text-[11px] text-[#7a7a76] leading-tight">
          Cliquez sur un tag pour l'insérer à la position du curseur dans l'objet ou le corps.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer les balises (ex: ville, prenom)…"
            className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] text-xs text-[#1a1f1c] placeholder:text-[#9c9c96] focus:outline-none focus:border-[#059669] focus:bg-white transition-colors"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1',
                categoryFilter === cat.id
                  ? 'bg-[#059669] text-white shadow-xs'
                  : 'bg-[#f4f4f3] text-[#7a7a76] hover:bg-[#e5e5e0] hover:text-[#1a1f1c]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <TooltipProvider delayDuration={200}>
          {filteredVariables.map((v) => {
            const resolved = getResolvedPreview(v.token);
            const hasCustomVal = substitutionCtx.lead && resolved !== v.token;
            const isClicked = recentlyClicked === v.token;

            return (
              <button
                key={v.token}
                type="button"
                className={cn(
                  'w-full group relative flex flex-col p-2.5 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/60 hover:shadow-xs transition-all text-left cursor-pointer select-none',
                  isClicked && 'border-[#059669] bg-[#ecfdf5]/40'
                )}
                onClick={() => handleVariableClick(v.token)}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono font-bold text-[#059669] bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">
                      {v.token}
                    </code>
                  </div>
                  {isClicked ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#059669] animate-in fade-in">
                      <Check className="h-3 w-3" /> Inséré
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-[#7a7a76] group-hover:text-[#059669] transition-colors">
                      + Insérer
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] w-full">
                  <span className="font-semibold text-[#1a1f1c] truncate">{v.label}</span>
                  <span className="text-[10px] text-[#7a7a76] truncate">{v.description}</span>
                </div>

                {/* Resolved Live Value Preview */}
                <div className="mt-1.5 pt-1.5 border-t border-[#f4f4f3] flex items-center justify-between text-[10px] w-full">
                  <span className="text-[#9c9c96] font-medium">Valeur actuelle :</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        'font-medium truncate max-w-[170px] text-right',
                        hasCustomVal ? 'text-[#059669] font-bold' : 'text-[#7a7a76] italic'
                      )}>
                        {hasCustomVal ? resolved : `(Défaut: ${v.fallbackExample})`}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      {hasCustomVal
                        ? `Résolu pour ${substitutionCtx.lead?.businessName || 'le prospect'} : "${resolved}"`
                        : `Aucun prospect ou valeur vide. Exemple de repli : "${v.fallbackExample}"`}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </button>
            );
          })}
        </TooltipProvider>

        {filteredVariables.length === 0 && (
          <div className="py-8 text-center space-y-1 text-[#7a7a76]">
            <Info className="h-4 w-4 mx-auto opacity-50" />
            <p className="text-xs">Aucune variable ne correspond.</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-[#fafaf8] border-t border-[#e5e5e0] text-[10px] text-[#7a7a76] text-center shrink-0">
        Astuce : Les balises s'adaptent automatiquement à chaque prospect lors de l'envoi.
      </div>
    </div>
  );
}
