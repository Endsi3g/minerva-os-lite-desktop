'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type AutonomyLevel = 'off' | 'suggest' | 'prepare' | 'act_with_approval' | 'auto';

export interface AgentAutonomy {
  tasks: AutonomyLevel;
  pipeline: AutonomyLevel;
  sequences: AutonomyLevel;
  emails: AutonomyLevel;
  field: AutonomyLevel;
  // Outreach granular
  outreach_draft: AutonomyLevel;
  outreach_initial_send: AutonomyLevel;
  outreach_followup: AutonomyLevel;
  outreach_reply: AutonomyLevel;
  outreach_sequence_pause: AutonomyLevel;
  outreach_pipeline_update: AutonomyLevel;
}

interface AiData {
  tone: 'casual' | 'professional' | 'storytelling';
  customization: 'low' | 'medium' | 'high';
  autoInsights: boolean;
  autoFollowUps: boolean;
  aiProvider: 'anthropic' | 'openrouter';
  openrouterKeyMasked: string | null;
  aiModel: string;
  agentAutonomy: AgentAutonomy;
}

interface SettingsAiSectionProps {
  data: AiData;
  onChange: (updates: Partial<AiData>) => void;
  onSaveKey: (provider: 'openrouter', value: string) => Promise<void>;
  onDeleteKey: (provider: 'openrouter') => Promise<void>;
  isSaving: boolean;
}

const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  off: 'Désactivé',
  suggest: 'Suggérer',
  prepare: 'Préparer',
  act_with_approval: 'Exécuter avec validation',
  auto: 'Automatique',
};

const AUTONOMY_DESCRIPTIONS: Record<AutonomyLevel, string> = {
  off: "L'agent ne touche pas à ce domaine",
  suggest: "L'agent propose, vous décidez",
  prepare: "L'agent prépare tout, vous validez avant exécution",
  act_with_approval: "L'agent exécute après une confirmation rapide",
  auto: "L'agent agit seul dans ce domaine",
};

const AGENT_TOOLS: { key: keyof AgentAutonomy; label: string; group?: string }[] = [
  { key: 'tasks', label: 'Tâches de relance' },
  { key: 'pipeline', label: 'Mise à jour pipeline' },
  { key: 'field', label: 'Tournées terrain' },
  { key: 'sequences', label: 'Séquences (niveau général)' },
  { key: 'emails', label: 'Emails (niveau général)' },
  { key: 'outreach_draft', label: 'Création de brouillons', group: 'Outreach granulaire' },
  { key: 'outreach_initial_send', label: 'Premier envoi séquence', group: 'Outreach granulaire' },
  { key: 'outreach_followup', label: 'Relances automatiques', group: 'Outreach granulaire' },
  { key: 'outreach_reply', label: 'Réponse aux réponses', group: 'Outreach granulaire' },
  { key: 'outreach_sequence_pause', label: 'Pause de séquence', group: 'Outreach granulaire' },
  { key: 'outreach_pipeline_update', label: 'Pipeline après intent', group: 'Outreach granulaire' },
];

