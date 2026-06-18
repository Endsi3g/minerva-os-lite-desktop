'use client';

import React from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { BarChart2, ChevronRight, Users, Trophy } from 'lucide-react';

export function ClientReportsRoot() {
  const { workspacesList, leads, activeWorkspace } = useReach();

  // leads in context are already filtered by the active workspace.
  // For per-workspace stats on the list page we use total leads from context.
  const getStats = (wsId: string) => {
    const isActive = activeWorkspace?.id === wsId;
    const wsLeads = isActive ? leads : [];
    return {
      total: wsLeads.length,
      won: wsLeads.filter((l) => l.status === 'Won').length,
    };
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-[#059669]" />
            <h1 className="text-base font-bold text-[#26251e]">Rapports clients</h1>
          </div>
          <p className="text-xs text-[#7a7a76] mt-0.5">
            Vue portail par workspace — KPIs réels basés sur Supabase
          </p>
        </div>

        {/* Empty state */}
        {workspacesList.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#e5e5e0]">
            <BarChart2 className="h-8 w-8 text-[#7a7a76]/40" />
            <p className="text-sm font-bold text-[#26251e]">Aucun workspace</p>
            <p className="text-xs text-[#7a7a76] max-w-xs">
              Créez un workspace pour voir les rapports clients.
            </p>
          </div>
        )}

        {/* Workspace list */}
        <div className="grid gap-3 sm:grid-cols-2">
          {workspacesList.map((ws) => {
            const stats = getStats(ws.id);
            return (
              <Link
                key={ws.id}
                href={`/client-reports/${ws.id}`}
                className="rounded-xl border border-[#e5e5e0] bg-white p-5 hover:border-[#059669]/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {ws.logo_base64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ws.logo_base64}
                        alt=""
                        className="w-8 h-8 object-contain rounded-md border border-[#e5e5e0] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center font-bold text-sm text-[#059669] shrink-0">
                        {ws.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#26251e] truncate">{ws.name}</p>
                      {ws.description && (
                        <p className="text-[10px] text-[#7a7a76] truncate">{ws.description}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#7a7a76] group-hover:text-[#059669] transition-colors shrink-0 mt-0.5" />
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#7a7a76]" />
                    <span className="text-xs font-semibold text-[#26251e]">{stats.total}</span>
                    <span className="text-[10px] text-[#7a7a76]">leads</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-[#059669]" />
                    <span className="text-xs font-semibold text-[#26251e]">{stats.won}</span>
                    <span className="text-[10px] text-[#7a7a76]">gagnés</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
