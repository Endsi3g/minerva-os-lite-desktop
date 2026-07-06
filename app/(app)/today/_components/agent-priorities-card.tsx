'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Bot, Loader2, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';

function daysSince(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86_400_000);
}

export function AgentPrioritiesCard() {
  const { leads, activeWorkspace } = useReach();

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ drafted: number; message: string } | null>(null);

  // Top cold/warm leads eligible for an agent relance (max 5, not Won/Lost).
  // Mirrors listLeadsToFollowUp's criteria (lib/agent-tools.ts) exactly — score >= 30
  // AND inactive 7+ days (or never contacted) — so this list never shows leads the
  // "Générer les relances" button can't actually find.
  const coldLeads = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    return leads
      .filter(l => {
        if (l.status === 'Won' || l.status === 'Lost' || l.temperature === 'Hot') return false;
        if ((l.score ?? 0) < 30) return false;
        const lastActivity = l.lastActivityAt ?? l.updatedAt;
        return !lastActivity || new Date(lastActivity).getTime() < cutoff;
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5);
  }, [leads]);

  const fetchPendingCount = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(getApiUrl(`/api/outreach/approvals?workspace_id=${activeWorkspace.id}`));
      if (!res.ok) return;
      const data = await res.json();
      setPendingCount(data.drafts?.length ?? 0);
    } catch { /* ignore */ }
  }, [activeWorkspace]);

  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);

  const handleRelance = async () => {
    if (!activeWorkspace || running) return;
    setRunning(true);
    setLastResult(null);
    try {
      const res = await fetch(getApiUrl('/api/agent/relance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setLastResult({ drafted: data.drafted, message: data.message });
      if (data.drafted > 0) {
        toast.success(`${data.drafted} brouillon${data.drafted > 1 ? 's' : ''} généré${data.drafted > 1 ? 's' : ''} — à approuver dans Outreach`);
        await fetchPendingCount();
      } else {
        toast.info('Aucun lead froid à relancer pour l\'instant.');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la relance automatique');
    } finally {
      setRunning(false);
    }
  };

  const temperatureColor: Record<string, string> = {
    Hot: 'bg-[#fef2f2] text-[#dc2626]',
    Warm: 'bg-[#fff7ed] text-[#ea580c]',
    Cold: 'bg-[#eff6ff] text-[#2563eb]',
  };

  if (coldLeads.length === 0) return null;

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Priorités du jour</CardTitle>
            <CardDescription className="text-xs">Leads tièdes/froids à relancer — recommandés par l&apos;agent</CardDescription>
          </div>
        </div>
        {pendingCount !== null && pendingCount > 0 && (
          <Link href="/outreach" className="flex items-center gap-1 text-[10px] font-bold text-[#059669] hover:underline">
            <CheckCircle2 className="h-3 w-3" />
            {pendingCount} en attente
          </Link>
        )}
      </CardHeader>

      <CardContent className="px-6 pb-5 space-y-3">
        {/* Lead list */}
        <div className="space-y-1.5">
          {coldLeads.map(lead => {
            const days = daysSince(lead.lastActivityAt ?? lead.updatedAt);
            return (
              <div
                key={lead.id}
                className="flex items-center gap-2.5 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#26251e] truncate">{lead.businessName}</p>
                  {days !== null && (
                    <p className="text-[10px] text-[#7a7a76]">
                      {days === 0 ? 'Contact aujourd\'hui' : `Inactif depuis ${days}j`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${temperatureColor[lead.temperature] ?? 'bg-[#f4f4f3] text-[#555552]'}`}>
                    {lead.temperature}
                  </span>
                  <span className="text-[10px] font-bold text-[#26251e] w-7 text-right">{lead.score ?? 0}</span>
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors shrink-0"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Result feedback */}
        {lastResult && lastResult.drafted > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] shrink-0" />
            <p className="text-[11px] text-[#059669] font-medium flex-1">{lastResult.message}</p>
            <Link href="/outreach" className="text-[10px] font-bold text-[#059669] hover:underline shrink-0">
              Approuver →
            </Link>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleRelance}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#059669] bg-[#059669] px-4 py-2 text-xs font-bold text-white hover:bg-[#047857] disabled:opacity-60 transition-colors"
        >
          {running ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Générer les relances ({Math.min(coldLeads.length, 3)})
            </>
          )}
        </button>
      </CardContent>
    </Card>
  );
}

export default AgentPrioritiesCard;