function ApiKeyField({
  label, placeholder, hint, masked, onSaveKey, onDeleteKey,
}: {
  label: string;
  placeholder: string;
  hint: string;
  masked: string | null;
  onSaveKey: (value: string) => Promise<void>;
  onDeleteKey: () => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    await onSaveKey(draft.trim());
    setDraft('');
    setBusy(false);
  };

  const handleDelete = async () => {
    setBusy(true);
    await onDeleteKey();
    setBusy(false);
  };

  return (
    <div className="grid gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={masked ? `Clé configurée (${masked})` : placeholder}
          className="text-xs bg-card font-mono"
        />
        <Button type="button" onClick={handleSave} disabled={busy || !draft.trim()}
          className="h-9 px-3 text-xs bg-[#26251e] hover:bg-[#3d3c36] text-white">
          Enregistrer
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground leading-none">{hint}</span>
        {masked && (
          <button type="button" onClick={handleDelete} disabled={busy}
            className="text-[9px] font-semibold text-red-600 hover:underline cursor-pointer">
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsAiSection({ data, onChange, onSaveKey, onDeleteKey, isSaving }: SettingsAiSectionProps) {
  const [aboutYou, setAboutYou] = useState('');
  const [modelInstructions, setModelInstructions] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: row } = await supabase
        .from('settings')
        .select('custom_instructions_about, custom_instructions_model')
        .eq('user_id', user.id)
        .maybeSingle();
      if (row) {
        setAboutYou(row.custom_instructions_about || '');
        setModelInstructions(row.custom_instructions_model || '');
      }
    };
    load();
  }, []);

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('settings').upsert({
        user_id: user.id,
        custom_instructions_enabled: true,
        custom_instructions_about: aboutYou,
        custom_instructions_model: modelInstructions,
      });
    }
    setSavingInstructions(false);
  };

  const tones = [
    { id: 'casual' as const, name: 'Calme & Conseil', description: 'Ton d\'accompagnement chaleureux et axé sur l\'audit technique gratuit.' },
    { id: 'professional' as const, name: 'Direct & Closer', description: 'Ton direct de closing rapide, insistant sur le ROI commercial immédiat.' },
    { id: 'storytelling' as const, name: 'Storytelling', description: 'Ton axé sur la comparaison de concurrents et d\'exemples concrets.' }
  ];

  const providers = [
    { id: 'anthropic' as const, name: 'Claude (Anthropic)', description: 'Modèle principal — Claude Sonnet via clé serveur. Recommandé.' },
    { id: 'openrouter' as const, name: 'OpenRouter', description: 'Modèles alternatifs gratuits (Llama, Mistral, Gemini…)' },
  ];

  const FREE_MODELS = [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B — Recommandé (gratuit)' },
    { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (gratuit)' },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 — Raisonnement (gratuit)' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (gratuit)' },
  ];

  const isCustomModel = data.aiProvider === 'openrouter' && !FREE_MODELS.some(m => m.id === data.aiModel);
  const selectedSelectValue = isCustomModel ? 'custom' : data.aiModel;

  const [playgroundPrompt, setPlaygroundPrompt] = useState('Boulangerie L\'Épi d\'Or, Montréal. Proposer un audit de commande en ligne.');
  const [playgroundTone, setPlaygroundTone] = useState<'casual' | 'professional' | 'storytelling'>('casual');
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<{ subject: string; body: string } | null>(null);

  const handleGeneratePreview = () => {
    setGeneratingPreview(true);
    setPreviewDraft(null);
    setTimeout(() => {
      const drafts = {
        casual: {
          subject: "💡 Audit de visibilité gratuit pour Boulangerie L'Épi d'Or",
          body: `Bonjour,\n\nJe suis tombé sur le site internet de la Boulangerie L'Épi d'Or et j'ai beaucoup aimé vos produits. Cependant, j'ai remarqué que vos clients de Montréal ne peuvent pas encore réserver ou commander leur pain directement en ligne.\n\nJe serais ravi de vous offrir un rapide audit technique gratuit.\n\nBonne fin de journée,\nL'équipe Minerva OS`,
        },
        professional: {
          subject: "📈 ROI immédiat : Commande en ligne pour L'Épi d'Or",
          body: `Bonjour,\n\nSaviez-vous que les boulangeries artisanales à Montréal qui n'acceptent pas les commandes en ligne perdent en moyenne 25% de ventes additionnelles ?\n\nMinerva OS règle ce problème en moins de 48h. Discutons-en 5 minutes cette semaine.\n\nCordialement,\nL'équipe Minerva OS`,
        },
        storytelling: {
          subject: "🥖 Comment le mitron voisin a augmenté ses ventes de 20%",
          body: `Bonjour,\n\nLe gérant de la boulangerie voisine a augmenté son panier moyen de 20% en configurant Minerva OS pour ses précommandes.\n\nJetons un coup d'œil ensemble chez L'Épi d'Or.\n\nÀ bientôt,\nL'équipe Minerva OS`,
        },
      };
      setPreviewDraft(drafts[playgroundTone]);
      setGeneratingPreview(false);
    }, 1200);
  };

  return (
    <SettingsSectionWrapper
      title="Intelligence & IA"
      description="Moteur IA, niveaux d'autonomie de l'agent et ton de rédaction."
      isSaving={isSaving}
    >
      <div className="space-y-6 text-left">

        {/* ── Moteur d'IA ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Moteur d'IA</h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Claude est le modèle principal de Minerva. OpenRouter donne accès à des alternatives gratuites.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {providers.map((p) => {
                const isSelected = data.aiProvider === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => onChange({ aiProvider: p.id })}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                        : "border-border/60 bg-card hover:border-border text-muted-foreground"
                    )}>
                    <span className="text-xs font-bold text-foreground">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground leading-normal">{p.description}</span>
                  </button>
                );
              })}
            </div>

            {data.aiProvider === 'openrouter' && (
              <div className="space-y-4 pt-4 border-t border-border/50">
                <ApiKeyField
                  label="Clé API OpenRouter"
                  placeholder="sk-or-v1-..."
                  hint="Ta clé API est stockée de manière sécurisée et sert uniquement à générer tes messages."
                  masked={data.openrouterKeyMasked}
                  onSaveKey={(v) => onSaveKey('openrouter', v)}
                  onDeleteKey={() => onDeleteKey('openrouter')}
                />

                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Modèle</label>
                  <Select
                    value={selectedSelectValue}
                    onValueChange={(val) => onChange({ aiModel: val === 'custom' ? '' : val })}
                  >
                    <SelectTrigger className="text-xs bg-card">
                      <SelectValue placeholder="Choisir un modèle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FREE_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs font-mono">{m.name}</SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-xs">Autre (identifiant personnalisé)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isCustomModel && (
                  <div className="grid gap-1.5 pl-2 border-l-2 border-primary/40">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Identifiant personnalisé</label>
                    <Input
                      value={data.aiModel}
                      onChange={(e) => onChange({ aiModel: e.target.value })}
                      placeholder="meta-llama/llama-3-70b-instruct"
                      className="text-xs bg-card font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Niveaux d'autonomie ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Niveaux d'autonomie de l'agent</h3>
              <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                Définissez ce que l'Agent Minerva peut faire seul, ce qu'il prépare pour vous, et ce qu'il ne touche pas.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {AGENT_TOOLS.map(({ key, label, group }, idx) => {
                const currentLevel = data.agentAutonomy?.[key] ?? 'suggest';
                const prevGroup = idx > 0 ? AGENT_TOOLS[idx - 1].group : undefined;
                const showGroupHeader = group && group !== prevGroup;
                return (
                  <React.Fragment key={key}>
                    {showGroupHeader && (
                      <div className="pt-2">
                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{group}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground block">{label}</span>
                      <span className="text-[10px] text-muted-foreground leading-none">{AUTONOMY_DESCRIPTIONS[currentLevel]}</span>
                    </div>
                    <Select
                      value={currentLevel}
                      onValueChange={(val: AutonomyLevel) =>
                        onChange({ agentAutonomy: { ...(data.agentAutonomy ?? {}), [key]: val } as AgentAutonomy })
                      }
                    >
                      <SelectTrigger className="text-xs bg-card w-48 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(AUTONOMY_LABELS) as AutonomyLevel[]).map((level) => (
                          <SelectItem key={level} value={level} className="text-xs">
                            {AUTONOMY_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Suggest</strong> = carte dans le feed · <strong>Préparer</strong> = brouillon prêt à valider · <strong>Auto</strong> = exécution sans intervention
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Ton de prospection ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Ton de prospection</h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Configure le ton utilisé par le copilote pour générer tes brouillons.
            </p>
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {tones.map((t) => {
                const isSelected = data.tone === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => onChange({ tone: t.id })}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-all flex flex-col gap-1 w-full cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                        : "border-border/60 bg-card hover:border-border text-muted-foreground"
                    )}>
                    <span className="text-xs font-bold text-foreground">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground leading-normal">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Personnalisation ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Personnalisation & Profondeur</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profondeur d'analyse</label>
                <Select
                  value={data.customization}
                  onValueChange={(val: AiData['customization']) => onChange({ customization: val })}
                >
                  <SelectTrigger className="text-xs bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-xs">Standard (rappels de base)</SelectItem>
                    <SelectItem value="medium" className="text-xs">Personnalisé (contact + ville)</SelectItem>
                    <SelectItem value="high" className="text-xs">Profond (intégralité des notes terrain)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Intelligence comportementale ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Intelligence comportementale</h3>
            <div className="space-y-4 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Analyses hebdomadaires automatiques</span>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    L'IA scanne ton portefeuille le week-end pour dresser un bilan d'opportunités.
                  </p>
                </div>
                <Switch checked={data.autoInsights} onCheckedChange={(checked) => onChange({ autoInsights: checked })} />
              </div>
              <div className="h-px bg-border/50" />
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Suggestions de relance dans Today</span>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Actions préconfigurées par l'IA sur les prospects tièdes/froids.
                  </p>
                </div>
                <Switch checked={data.autoFollowUps} onCheckedChange={(checked) => onChange({ autoFollowUps: checked })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Directives personnalisées ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Directives Personnalisées</h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Injectées dans chaque conversation avec l'IA pour personnaliser ses réponses.
            </p>
            <div className="space-y-3 pt-1">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">À propos de vous</label>
                <textarea rows={3} value={aboutYou} onChange={(e) => setAboutYou(e.target.value)}
                  placeholder="Ex: Je suis consultant en marketing digital pour des PME québécoises..."
                  className="w-full text-xs p-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-sans resize-none" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instructions au modèle</label>
                <textarea rows={3} value={modelInstructions} onChange={(e) => setModelInstructions(e.target.value)}
                  placeholder="Ex: Réponds toujours en français. Sois concis et pratique..."
                  className="w-full text-xs p-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-sans resize-none" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveInstructions} disabled={savingInstructions}
                  className="h-8 text-xs bg-[#26251e] hover:bg-[#3d3c36] text-white font-bold flex items-center gap-1.5">
                  {savingInstructions ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Enregistrer les directives
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Playground ── */}
        <Card className="border border-border bg-card shadow-xs">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Playground d'écriture
            </h3>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Visualisez instantanément le ton de rédaction de vos messages.
            </p>
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contexte du prospect</label>
                <textarea rows={2} value={playgroundPrompt} onChange={(e) => setPlaygroundPrompt(e.target.value)}
                  placeholder="Ex: Boulangerie L'Épi d'Or..."
                  className="w-full text-xs p-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary font-sans" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Tester avec le ton :</label>
                <div className="flex flex-wrap gap-2">
                  {tones.map(t => (
                    <button key={t.id} type="button" onClick={() => setPlaygroundTone(t.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                        playgroundTone === t.id
                          ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                          : "border-border/60 bg-white text-[#555552] hover:bg-slate-50"
                      )}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <Button onClick={handleGeneratePreview} disabled={generatingPreview || !playgroundPrompt.trim()}
                  className="bg-[#26251e] hover:bg-[#3d3c36] text-white font-bold text-xs h-9 px-4 flex items-center gap-2 rounded-lg">
                  {generatingPreview ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Génération...</span></> : <><Sparkles className="w-3.5 h-3.5" /><span>Générer un aperçu</span></>}
                </Button>
              </div>
              {previewDraft && (
                <div className="border border-[#e5e5e0] rounded-xl bg-[#fafaf8] overflow-hidden mt-4 animate-in fade-in duration-200">
                  <div className="bg-[#e5e5e0]/30 px-4 py-2 border-b border-[#e5e5e0] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#555552] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />Aperçu du Courriel
                    </span>
                    <span className="text-[9px] font-bold text-[#7a7a76] bg-white px-2 py-0.5 border rounded">Simulé</span>
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
