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
    Hot: 'bg-red-500/10 text-red-700 border border-red-500/20',
    Warm: 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
    Cold: 'bg-blue-500/10 text-blue-700 border border-blue-500/20',
  };

  if (coldLeads.length === 0) return null;

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-brand-accent-emerald shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold font-sans text-foreground truncate">Priorités du jour</CardTitle>
            <CardDescription className="text-xs text-muted-foreground truncate">Leads tièdes/froids à relancer — recommandés par l&apos;agent</CardDescription>
          </div>
        </div>
        {pendingCount !== null && pendingCount > 0 && (
          <Link href="/outreach" className="flex items-center gap-1 text-[10px] font-bold text-brand-accent-emerald hover:underline shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            {pendingCount} en attente
          </Link>
        )}
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Lead list */}
        <div className="space-y-1.5">
          {coldLeads.map(lead => {
            const days = daysSince(lead.lastActivityAt ?? lead.updatedAt);
            return (
              <div
                key={lead.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card hover:bg-accent/40 px-3 py-2 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{lead.businessName}</p>
                  {days !== null && (
                    <p className="text-[10px] text-muted-foreground">
                      {days === 0 ? 'Contact aujourd\'hui' : `Inactif depuis ${days}j`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${temperatureColor[lead.temperature] ?? 'bg-muted text-muted-foreground'}`}>
                    {lead.temperature}
                  </span>
                  <span className="text-[10px] font-bold text-foreground w-7 text-right">{lead.score ?? 0}</span>
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Result feedback */}
        {lastResult && lastResult.drafted > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-accent-emerald shrink-0" />
            <p className="text-[11px] text-brand-accent-emerald font-medium flex-1">{lastResult.message}</p>
            <Link href="/outreach" className="text-[10px] font-bold text-brand-accent-emerald hover:underline shrink-0">
              Approuver →
            </Link>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleRelance}
          disabled={running}
          className="w-full bg-brand-accent-emerald hover:bg-brand-accent-emeraldHover text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer text-xs"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Générer les relances ({Math.min(coldLeads.length, 3)})
            </>
          )}
        </button>
      </CardContent>
    </Card>
  );
}

export default AgentPrioritiesCard;
