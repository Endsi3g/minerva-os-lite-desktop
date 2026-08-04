'use client';

import React from 'react';
import { Layers, Lock, Target, Mail, MapPin, BarChart3, type LucideIcon } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { PACKS, ALL_PACKS, DEFAULT_ENABLED_PACKS, type PackId } from '@/lib/packs';
import { cn } from '@/lib/utils';

const PACK_ICONS: Record<string, LucideIcon> = { Target, Mail, MapPin, BarChart3 };

// Plateforme & packs (PRD v12, Sprint 1) — active/désactive des capacités par
// workspace (Acquisition, Outreach, Terrain, Analytics & Growth). Contrôle la
// visibilité de la sidebar via lib/packs.ts + app/(app)/layout.tsx
// (canShowNavItem). Tout est activé par défaut.
export function PlatformRoot() {
  const { activeWorkspace, updateWorkspace } = useReach();

  const enabledPacks: string[] = activeWorkspace?.enabled_packs ?? DEFAULT_ENABLED_PACKS;
  const canEdit = !!activeWorkspace?.isOwner;

  const togglePack = (packId: PackId) => {
    if (!activeWorkspace || !canEdit) return;
    const next = enabledPacks.includes(packId)
      ? enabledPacks.filter((p) => p !== packId)
      : [...enabledPacks, packId];
    updateWorkspace(activeWorkspace.id, { enabled_packs: next });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#059669]" />
          <h1 className="text-base font-bold text-[#26251e]">Plateforme</h1>
        </div>
        <p className="text-xs text-[#7a7a76]">
          Active ou désactive des capacités pour ce workspace. Un pack désactivé masque ses pages de la navigation
          sans supprimer aucune donnée — tu peux le réactiver à tout moment.
        </p>

        {!canEdit && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-3 text-xs">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Seul le propriétaire du workspace peut activer/désactiver des packs.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ALL_PACKS.map((packId) => {
            const pack = PACKS[packId];
            const enabled = enabledPacks.includes(packId);
            const Icon = PACK_ICONS[pack.icon] ?? Layers;
            return (
              <div key={packId} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#059669] shrink-0" />
                    <span className="text-sm font-bold text-[#26251e]">{pack.label}</span>
                  </div>
                  <button
                    onClick={() => togglePack(packId)}
                    disabled={!canEdit}
                    className={cn(
                      'relative w-10 h-5.5 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed',
                      enabled ? 'bg-[#059669]' : 'bg-[#e5e5e0]'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform shadow-sm',
                      enabled && 'translate-x-4.5'
                    )} />
                  </button>
                </div>
                <p className="text-[10px] text-[#7a7a76]">{pack.description}</p>
                <div className="flex flex-wrap gap-1 pt-1 border-t border-[#e5e5e0]/60">
                  {pack.routes.map((r) => (
                    <span key={r} className="text-[9px] font-mono text-[#7a7a76] bg-[#f4f4f3] rounded px-1.5 py-0.5">{r}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
