'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-helper';
import { CheckCircle2, AlertTriangle, Database, Users, CheckSquare, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

interface WsInfo {
  id: string;
  name: string;
  isOwner: boolean;
  leadsCount: number;
  teamCount: number;
  tasksCount: number;
  created_at: string;
}

interface AuditResult {
  userId: string;
  currentActiveWorkspaceId: string | null;
  workspaces: WsInfo[];
  recommended: string | null;
}

export function RecoveryRoot() {
  const router = useRouter();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/recovery'));
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setAudit(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function switchTo(workspaceId: string) {
    setSwitching(workspaceId);
    try {
      const res = await fetch(getApiUrl('/api/recovery'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setDone(true);
      // Reload app after 1.5s
      setTimeout(() => { router.replace('/today'); window.location.href = '/today'; }, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSwitching(null);
    }
  }

  if (done) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#f7f7f5]">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-[#059669] mx-auto" />
          <p className="text-lg font-bold text-[#26251e]">Workspace restauré !</p>
          <p className="text-sm text-[#7a7a76]">Redirection vers l'accueil…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f7f7f5] px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#d97706] flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#26251e]">Récupération de données</h1>
            <p className="text-xs text-[#7a7a76] mt-0.5">
              Sélectionne le workspace qui contient tes leads et membres d'équipe.
              Tes données ne sont pas perdues — elles sont dans l'un de ces workspaces.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            <p className="font-bold mb-1">Erreur</p>
            <p>{error}</p>
            <button onClick={load} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700">
              <RefreshCw className="h-3 w-3" /> Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* Current workspace info */}
            {audit?.currentActiveWorkspaceId && (
              <div className="bg-white rounded-2xl border border-[#e5e5e0] p-4 text-xs text-[#7a7a76]">
                <span className="font-bold text-[#26251e]">Workspace actif : </span>
                <code className="bg-[#f0f0ed] px-1.5 py-0.5 rounded text-[10px]">{audit.currentActiveWorkspaceId}</code>
              </div>
            )}

            {/* Workspace list */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
                {audit?.workspaces.length ?? 0} workspace(s) trouvé(s)
              </p>

              {(audit?.workspaces ?? []).map((ws) => {
                const isCurrent = ws.id === audit?.currentActiveWorkspaceId;
                const isRecommended = ws.id === audit?.recommended;
                const hasData = ws.leadsCount > 0 || ws.teamCount > 0;
                const isSwitching = switching === ws.id;

                return (
                  <div
                    key={ws.id}
                    className={`bg-white rounded-2xl border p-4 transition-all ${
                      isRecommended && hasData
                        ? 'border-[#059669] ring-1 ring-[#059669]/20'
                        : 'border-[#e5e5e0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-bold text-[#26251e]">{ws.name}</p>
                          {isRecommended && hasData && (
                            <span className="text-[9px] font-bold bg-[#059669] text-white px-2 py-0.5 rounded-full">
                              RECOMMANDÉ
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] font-bold bg-[#e5e5e0] text-[#555552] px-2 py-0.5 rounded-full">
                              ACTIF
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ws.isOwner ? 'bg-[#2563eb]/10 text-[#2563eb]' : 'bg-[#7c3aed]/10 text-[#7c3aed]'}`}>
                            {ws.isOwner ? 'PROPRIÉTAIRE' : 'MEMBRE'}
                          </span>
                        </div>

                        <code className="text-[10px] text-[#7a7a76]">{ws.id}</code>

                        {/* Data counts */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-[11px] text-[#555552]">
                            <Database className={`h-3 w-3 ${ws.leadsCount > 0 ? 'text-[#059669]' : 'text-[#c5c5c0]'}`} />
                            <span className={ws.leadsCount > 0 ? 'font-bold text-[#059669]' : ''}>
                              {ws.leadsCount} leads
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#555552]">
                            <Users className={`h-3 w-3 ${ws.teamCount > 0 ? 'text-[#2563eb]' : 'text-[#c5c5c0]'}`} />
                            <span className={ws.teamCount > 0 ? 'font-bold text-[#2563eb]' : ''}>
                              {ws.teamCount} membres
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#555552]">
                            <CheckSquare className={`h-3 w-3 ${ws.tasksCount > 0 ? 'text-[#7c3aed]' : 'text-[#c5c5c0]'}`} />
                            <span>{ws.tasksCount} tâches</span>
                          </div>
                        </div>
                      </div>

                      {/* Switch button */}
                      {!isCurrent && (
                        <button
                          onClick={() => switchTo(ws.id)}
                          disabled={!!switching}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors shrink-0 disabled:opacity-50"
                          style={{ backgroundColor: '#059669' }}
                          onMouseEnter={e => !switching && (e.currentTarget.style.backgroundColor = '#047857')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#059669')}
                        >
                          {isSwitching ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>Activer <ArrowRight className="h-3.5 w-3.5" /></>
                          )}
                        </button>
                      )}
                      {isCurrent && (
                        <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Instruction */}
            <div className="bg-[#fff8e6] border border-[#d97706]/20 rounded-2xl p-4 text-xs text-[#7a7a76]">
              <p className="font-bold text-[#26251e] mb-1">Comment lire ce tableau</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Le workspace avec le plus de <strong>leads</strong> est celui qui contient tes données.</li>
                <li>Clique <strong>Activer</strong> pour y basculer immédiatement.</li>
                <li>Tes données ne sont jamais supprimées — elles sont juste dans un autre workspace.</li>
              </ul>
            </div>

            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Rafraîchir l'audit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
