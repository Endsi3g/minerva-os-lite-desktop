'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Sparkles, Brain, Loader2, Check, ExternalLink, Globe,
  MessageSquare, FileSearch, Mail, Image, HelpCircle, Zap,
  Key, Eye, EyeOff, Trash2, ArrowRight, Bot, BookOpen,
  BarChart3, Clock, Coins,
} from 'lucide-react';

// ── Tools registry ─────────────────────────────────────────────────────────────

const AI_TOOLS = [
  {
    id: 'email',
    icon: Mail,
    label: 'Rédaction d\'email IA',
    description: 'Génère des variantes de prospection A/B selon ton ton.',
    badge: 'Actif',
  },
  {
    id: 'image_search',
    icon: Image,
    label: 'Recherche d\'images IA',
    description: 'Recherche contextuelle d\'images liées à un prospect.',
    badge: 'Actif',
  },
  {
    id: 'firecrawl',
    icon: Globe,
    label: 'Recherche web (Firecrawl)',
    description: 'Synthèse intelligente de pages web et de recherches en temps réel.',
    badge: 'Clé requise',
    badgeVariant: 'outline' as const,
  },
  {
    id: 'link_preview',
    icon: Eye,
    label: 'Aperçu de liens',
    description: 'Affiche un aperçu enrichi (titre, image, description) au survol des URLs.',
    badge: 'Actif',
  },
  {
    id: 'questions',
    icon: HelpCircle,
    label: 'Wizard de questions IA',
    description: 'Pose des questions guidées clavier pour qualifier vos prospects.',
    badge: 'Actif',
  },
];

const MINERVA_MODELS = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    badge: 'Par défaut',
    description: 'Modèle principal — équilibre vitesse/qualité optimal.',
    color: '#059669',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    badge: 'Rapide',
    description: 'Ultra-rapide pour les outils internes et suggestions.',
    color: '#7a7a76',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    provider: 'OpenRouter',
    badge: 'Gratuit',
    description: 'Alternative haute performance sans coût API.',
    color: '#26251e',
  },
  {
    id: 'google/gemini-2.5-flash:free',
    name: 'Gemini 2.5 Flash',
    provider: 'OpenRouter',
    badge: 'Gratuit',
    description: 'Flash multimodal de Google, idéal pour les analyses rapides.',
    color: '#26251e',
  },
];

// ── ApiKeyField ────────────────────────────────────────────────────────────────

