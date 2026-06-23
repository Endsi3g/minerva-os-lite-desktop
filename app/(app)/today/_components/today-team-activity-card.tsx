'use client';

import React, { useMemo } from 'react';
import { Users, UserPlus, Trophy, CheckSquare, FileEdit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';

interface ActivityEntry {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  text: string;
  ts: number;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

// Genuine team activity feed — aggregates real workspace events (all leads/tasks are
// workspace-scoped, i.e. shared by the team) into a single chronological feed.
export function TodayTeamActivityCard() {
  const { leads, tasks } = useReach();

  const entries = useMemo<ActivityEntry[]>(() => {
    const out: ActivityEntry[] = [];

    for (const l of leads) {
      if (l.status === 'Won' && l.updatedAt) {
        out.push({
          id: `won-${l.id}`,
          icon: Trophy,
          color: '#059669',
          text: `${l.businessName} — deal gagné${l.owner && l.owner !== 'Moi' ? ` par ${l.owner}` : ''}`,
          ts: new Date(l.updatedAt).getTime(),
        });
      }
      if (l.createdAt) {
        out.push({
          id: `new-${l.id}`,
          icon: UserPlus,
          color: '#059669',
          text: `Nouveau lead : ${l.businessName}${l.city ? ` (${l.city})` : ''}`,
          ts: new Date(l.createdAt).getTime(),
        });
      }
    }

    for (const t of tasks) {
      if (t.completed && t.dueDate) {
        out.push({
          id: `task-${t.id}`,
          icon: t.category === 'Meeting' ? FileEdit : CheckSquare,
          color: '#7a7a76',
          text: `Tâche terminée : ${t.title}`,
          ts: new Date(t.dueDate).getTime(),
        });
      }
    }

    return out
      .filter(e => !Number.isNaN(e.ts))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 8);
  }, [leads, tasks]);

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Activité de l&apos;équipe</CardTitle>
            <CardDescription className="text-xs">Derniers événements du workspace</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {entries.length === 0 ? (
          <p className="text-xs text-[#7a7a76] py-6 text-center">Aucune activité récente.</p>
        ) : (
          <div className="space-y-2.5 mt-2">
            {entries.map(e => {
              const Icon = e.icon;
              return (
                <div key={e.id} className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${e.color}15`, color: e.color }}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#26251e] leading-snug">{e.text}</p>
                    <p className="text-[10px] text-[#7a7a76] mt-0.5">{relativeTime(e.ts)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayTeamActivityCard;
