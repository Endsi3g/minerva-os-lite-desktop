'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users2, CheckCircle2, Lightbulb, Rocket, Loader2 } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';

interface TeamOverview {
  id: 'growth' | 'outreach' | 'terrain';
  name: string;
  description: string;
  color: string;
  actionsCount: number;
  executedCount: number;
  suggestedCount: number;
  leadsTouched: number;
  programsTouched: number;
  autonomyLevels: Record<string, string>;
}

const AUTONOMY_LABELS: Record<string, string> = {
  off: 'Désactivé',
  suggest: 'Suggère',
  prepare: 'Prépare',
  act_with_approval: 'Agit (avec accord)',
  auto: 'Autonome',
};

// Phase 4 des Programmes de croissance — étiquette l'agent autonome unique
// existant en 3 "équipes" nommées (Growth / Outreach & Inbox / Terrain) pour
// répondre à : qui a fait quoi, dans quel programme, avec quel niveau
// d'autonomie, et quel impact. Ne remplace pas le journal détaillé déjà
// présent dans /today (onglet Pilotage) — sert de vue d'ensemble haut niveau.
export function AgentTeamsOverview() {
  const { activeWorkspace } = useReach();
  const [teams, setTeams] = useState<TeamOverview[] | null>(null);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    let cancelled = false;
    fetch(getApiUrl(`/api/agents/team-overview?workspace_id=${activeWorkspace.id}`))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (!cancelled && data?.teams) setTeams(data.teams); })
      .catch(() => { if (!cancelled) setTeams([]); });
    return () => { cancelled = true; };
  }, [activeWorkspace?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
        <Users2 className="h-3.5 w-3.5" />
        <span>Équipe d'agents Minerva</span>
        <span className="text-[10px] lowercase font-normal">— 7 derniers jours</span>
      </div>

      {teams === null ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-[#7a7a76]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#26251e]">{team.name}</span>
                <span
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                  style={{ color: team.color, backgroundColor: `${team.color}15` }}
                >
                  {team.actionsCount} action{team.actionsCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[10px] text-[#7a7a76]">{team.description}</p>

              <div className="flex items-center gap-3 text-[10px] text-[#555552]">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" style={{ color: team.color }} />{team.executedCount} exécutées</span>
                <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3 text-[#7a7a76]" />{team.suggestedCount} suggérées</span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-[#7a7a76]">
                <Rocket className="h-3 w-3" />
                {team.leadsTouched} lead{team.leadsTouched !== 1 ? 's' : ''} touché{team.leadsTouched !== 1 ? 's' : ''}
                {team.programsTouched > 0 && (
                  <Link href="/campaigns" className="font-bold text-[#059669] hover:underline">
                    · {team.programsTouched} programme{team.programsTouched !== 1 ? 's' : ''}
                  </Link>
                )}
              </div>

              <div className="pt-2 border-t border-[#e5e5e0]/60 flex flex-wrap gap-1">
                {Object.entries(team.autonomyLevels).map(([key, level]) => (
                  <span
                    key={key}
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
                      level === 'off' ? 'border-[#e5e5e0] text-[#7a7a76]' : 'border-[#059669]/20 text-[#059669] bg-[#059669]/5'
                    )}
                  >
                    {AUTONOMY_LABELS[level] ?? level}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-right">
        <Link href="/today?tab=pilotage" className="text-[10px] font-bold text-[#059669] hover:underline">
          Voir le journal détaillé →
        </Link>
      </div>
    </div>
  );
}
