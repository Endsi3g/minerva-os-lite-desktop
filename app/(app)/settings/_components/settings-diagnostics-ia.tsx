'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { Activity, Zap, Clock, GitBranch, RefreshCw, Loader2, CheckCircle2, XCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GatewayStatus {
  status: string;
  stats: { total_requests: number; success_rate: number; avg_latency_ms: number; fallback_rate: number };
  last_success: string | null;
  last_request_at: string | null;
}

interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  latency_ms: number | null;
  priority: number;
  error?: string;
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Primaire', 2: 'Secondaire', 3: 'Tertiaire' };

export function SettingsDiagnosticsIA() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; content?: string; provider?: string; latency?: number; error?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, providersRes] = await Promise.all([
        fetch(getApiUrl('/api/ai/gateway/status')),
        fetch(getApiUrl('/api/ai/gateway/providers')),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviders(data.providers || []);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(getApiUrl('/api/ai/gateway/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Réponds simplement "OK gateway" pour confirmer la connexion.' }],
          max_tokens: 32,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, content: data.content, provider: data.provider, latency: data.latency_ms });
        load();
      } else {
        setTestResult({ ok: false, error: data.error || 'Échec de la requête' });
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const statCards = [
    { label: 'Requêtes', value: status?.stats.total_requests ?? 0, icon: Activity, suffix: '' },
    { label: 'Taux de succès', value: status?.stats.success_rate ?? 0, icon: CheckCircle2, suffix: '%' },
    { label: 'Latence moy.', value: status?.stats.avg_latency_ms ?? 0, icon: Clock, suffix: 'ms' },
    { label: 'Taux fallback', value: status?.stats.fallback_rate ?? 0, icon: GitBranch, suffix: '%' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#26251e] flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#059669]" />
            Diagnostics IA
          </h2>
          <p className="text-xs text-[#7a7a76] mt-0.5">État de l'AI Gateway interne, latence par provider et test de connexion.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e5e0] bg-white px-3 py-1.5 text-xs font-semibold text-[#26251e] transition-colors hover:bg-[#f4f4f3] disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-[#e5e5e0] bg-white p-3">
              <div className="flex items-center gap-1.5 text-[#7a7a76]">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="mt-2 text-xl font-bold text-[#26251e]">
                {loading ? '—' : card.value}
                <span className="text-sm font-semibold text-[#7a7a76]">{card.suffix}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Providers */}
      <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e5e0]">
          <span className="text-xs font-bold text-[#26251e]">Providers</span>
        </div>
        <div className="divide-y divide-[#e5e5e0]">
          {loading && providers.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[#7a7a76]">Chargement…</div>
          ) : providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {p.available ? (
                  <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#26251e] flex items-center gap-1.5">
                    {p.name}
                    {PRIORITY_LABELS[p.priority] && (
                      <span className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                        p.priority === 1 ? 'bg-[#059669]/10 text-[#059669]' : 'bg-[#f4f4f3] text-[#7a7a76]'
                      )}>
                        {PRIORITY_LABELS[p.priority]}
                      </span>
                    )}
                  </p>
                  {p.error && <p className="text-[10px] text-[#7a7a76]">{p.error}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.latency_ms != null && <span className="text-[10px] text-[#7a7a76]">{p.latency_ms}ms</span>}
                <span className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full',
                  p.available ? 'bg-[#059669]/10 text-[#059669]' : 'bg-red-50 text-red-600'
                )}>
                  {p.available ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test zone */}
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#26251e]">Tester la gateway</span>
          <button
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#059669] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#047857] disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {testing ? 'Test en cours…' : 'Tester la gateway'}
          </button>
        </div>

        {testResult && (
          <div className={cn(
            'rounded-lg border px-3 py-2.5 text-xs',
            testResult.ok ? 'border-[#059669]/30 bg-[#059669]/5' : 'border-red-200 bg-red-50'
          )}>
            {testResult.ok ? (
              <>
                <p className="font-semibold text-[#059669] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Réponse reçue · {testResult.provider} · {testResult.latency}ms
                </p>
                <p className="text-[#26251e] mt-1.5 whitespace-pre-wrap">{testResult.content}</p>
              </>
            ) : (
              <p className="font-semibold text-red-600 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                {testResult.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsDiagnosticsIA;
