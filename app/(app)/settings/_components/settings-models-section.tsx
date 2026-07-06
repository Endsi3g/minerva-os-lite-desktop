'use client';

import React, { useEffect, useState } from 'react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { getApiUrl } from '@/lib/api-helper';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModelsData {
  defaultChatModel: string;
  defaultImageModel: string;
}

interface Props {
  data: ModelsData;
  onChange: (updates: Partial<ModelsData>) => void;
  isSaving: boolean;
}

// Modèles réellement supportés par lib/ai.ts (voir doCall/resolveAIProvider).
// OpenRouter n'a pas de liste fixe — n'importe quel slug OpenRouter valide
// fonctionne, configurable dans Paramètres > IA.
const CHAT_MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'Anthropic', tag: 'Rapide' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', tag: 'Équilibré' },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', provider: 'Anthropic', tag: 'Puissant' },
  { id: '@cf/moonshotai/kimi-k2.7-code', name: 'Kimi K2.7 Code', provider: 'Cloudflare Workers AI', tag: 'Primaire par défaut' },
];

interface LiveProvider {
  id: string;
  name: string;
  available: boolean;
  latency_ms: number | null;
  priority: number;
  error?: string;
}

const PRIORITY_LABELS: Record<number, string> = { 1: 'Primaire', 2: 'Secondaire', 3: 'Tertiaire' };

export function SettingsModelsSection({ data, onChange, isSaving }: Props) {
  const [liveProviders, setLiveProviders] = useState<LiveProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(getApiUrl('/api/ai/gateway/providers'));
        if (res.ok && !cancelled) {
          const d = await res.json();
          setLiveProviders(d.providers || []);
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <SettingsSectionWrapper
      title="Modèles IA"
      description="Sélectionnez les modèles par défaut pour votre espace de travail."
      isSaving={isSaving}
    >
      {/* Default chat model */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Modèle de chat par défaut</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">
              Sera pré-sélectionné lors du démarrage d'un nouveau chat. Chaque membre peut surcharger ce choix dans ses paramètres.
            </p>
          </div>
          <select
            value={data.defaultChatModel}
            onChange={(e) => onChange({ defaultChatModel: e.target.value })}
            className="text-xs border border-[#e5e5e0] rounded-lg px-3 py-1.5 bg-[#fafaf8] text-[#26251e] focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="">Aucun (utiliser le défaut)</option>
            {CHAT_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name} — {m.provider}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Default image model */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Modèle de génération d'image</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">
              Modèle utilisé pour la génération d'images dans le chat.
            </p>
          </div>
          <select
            value={data.defaultImageModel}
            onChange={(e) => onChange({ defaultImageModel: e.target.value })}
            className="text-xs border border-[#e5e5e0] rounded-lg px-3 py-1.5 bg-[#fafaf8] text-[#26251e] focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="">Aucun</option>
            <option value="dall-e-3">DALL-E 3 — OpenAI</option>
            <option value="stable-diffusion">Stable Diffusion</option>
            <option value="flux">FLUX — Black Forest Labs</option>
          </select>
        </div>
      </div>

      {/* Providers réels — ordre de priorité et statut en direct */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">Providers IA (ordre de priorité)</h3>
        {loadingProviders ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-[#7a7a76]" />
          </div>
        ) : (
          <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white divide-y divide-border">
            {liveProviders.map((p) => (
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
                {p.latency_ms != null && <span className="text-[10px] text-[#7a7a76] shrink-0">{p.latency_ms}ms</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modèles pris en charge (Anthropic + Cloudflare Workers AI ; OpenRouter accepte tout slug valide) */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-3">Modèles disponibles</h3>
        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white divide-y divide-border">
          {CHAT_MODELS.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#26251e]">{m.name}</span>
                <span className="text-[10px] text-[#7a7a76]">{m.provider}</span>
                {m.tag && (
                  <span className="text-[9px] font-bold uppercase tracking-wide bg-[#059669]/10 text-[#059669] border border-[#059669]/20 px-1.5 py-0.5 rounded">
                    {m.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
