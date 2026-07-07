'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { BookOpen, ChevronRight, X, CheckCircle2, Loader2, Phone, Mail, FileText, User, Play, BarChart2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

import { PLAYBOOKS, CATEGORY_COLORS, CHANNEL_ICONS, type Playbook, type PlaybookSequenceStep } from '../data';

export function PlaybooksRoot() {
  const router = useRouter();
  const { activeWorkspace } = useReach();
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [runs, setRuns] = useState<Array<{ id: string; playbook_id: string; status: string; created_at: string; campaign_id: string }>>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const categories = ['Tous', ...Array.from(new Set(PLAYBOOKS.map((p) => p.category)))];

  const filtered =
    activeCategory === 'Tous'
      ? PLAYBOOKS
      : PLAYBOOKS.filter((p) => p.category === activeCategory);

  const fetchRuns = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setRunsLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/playbook-runs?workspace_id=${activeWorkspace.id}`));
      if (res.ok) setRuns(await res.json());
    } catch {
      // silent
    } finally {
      setRunsLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleDeploy = (playbook: Playbook) => {
    router.push(`/playbooks/${playbook.id}`);
  };

  // Count runs per playbook
  const runCountMap: Record<string, number> = {};
  runs.forEach((r) => {
    runCountMap[r.playbook_id] = (runCountMap[r.playbook_id] || 0) + 1;
  });
  const recentRuns = [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full p-3 sm:p-4 md:p-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#059669]" />
            <h1 className="text-base font-bold text-[#26251e]">Playbooks</h1>
          </div>
          <p className="text-xs text-[#7a7a76] mt-0.5">
            {PLAYBOOKS.length} stratégies de prospection prêtes à l&apos;emploi — cliquez pour lancer un wizard guidé.
          </p>
        </div>

        {/* Recent runs */}
        {recentRuns.length > 0 && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="h-3.5 w-3.5 text-[#7a7a76]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Dernières exécutions</span>
            </div>
            <div className="space-y-1.5">
              {recentRuns.map((run) => {
                const pb = PLAYBOOKS.find((p) => p.id === run.playbook_id);
                return (
                  <div key={run.id} className="flex items-center gap-3 text-xs">
                    <span className="text-base shrink-0">{pb?.emoji ?? '📋'}</span>
                    <span className="flex-1 font-medium text-[#26251e] truncate">{pb?.title ?? run.playbook_id}</span>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                      run.status === 'done' ? 'text-[#059669] bg-[#059669]/10 border-[#059669]/20' :
                      run.status === 'running' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                      'text-red-600 bg-red-50 border-red-200'
                    )}>
                      {run.status === 'done' ? 'Terminé' : run.status === 'running' ? 'En cours' : 'Erreur'}
                    </span>
                    <span className="text-[10px] text-[#7a7a76] shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(run.created_at).toLocaleDateString('fr-CA')}
                    </span>
                    {run.campaign_id && (
                      <Link href={`/campaigns/${run.campaign_id}`} className="text-[10px] text-[#059669] underline shrink-0">Campagne</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                activeCategory === cat
                  ? 'bg-[#26251e] text-white border-[#26251e]'
                  : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#26251e] hover:text-[#26251e]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((pb) => (
            <div
              key={pb.id}
              className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-3 hover:border-[#059669]/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl shrink-0 mt-0.5">{pb.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#26251e] leading-snug">{pb.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={cn(
                          'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          CATEGORY_COLORS[pb.category] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        )}
                      >
                        {pb.category}
                      </span>
                      {runCountMap[pb.id] > 0 && (
                        <span className="text-[10px] text-[#7a7a76] flex items-center gap-0.5">
                          <Play className="h-2.5 w-2.5" />
                          {runCountMap[pb.id]} run{runCountMap[pb.id] > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#7a7a76] leading-relaxed">{pb.description}</p>

              <div className="text-[10px] text-[#7a7a76]">
                <span className="font-semibold text-[#26251e]">Budget cible :</span>{' '}
                {pb.icp.budget}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => router.push(`/playbooks/${pb.id}/view`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Voir les détails
                </button>
                <button
                  onClick={() => handleDeploy(pb)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Lancer le wizard
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
