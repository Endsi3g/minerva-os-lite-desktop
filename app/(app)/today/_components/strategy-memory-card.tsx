'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

interface StrategyMemoryRow {
  id: string;
  memory_type: 'timing' | 'channel' | 'campaign' | 'sequence' | 'objection';
  niche?: string | null;
  insight: string;
  confidence: number;
  sample_size: number;
}

const TYPE_LABELS: Record<string, string> = {
  timing: 'Timing',
  channel: 'Canal',
  campaign: 'Campagne',
  sequence: 'Séquence',
  objection: 'Objection',
};

const TYPE_STYLES: Record<string, string> = {
  timing: 'bg-[#f3e8ff] text-[#7c3aed]',
  channel: 'bg-[#dbeafe] text-[#1d4ed8]',
  campaign: 'bg-[#dcfce7] text-[#059669]',
  sequence: 'bg-[#fef9c3] text-[#a16207]',
  objection: 'bg-[#fee2e2] text-[#dc2626]',
};

export function StrategyMemoryCard() {
  const { activeWorkspace } = useReach();
  const [learnings, setLearnings] = useState<StrategyMemoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showReco, setShowReco] = useState(false);
  const [recoLoading, setRecoLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

  const fetchLearnings = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(
        getApiUrl(`/api/strategy/memory?workspace_id=${activeWorkspace.id}`)
      );
      if (res.ok) {
        const data = await res.json();
        setLearnings(data.learnings ?? []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchLearnings();
  }, [fetchLearnings]);

  const handleRecalculate = async () => {
    if (!activeWorkspace || recalculating) return;
    setRecalculating(true);
    try {
      const res = await fetch(getApiUrl('/api/strategy/memory'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchLearnings();
        toast.success(`${data.updated} apprentissages recalculés`);
      } else {
        toast.error('Erreur lors du recalcul');
      }
    } catch {
      toast.error('Erreur lors du recalcul');
    } finally {
      setRecalculating(false);
    }
  };

  const handleToggleReco = async () => {
    if (showReco) {
      setShowReco(false);
      return;
    }
    setShowReco(true);
    if (recommendations || !activeWorkspace) return;
    setRecoLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/strategy/learnings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations ?? '');
      } else {
        toast.error('Erreur lors de la génération des recommandations');
        setShowReco(false);
      }
    } catch {
      toast.error('Erreur lors de la génération des recommandations');
      setShowReco(false);
    } finally {
      setRecoLoading(false);
    }
  };

  const top5 = learnings.slice(0, 5);

  return (
    <div className="bg-white border border-[#e5e5e0] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#059669]" />
          <h2 className="text-xs font-bold text-[#26251e] uppercase tracking-wider">
            Mémoire stratégique
          </h2>
          {learnings.length > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
              {learnings.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-1.5 rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] disabled:opacity-60 px-2.5 py-1.5 text-[11px] font-semibold text-[#26251e] transition-colors"
        >
          {recalculating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Recalculer
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-[#f4f4f3] animate-pulse" />
          ))}
        </div>
      ) : top5.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Brain className="h-8 w-8 text-[#e5e5e0]" />
          <p className="text-xs text-[#7a7a76]">
            Aucun apprentissage disponible — calculez les premiers apprentissages pour piloter votre stratégie.
          </p>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] disabled:opacity-60 px-3 py-2 text-xs font-bold text-white transition-colors"
          >
            {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Calculer les premiers apprentissages
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {top5.map((item) => (
            <div key={item.id} className="rounded-lg border border-[#e5e5e0] p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                    TYPE_STYLES[item.memory_type] ?? 'bg-[#f4f4f3] text-[#555552]'
                  )}
                >
                  {TYPE_LABELS[item.memory_type] ?? item.memory_type}
                </span>
                {item.niche && (
                  <span className="text-[10px] text-[#7a7a76] truncate">{item.niche}</span>
                )}
              </div>
              <p className="text-[11px] text-[#26251e] leading-relaxed">{item.insight}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1 bg-[#f4f4f3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(item.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#a3a197] shrink-0">
                  sur {item.sample_size} contacts
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={handleToggleReco}
            className="w-full flex items-center justify-between rounded-lg border border-[#e5e5e0] hover:bg-[#f4f4f3] px-3 py-2.5 text-[11px] font-semibold text-[#059669] transition-colors"
          >
            <span>Voir les recommandations IA →</span>
            {showReco ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showReco && (
            <div className="rounded-lg border border-[#e5e5e0] bg-[#fafaf8] p-4">
              {recoLoading ? (
                <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Génération des recommandations en cours…
                </div>
              ) : recommendations ? (
                <div className="text-[11px] text-[#26251e] leading-relaxed whitespace-pre-wrap">
                  {recommendations}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
