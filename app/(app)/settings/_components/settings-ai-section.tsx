'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Mail, Hand, Shield, Zap, ChevronDown, Check } from 'lucide-react';
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

// ── Autonomy profiles ─────────────────────────────────────────────────────────

type ProfileId = 'manuel' | 'controle' | 'mains_libres';

const PROFILE_AUTONOMY: Record<ProfileId, AgentAutonomy> = {
  manuel: {
    tasks: 'suggest', pipeline: 'suggest', sequences: 'suggest',
    emails: 'suggest', field: 'suggest',
    outreach_draft: 'suggest', outreach_initial_send: 'suggest',
    outreach_followup: 'suggest', outreach_reply: 'suggest',
    outreach_sequence_pause: 'suggest', outreach_pipeline_update: 'suggest',
  },
  controle: {
    tasks: 'act_with_approval', pipeline: 'act_with_approval',
    sequences: 'suggest', emails: 'act_with_approval', field: 'suggest',
    outreach_draft: 'act_with_approval', outreach_initial_send: 'suggest',
    outreach_followup: 'act_with_approval', outreach_reply: 'suggest',
    outreach_sequence_pause: 'act_with_approval', outreach_pipeline_update: 'act_with_approval',
  },
  mains_libres: {
    tasks: 'auto', pipeline: 'auto', sequences: 'auto',
    emails: 'auto', field: 'auto',
    outreach_draft: 'auto', outreach_initial_send: 'auto',
    outreach_followup: 'auto', outreach_reply: 'auto',
    outreach_sequence_pause: 'auto', outreach_pipeline_update: 'auto',
  },
};

const PROFILES: { id: ProfileId; label: string; badge?: string; icon: React.ElementType; description: string; behaviors: string[] }[] = [
  {
    id: 'manuel',
    label: 'Manuel',
    icon: Hand,
    description: "Vous gardez le contrôle total. L'agent analyse et suggère — vous validez chaque action.",
    behaviors: ["Suggestions dans le feed agent", "Aucune action sans votre accord", "Idéal pour débuter avec l'agent"],
  },
  {
    id: 'controle',
    label: 'Contrôlé',
    badge: 'Recommandé',
    icon: Shield,
    description: "L'agent prépare et exécute avec votre validation. Brouillons et relances en file d'approbation.",
    behaviors: ["Brouillons générés automatiquement", "Relances envoyées après validation", "Pipeline mis à jour après confirmation"],
  },
  {
    id: 'mains_libres',
    label: 'Mains libres',
    icon: Zap,
    description: "L'agent agit de façon totalement autonome. Emails, relances et pipeline gérés sans intervention.",
    behaviors: ["Emails envoyés sans confirmation", "Pipeline mis à jour en continu", "Séquences gérées automatiquement"],
  },
];

const AGENT_TOOL_KEYS = (Object.keys(PROFILE_AUTONOMY.manuel) as (keyof AgentAutonomy)[]);

function detectProfile(autonomy: Partial<AgentAutonomy>): ProfileId | 'custom' {
  for (const pid of Object.keys(PROFILE_AUTONOMY) as ProfileId[]) {
    const preset = PROFILE_AUTONOMY[pid];
    if (AGENT_TOOL_KEYS.every(k => (autonomy[k] ?? 'suggest') === preset[k])) return pid;
  }
  return 'custom';
}

// ──────────────────────────────────────────────────────────────────────────────

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
  const [showAdvancedAutonomy, setShowAdvancedAutonomy] = useState(false);
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

        {/* ── Profils d'autonomie ── */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Profil d'autonomie de l'agent</h3>
              <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                Choisissez jusqu&apos;où l&apos;Agent Minerva peut agir seul.
              </p>
            </div>

            {/* 3 profile cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {PROFILES.map((profile) => {
                const activeProfile = detectProfile(data.agentAutonomy ?? {});
                const isSelected = activeProfile === profile.id;
                const Icon = profile.icon;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onChange({ agentAutonomy: PROFILE_AUTONOMY[profile.id] })}
                    className={cn(
                      "relative text-left p-4 rounded-xl border transition-all flex flex-col gap-3 w-full cursor-pointer",
                      isSelected
                        ? "border-[#059669] bg-[#059669]/5 ring-1 ring-[#059669]/30"
                        : "border-border/60 bg-card hover:border-border/80"
                    )}
                  >
                    {profile.badge && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-[#059669] text-white px-1.5 py-0.5 rounded-full">
                        {profile.badge}
                      </span>
                    )}
                    {isSelected && !profile.badge && (
                      <span className="absolute top-3 right-3">
                        <Check className="h-3.5 w-3.5 text-[#059669]" />
                      </span>
                    )}
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      isSelected ? "bg-[#059669]/15 text-[#059669]" : "bg-[#f4f4f3] text-[#7a7a76]"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#26251e]">{profile.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-normal">{profile.description}</p>
                    </div>
                    <ul className="space-y-1">
                      {profile.behaviors.map((b) => (
                        <li key={b} className="flex items-start gap-1.5 text-[10px] text-[#555552]">
                          <span className="mt-[3px] h-1 w-1 rounded-full bg-[#059669]/60 shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {/* Custom indicator */}
            {detectProfile(data.agentAutonomy ?? {}) === 'custom' && (
              <p className="text-[10px] text-[#d97706] font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d97706] inline-block" />
                Configuration personnalisée active — choisir un profil ci-dessus pour réinitialiser.
              </p>
            )}

            {/* Advanced toggle */}
            <div className="pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowAdvancedAutonomy(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvancedAutonomy && "rotate-180")} />
                Réglages avancés (contrôle par domaine)
              </button>

              {showAdvancedAutonomy && (
                <div className="mt-3 space-y-2.5">
                  {AGENT_TOOLS.map(({ key, label, group }, idx) => {
                    const currentLevel = data.agentAutonomy?.[key] ?? 'suggest';
                    const prevGroup = idx > 0 ? AGENT_TOOLS[idx - 1].group : undefined;
                    const showGroupHeader = group && group !== prevGroup;
                    return (
                      <React.Fragment key={key}>
                        {showGroupHeader && (
                          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground pt-1">{group}</p>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-foreground block">{label}</span>
                            <span className="text-[10px] text-muted-foreground">{AUTONOMY_DESCRIPTIONS[currentLevel]}</span>
                          </div>
                          <Select
                            value={currentLevel}
                            onValueChange={(val: AutonomyLevel) =>
                              onChange({ agentAutonomy: { ...(data.agentAutonomy ?? {}), [key]: val } as AgentAutonomy })
                            }
                          >
                            <SelectTrigger className="text-xs bg-card w-44 shrink-0">
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
              )}
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
