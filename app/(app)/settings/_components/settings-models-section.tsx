'use client';

import React from 'react';
import { SettingsSectionWrapper } from './settings-section-wrapper';

export interface ModelsData {
  defaultChatModel: string;
  defaultImageModel: string;
}

interface Props {
  data: ModelsData;
  onChange: (updates: Partial<ModelsData>) => void;
  isSaving: boolean;
}

const CHAT_MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku', provider: 'Anthropic', tag: 'Rapide' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet', provider: 'Anthropic', tag: 'Équilibré' },
  { id: 'claude-opus-4-8', name: 'Claude Opus', provider: 'Anthropic', tag: 'Puissant' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tag: '' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq', tag: 'Rapide' },
  { id: 'mistral-7b', name: 'Mistral 7B', provider: 'Mistral', tag: '' },
];

const PROVIDERS = [
  { name: 'Anthropic', models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-8'], color: 'bg-emerald-50 border-emerald-200' },
  { name: 'OpenAI', models: ['gpt-4o'], color: 'bg-emerald-50 border-emerald-200' },
  { name: 'Groq', models: ['llama-3.3-70b-versatile'], color: 'bg-blue-50 border-blue-200' },
  { name: 'Mistral', models: ['mistral-7b'], color: 'bg-purple-50 border-purple-200' },
];

export function SettingsModelsSection({ data, onChange, isSaving }: Props) {
  const getModel = (id: string) => CHAT_MODELS.find(m => m.id === id);

  return (
    <SettingsSectionWrapper
      title="Modèles IA"
      description="Sélectionnez les modèles par défaut pour votre espace de travail."
      isSaving={isSaving}
    >
      {/* Default chat model */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Modèle de chat par défaut</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Sera pré-sélectionné lors du démarrage d'un nouveau chat. Chaque membre peut surcharger ce choix dans ses paramètres.
            </p>
          </div>
          <select
            value={data.defaultChatModel}
            onChange={(e) => onChange({ defaultChatModel: e.target.value })}
            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="">Aucun (utiliser le défaut)</option>
            {CHAT_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name} — {m.provider}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Default image model */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">Modèle de génération d'image</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Modèle utilisé pour la génération d'images dans le chat.
            </p>
          </div>
          <select
            value={data.defaultImageModel}
            onChange={(e) => onChange({ defaultImageModel: e.target.value })}
            className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="">Aucun</option>
            <option value="dall-e-3">DALL-E 3 — OpenAI</option>
            <option value="stable-diffusion">Stable Diffusion</option>
            <option value="flux">FLUX — Black Forest Labs</option>
          </select>
        </div>
      </div>

      {/* Models by provider */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Modèles disponibles</h3>
        <div className="space-y-3">
          {PROVIDERS.map(({ name, models, color }) => (
            <div key={name} className="border border-border rounded-xl overflow-hidden bg-card">
              <div className={`px-4 py-2.5 border-b border-border ${color} flex items-center gap-2`}>
                <span className="text-xs font-bold text-foreground">{name}</span>
                <span className="text-[10px] text-muted-foreground">· {models.length} modèle(s)</span>
              </div>
              <div className="divide-y divide-border">
                {models.map((id) => {
                  const m = getModel(id);
                  if (!m) return null;
                  return (
                    <div key={id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-foreground">{m.name}</span>
                        {m.tag && (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                            {m.tag}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold">Activé</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
