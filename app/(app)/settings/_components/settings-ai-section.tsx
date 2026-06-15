'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Mail, Eye } from 'lucide-react';

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

  // Playground state
  const [playgroundPrompt, setPlaygroundPrompt] = useState('Boulangerie L\'Épi d\'Or, Montréal. Proposer un audit de commande en ligne.');
  const [playgroundTone, setPlaygroundTone] = useState<'casual' | 'professional' | 'storytelling'>('casual');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<{ subject: string; body: string } | null>(null);

  const handleGeneratePreview = () => {
    setGeneratingPreview(true);
    setPreviewDraft(null);

    // Simulate API generation delay
    setTimeout(() => {
      let subject = '';
      let body = '';

      if (playgroundTone === 'casual') {
        subject = "💡 Audit de visibilité gratuit pour Boulangerie L'Épi d'Or";
        body = `Bonjour,\n\nJe suis tombé sur le site internet de la Boulangerie L'Épi d'Or et j'ai beaucoup aimé vos produits. Cependant, j'ai remarqué que vos clients de Montréal ne peuvent pas encore réserver ou commander leur pain directement en ligne.\n\nJe serais ravi de vous offrir un rapide audit technique gratuit pour voir si Minerva OS pourrait vous aider à fluidifier vos commandes du matin.\n\nBonne fin de journée,\nL'équipe Minerva OS`;
      } else if (playgroundTone === 'professional') {
        subject = "📈 ROI immédiat : Commande en ligne pour L'Épi d'Or";
        body = `Bonjour,\n\nSaviez-vous que les boulangeries artisanales à Montréal qui n'acceptent pas les commandes en ligne perdent en moyenne 25% de ventes additionnelles aux heures de pointe ?\n\nMinerva OS règle ce problème en intégrant un module de commande en ligne sur votre site existant en moins de 48h. Discutons-en 5 minutes cette semaine pour évaluer votre gain de chiffre d'affaires.\n\nCordialement,\nL'équipe Minerva OS`;
      } else {
        subject = "🥖 Comment le mitron voisin a augmenté ses ventes de 20%";
        body = `Bonjour,\n\nComme beaucoup de boulangers à Montréal, le gérant de la boulangerie voisine cherchait à réduire la file d'attente du samedi matin tout en vendant plus de viennoiseries.\n\nEn configurant Minerva OS pour ses précommandes, il a augmenté son panier moyen de 20% et fidélisé plus de 200 clients locaux.\n\nJetons un coup d'œil ensemble à vos canaux pour répliquer ces résultats chez L'Épi d'Or.\n\nÀ bientôt,\nL'équipe Minerva OS`;
      }

      setPreviewDraft({ subject, body });
      setGeneratingPreview(false);
    }, 1200);
  };

  return (
    <SettingsSectionWrapper
      title="Intelligence & IA"
      description="Règle le ton de rédaction de ton copilote et son niveau d'automatisation."
      isSaving={isSaving}
    >
      <div className="space-y-6 text-left">
        {/* Engine & API Configuration */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Moteur d'IA</h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Choisis le fournisseur d'intelligence artificielle pour rédiger tes messages de prospection.
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
                      "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full cursor-pointer",
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Modèle d'IA</label>
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
                      Saisis l'identifiant exact du modèle fourni par OpenRouter (ex: <code className="font-mono bg-muted px-1 py-0.5 rounded text-[8px]">openai/gpt-4o-mini</code>).
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
                      "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full cursor-pointer",
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
              Définis la quantité de contexte (notes, secteurs, contacts) injectée dans l'IA lors de la génération.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profondeur d'analyse</label>
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
                    <SelectItem value="high" className="text-xs">Profond (Intègre l'intégralité des notes de terrain)</SelectItem>
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
                    Autorise l'IA à scanner ton portefeuille le week-end pour dresser des bilans d'opportunités.
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
                    Affiche des propositions d'actions préconfigurées par l'IA sur les fiches de prospects tièdes/froids.
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

        {/* PLAYGROUND SIMULATOR */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Playground d'écriture & Aperçu IA</span>
            </h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Testez et visualisez instantanément le ton de rédaction de vos messages générés en fonction de vos directives.
            </p>

            <div className="space-y-3.5 pt-1">
              {/* Directive Prompt */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contexte du prospect / Prompt</label>
                <textarea
                  rows={2}
                  value={playgroundPrompt}
                  onChange={(e) => setPlaygroundPrompt(e.target.value)}
                  placeholder="Ex: Boulangerie L'Épi d'Or. Proposer un audit..."
                  className="w-full text-xs p-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                />
              </div>

              {/* Playground Tone selector buttons */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Tester avec le Ton :</label>
                <div className="flex flex-wrap gap-2">
                  {tones.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPlaygroundTone(t.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                        playgroundTone === t.id
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border/60 bg-white text-[#555552] hover:bg-slate-50"
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action trigger button */}
              <div className="pt-1 flex justify-end">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={generatingPreview || !playgroundPrompt.trim()}
                  className="bg-[#26251e] hover:bg-[#3d3c36] text-white font-bold text-xs h-9 px-4 flex items-center gap-2 rounded-lg"
                >
                  {generatingPreview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Génération de l'aperçu...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Générer un aperçu</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Result Preview Panel */}
              {previewDraft && (
                <div className="border border-[#e5e5e0] rounded-xl bg-[#fafaf8] overflow-hidden mt-4 animate-in fade-in duration-200">
                  <div className="bg-[#e5e5e0]/30 px-4 py-2 border-b border-[#e5e5e0] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#555552] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Aperçu du Courriel
                    </span>
                    <span className="text-[9px] font-bold text-[#7a7a76] bg-white px-2 py-0.5 border rounded">
                      Simulé
                    </span>
                  </div>
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex flex-col gap-0.5 pb-2 border-b border-[#e5e5e0]/40 text-left">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Objet :</span>
                      <span className="font-semibold text-foreground">{previewDraft.subject}</span>
                    </div>
                    <div className="text-left leading-relaxed text-[#26251e] whitespace-pre-wrap font-sans text-xs pt-1">
                      {previewDraft.body}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsSectionWrapper>
  );
}

export default SettingsAiSection;