function ApiKeyField({
  label, placeholder, hint, masked, onSaveKey, onDeleteKey,
}: {
  label: string;
  placeholder: string;
  hint: string;
  masked: string | null;
  onSaveKey: (v: string) => Promise<void>;
  onDeleteKey: () => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    await onSaveKey(draft.trim());
    setDraft('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setBusy(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder={masked ? `Configurée (${masked})` : placeholder}
            className="text-xs bg-white font-mono pr-9"
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a7a76] hover:text-[#26251e]"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={busy || !draft.trim()}
          className="h-9 px-3 text-xs bg-[#26251e] hover:bg-[#3d3c36] text-white shrink-0"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : 'Enregistrer'}
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-[#7a7a76] leading-relaxed">{hint}</p>
        {masked && (
          <button type="button" onClick={async () => { setBusy(true); await onDeleteKey(); setBusy(false); }}
            disabled={busy} className="text-[9px] font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
            <Trash2 className="h-2.5 w-2.5" /> Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main section ───────────────────────────────────────────────────────────────

interface MinervaAiData {
  activeModel: string;
  firecrawlKeyMasked: string | null;
  memoryEnabled: boolean;
  spatialAiEnabled: boolean;
  webResearchEnabled: boolean;
}

interface SettingsMinervaAiSectionProps {
  isSaving?: boolean;
}

export function SettingsMinervaAiSection({ isSaving }: SettingsMinervaAiSectionProps) {
  const [data, setData] = useState<MinervaAiData>({
    activeModel: 'claude-sonnet-4-6',
    firecrawlKeyMasked: null,
    memoryEnabled: true,
    spatialAiEnabled: true,
    webResearchEnabled: false,
  });
  const [stats, setStats] = useState({ conversations: 0, emailsDrafted: 0, researchQueries: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: row } = await supabase
        .from('settings')
        .select('ai_model, firecrawl_api_key_masked, ai_memory_enabled, ai_spatial_enabled, ai_web_research_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (row) {
        setData({
          activeModel: row.ai_model || 'claude-sonnet-4-6',
          firecrawlKeyMasked: row.firecrawl_api_key_masked || null,
          memoryEnabled: row.ai_memory_enabled ?? true,
          spatialAiEnabled: row.ai_spatial_enabled ?? true,
          webResearchEnabled: row.ai_web_research_enabled ?? false,
        });
      }
      // Mock usage stats (replace with real aggregation query when available)
      setStats({ conversations: 42, emailsDrafted: 18, researchQueries: 7 });
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveModel = async (model: string) => {
    setData(prev => ({ ...prev, activeModel: model }));
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('settings').upsert({ user_id: user.id, ai_model: model });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggle = async (key: keyof MinervaAiData, value: boolean) => {
    setData(prev => ({ ...prev, [key]: value }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const colMap: Record<string, string> = {
      memoryEnabled: 'ai_memory_enabled',
      spatialAiEnabled: 'ai_spatial_enabled',
      webResearchEnabled: 'ai_web_research_enabled',
    };
    await supabase.from('settings').upsert({ user_id: user.id, [colMap[key]]: value });
  };

  const handleSaveFirecrawlKey = async (v: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const masked = `${v.slice(0, 6)}...${v.slice(-4)}`;
    await supabase.from('settings').upsert({
      user_id: user.id,
      firecrawl_api_key: v,
      firecrawl_api_key_masked: masked,
    });
    setData(prev => ({ ...prev, firecrawlKeyMasked: masked }));
  };

  const handleDeleteFirecrawlKey = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('settings').upsert({
      user_id: user.id,
      firecrawl_api_key: null,
      firecrawl_api_key_masked: null,
    });
    setData(prev => ({ ...prev, firecrawlKeyMasked: null }));
  };

  if (loading) {
    return (
      <SettingsSectionWrapper title="Minerva AI" description="Configuration du cerveau IA de l'application." isSaving={false}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-[#7a7a76]" />
        </div>
      </SettingsSectionWrapper>
    );
  }

  return (
    <SettingsSectionWrapper
      title="Minerva AI"
      description="Cerveau IA, outils actifs, clés API et statistiques d'utilisation."
      isSaving={saving}
    >
      <div className="space-y-6 text-left">

        {/* ── Identity card ── */}
        <Card className="border border-[#e5e5e0] bg-gradient-to-br from-[#f9fdf9] to-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center shrink-0">
                <Bot className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[#26251e]">Minerva</h3>
                  <Badge className="text-[9px] bg-[#059669]/10 text-[#059669] border-[#059669]/20 font-bold">Actif</Badge>
                </div>
                <p className="text-[11px] text-[#7a7a76] mt-1 leading-relaxed">
                  Agent IA intégré à votre CRM. Analyse votre pipeline, rédige des emails, planifie vos tournées terrain et orchestre votre prospection en autonomie.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <a href="/assistant" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#059669] hover:underline">
                    <MessageSquare className="h-3.5 w-3.5" /> Ouvrir l'assistant
                  </a>
                  <a href="/skills" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#26251e] hover:underline">
                    <Sparkles className="h-3.5 w-3.5" /> Gérer les skills
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Usage stats ── */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-[#059669]" />
              Statistiques ce mois-ci
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: MessageSquare, label: 'Conversations', value: stats.conversations },
                { icon: Mail, label: 'Emails rédigés', value: stats.emailsDrafted },
                { icon: FileSearch, label: 'Recherches web', value: stats.researchQueries },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center p-3 rounded-xl bg-[#fafaf9] border border-[#e5e5e0] gap-1">
                  <Icon className="h-4 w-4 text-[#059669]" />
                  <span className="text-xl font-black text-[#26251e]">{value}</span>
                  <span className="text-[9px] font-semibold text-[#7a7a76] uppercase tracking-wide text-center leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Model selection ── */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-[#059669]" />
                Modèle actif
              </h3>
              {saved && (
                <span className="text-[10px] font-semibold text-[#059669] flex items-center gap-1">
                  <Check className="h-3 w-3" /> Sauvegardé
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MINERVA_MODELS.map((model) => {
                const isActive = data.activeModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSaveModel(model.id)}
                    className={cn(
                      'text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 w-full cursor-pointer relative',
                      isActive
                        ? 'border-[#059669] bg-[#059669]/5 ring-1 ring-[#059669]/20'
                        : 'border-[#e5e5e0] bg-white hover:border-[#c0c0bc]'
                    )}
                  >
                    {isActive && (
                      <span className="absolute top-3 right-3">
                        <Check className="h-3.5 w-3.5 text-[#059669]" />
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#26251e]">{model.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#e5e5e0]/60 text-[#7a7a76]">
                        {model.provider}
                      </span>
                    </div>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit',
                      model.badge === 'Par défaut' ? 'bg-[#059669]/10 text-[#059669]' :
                      model.badge === 'Rapide' ? 'bg-blue-50 text-blue-600' :
                      'bg-[#f4f4f3] text-[#7a7a76]'
                    )}>
                      {model.badge}
                    </span>
                    <p className="text-[10px] text-[#7a7a76] leading-relaxed">{model.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Feature toggles ── */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#059669]" />
              Fonctionnalités IA
            </h3>
            <div className="divide-y divide-[#e5e5e0]/60">
              {[
                {
                  key: 'memoryEnabled' as const,
                  label: 'Mémoire contextuelle',
                  description: 'Minerva retient les préférences et le contexte entre sessions.',
                  icon: BookOpen,
                },
                {
                  key: 'spatialAiEnabled' as const,
                  label: 'IA spatiale (carte)',
                  description: 'Interprétation de requêtes naturelles pour filtrer les leads sur la carte.',
                  icon: Globe,
                },
                {
                  key: 'webResearchEnabled' as const,
                  label: 'Recherche web (Firecrawl)',
                  description: 'Permet à Minerva de scraper et synthétiser des pages web en temps réel.',
                  icon: FileSearch,
                },
              ].map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between py-3.5 gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-[#7a7a76]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#26251e]">{label}</p>
                      <p className="text-[10px] text-[#7a7a76] leading-relaxed mt-0.5">{description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!(data[key])}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Active tools ── */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
              Outils IA disponibles
            </h3>
            <div className="divide-y divide-[#e5e5e0]/60">
              {AI_TOOLS.map(({ id, icon: Icon, label, description, badge, badgeVariant }) => (
                <div key={id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-[#f4f4f3] flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-[#7a7a76]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#26251e]">{label}</p>
                      <p className="text-[10px] text-[#7a7a76] leading-relaxed truncate">{description}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 border',
                    badge === 'Actif' ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' : 'bg-transparent text-[#7a7a76] border-[#e5e5e0]'
                  )}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── API Keys ── */}
        <Card className="border border-[#e5e5e0] bg-white">
          <CardContent className="p-5 space-y-5">
            <h3 className="text-xs font-bold text-[#26251e] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-[#059669]" />
              Clés API
            </h3>
            <ApiKeyField
              label="Firecrawl API Key"
              placeholder="fc-..."
              hint="Active la recherche web en temps réel. Obtenez votre clé sur firecrawl.dev."
              masked={data.firecrawlKeyMasked}
              onSaveKey={handleSaveFirecrawlKey}
              onDeleteKey={handleDeleteFirecrawlKey}
            />
            <div className="pt-1 border-t border-[#e5e5e0]/60">
              <p className="text-[10px] text-[#7a7a76]">
                La clé Anthropic (Claude) est configurée côté serveur par l'administrateur.{' '}
                <a href="/settings?section=ai" className="text-[#059669] hover:underline font-semibold">
                  Configurer OpenRouter →
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="/assistant" className="flex items-center justify-between p-4 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/40 hover:bg-[#f9fdf9] transition-all group">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#059669]/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-[#059669]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#26251e]">Assistant IA</p>
                <p className="text-[10px] text-[#7a7a76]">Ouvrir le chat</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#7a7a76] group-hover:text-[#059669] transition-colors" />
          </a>
          <a href="/skills" className="flex items-center justify-between p-4 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/40 hover:bg-[#f9fdf9] transition-all group">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#26251e]/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#26251e]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#26251e]">Skills Marketplace</p>
                <p className="text-[10px] text-[#7a7a76]">Gérer les compétences IA</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#7a7a76] group-hover:text-[#059669] transition-colors" />
          </a>
        </div>

      </div>
    </SettingsSectionWrapper>
  );
}

export default SettingsMinervaAiSection;
