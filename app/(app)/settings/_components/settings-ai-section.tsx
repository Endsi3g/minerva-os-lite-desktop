'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface AiData {
  tone: 'casual' | 'professional' | 'storytelling';
  customization: 'low' | 'medium' | 'high';
  autoInsights: boolean;
  autoFollowUps: boolean;
  aiProvider: 'anthropic' | 'openrouter';
  openrouterKey: string;
  aiModel: string;
}

interface SettingsAiSectionProps {
  data: AiData;
  onChange: (updates: Partial<AiData>) => void;
  isSaving: boolean;
}

export function SettingsAiSection({ data, onChange, isSaving }: SettingsAiSectionProps) {
  const tones = [
    { id: 'casual' as const, name: 'Calme & Conseil', description: 'Ton d\'accompagnement chaleureux et axé sur l\'audit technique gratuit.' },
    { id: 'professional' as const, name: 'Direct & Closer', description: 'Ton direct de closing rapide, insistant sur le ROI commercial immédiat.' },
    { id: 'storytelling' as const, name: 'Storytelling', description: 'Ton axé sur la comparaison de concurrents et d\'exemples concrets.' }
  ];

  const providers = [
    { id: 'anthropic' as const, name: 'Anthropic Claude', description: 'Génération native via Claude 3.5 Sonnet' },
    { id: 'openrouter' as const, name: 'OpenRouter AI', description: 'Modèles gratuits et alternatifs' }
  ];

  const FREE_MODELS = [
    { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
    { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Free)' },
    { id: 'microsoft/phi-3-medium-128k-instruct:free', name: 'Phi-3 Medium (Free)' },
    { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)' },
  ];

  const isCustomModel = data.aiProvider === 'openrouter' && !FREE_MODELS.some(m => m.id === data.aiModel);
  const selectedSelectValue = isCustomModel ? 'custom' : data.aiModel;

  return (
    <SettingsSectionWrapper
      title="Intelligence & IA"
      description="Règle le ton de rédaction de ton copilote et son niveau d&apos;automatisation."
      isSaving={isSaving}
    >
      {/* Engine & API Configuration */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Moteur d&apos;IA</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Choisis le fournisseur d&apos;intelligence artificielle pour rédiger tes messages de prospection.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {providers.map((p) => {
              const isSelected = data.aiProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ aiProvider: p.id })}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full",
                    isSelected 
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30" 
                      : "border-border/60 bg-card hover:border-border text-muted-foreground"
                  )}
                >
                  <span className="text-xs font-bold text-foreground">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-normal">{p.description}</span>
                </button>
              );
            })}
          </div>

          {data.aiProvider === 'openrouter' && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clé API OpenRouter</label>
                <Input 
                  type="password"
                  value={data.openrouterKey} 
                  onChange={(e) => onChange({ openrouterKey: e.target.value })} 
                  placeholder="sk-or-v1-..."
                  className="text-xs bg-card font-mono"
                />
                <span className="text-[9px] text-muted-foreground leading-none">
                  Ta clé API est stockée de manière sécurisée et sert uniquement à générer tes messages.
                </span>
              </div>

              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Modèle d&apos;IA</label>
                <Select 
                  value={selectedSelectValue} 
                  onValueChange={(val) => {
                    if (val === 'custom') {
                      onChange({ aiModel: '' });
                    } else {
                      onChange({ aiModel: val });
                    }
                  }}
                >
                  <SelectTrigger className="text-xs bg-card">
                    <SelectValue placeholder="Choisir un modèle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FREE_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs font-mono">
                        {m.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" className="text-xs">
                      Autre (Modèle personnalisé...)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isCustomModel && (
                <div className="grid gap-1.5 pl-2 border-l-2 border-primary/40">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Identifiant du modèle personnalisé</label>
                  <Input 
                    value={data.aiModel} 
                    onChange={(e) => onChange({ aiModel: e.target.value })} 
                    placeholder="e.g. meta-llama/llama-3-70b-instruct"
                    className="text-xs bg-card font-mono"
                  />
                  <span className="text-[9px] text-muted-foreground leading-none">
                    Saisis l&apos;identifiant exact du modèle fourni par OpenRouter (ex: <code className="font-mono bg-muted px-1 py-0.5 rounded text-[8px]">openai/gpt-4o-mini</code>).
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Tone & Style Choice */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Ton de prospection</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Configure le ton utilisé par le copilote et les playbooks pour générer tes brouillons de message.
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {tones.map((t) => {
              const isSelected = data.tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange({ tone: t.id })}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full",
                    isSelected 
                      ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30" 
                      : "border-border/60 bg-card hover:border-border text-muted-foreground"
                  )}
                >
                  <span className="text-xs font-bold text-foreground">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground leading-normal">{t.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deepness of context personalization */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Personnalisation & Prudence</h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Définis la quantité de contexte (notes, secteurs, contacts) injectée dans l&apos;IA lors de la génération.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="grid gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profondeur d&apos;analyse</label>
              <Select 
                value={data.customization} 
                onValueChange={(val: AiData['customization']) => onChange({ customization: val })}
              >
                <SelectTrigger className="text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Standard (Rappels de base)</SelectItem>
                  <SelectItem value="medium" className="text-xs">Personnalisé (Intègre le contact & la ville)</SelectItem>
                  <SelectItem value="high" className="text-xs">Profond (Intègre l&apos;intégralité des notes de terrain)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior options */}
      <Card className="border border-border bg-card">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Intelligence comportementale</h3>
          
          <div className="space-y-4 pt-1">
            {/* Automatic Insights */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Générer automatiquement des analyses hebdomadaires</span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Autorise l&apos;IA à scanner ton portefeuille le week-end pour dresser des bilans d&apos;opportunités.
                </p>
              </div>
              <Switch 
                checked={data.autoInsights} 
                onCheckedChange={(checked: boolean) => onChange({ autoInsights: checked })}
                aria-label="Basculer la generation automatique d'analyses hebdomadaires"
              />
            </div>

            <div className="h-px bg-border/50" />

            {/* Auto suggestions */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Suggérer des relances et actions dans le panneau Today</span>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Affiche des propositions d&apos;actions préconfigurées par l&apos;IA sur les fiches de prospects tièdes/froids.
                </p>
              </div>
              <Switch 
                checked={data.autoFollowUps} 
                onCheckedChange={(checked: boolean) => onChange({ autoFollowUps: checked })}
                aria-label="Basculer la suggestion de relances dans le panneau Today"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsSectionWrapper>
  );
}

export default SettingsAiSection;
