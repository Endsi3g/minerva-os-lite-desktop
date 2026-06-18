'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  ChevronDown,
  SlidersHorizontal,
  MessageSquare,
  Store,
  X,
  Sparkles,
  ArrowLeft,
  Check,
  Loader2,
  Play,
  FileText,
  Mail,
  Star,
  ExternalLink,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MinervaIcon } from '@/components/icons';
import { getAgents, deleteAgent, Agent } from '@/lib/onboarding-store';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { TranslationKey } from '@/lib/translations';
import { getApiUrl } from '@/lib/api-helper';

// Static builtin agents — always visible, defined here rather than in the local store.
const BUILTIN_AGENTS = [
  {
    id: 'audit-gmb',
    name: 'Audit GMB Montréal',
    nameKey: 'agents.builtin.audit_gmb.name' as TranslationKey,
    description: "Analyse la fiche Google My Business d'un commerce montréalais et génère un rapport de recommandations avec un score GMB sur 100.",
    descriptionKey: 'agents.builtin.audit_gmb.description' as TranslationKey,
    category: 'Audit',
    categoryKey: 'agents.builtin.category_audit' as TranslationKey,
    chatsCount: '< 50',
  },
  {
    id: 'pitcheur-qc',
    name: 'Pitcheur Québécois',
    nameKey: 'agents.builtin.pitcheur_qc.name' as TranslationKey,
    description: 'Rédige un pitch de vente authentiquement québécois, adapté au marché local. Choisis ton canal et ton ton.',
    descriptionKey: 'agents.builtin.pitcheur_qc.description' as TranslationKey,
    category: 'Prospection',
    categoryKey: 'agents.builtin.category_prospecting' as TranslationKey,
    chatsCount: '< 30',
  },
  {
    id: 'radar-reputation',
    name: 'Radar Réputation',
    nameKey: 'agents.builtin.radar_reputation.name' as TranslationKey,
    description: 'Analyse la réputation en ligne, identifie les avis négatifs et propose des réponses professionnelles adaptées.',
    descriptionKey: 'agents.builtin.radar_reputation.description' as TranslationKey,
    category: 'Réputation',
    categoryKey: 'agents.builtin.category_reputation' as TranslationKey,
    chatsCount: '< 20',
  },
] as const;

const OLD_DEFAULT_IDS = ['tableau-insight', 'health-assistant', 'asmobbin-agent'];

const MinervaAgentIcon = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
  const sizeClasses = size === 'md' ? 'w-12 h-12' : 'w-8 h-8';
  const iconSize = size === 'md' ? 24 : 16;
  return (
    <div className={`${sizeClasses} rounded-full bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0`}>
      <MinervaIcon size={iconSize} />
    </div>
  );
};

interface AgentResult {
  score?: number;
  report?: string;
  content?: string;
  rating?: string;
  totalReviews?: number;
}

export default function AgentsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');

  // Interactive Workspace states
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const { leads, addNoteToLead } = useReach();
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [resultData, setResultData] = useState<AgentResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userName, setUserName] = useState('Moi');
  const [companyName, setCompanyName] = useState('Uprising Studio');

  // Agent-specific workspace config
  const [auditMode, setAuditMode] = useState<'quick' | 'deep'>('quick');
  const [pitchChannel, setPitchChannel] = useState<'Email' | 'SMS' | 'Appel'>('Email');
  const [pitchTone, setPitchTone] = useState<string>('Chaleureux');
  const [reviewSource, setReviewSource] = useState<'google' | 'yelp' | 'facebook'>('google');

  useEffect(() => {
    const syncStore = () => {
      const builtinIds: string[] = BUILTIN_AGENTS.map(b => b.id);
      setUserAgents(getAgents().filter(a => !builtinIds.includes(a.id) && !OLD_DEFAULT_IDS.includes(a.id)));
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, []);

  // Fetch settings to personalize generated scripts
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select('full_name, company_name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (settings) {
            if (settings.full_name) setUserName(settings.full_name);
            if (settings.company_name) setCompanyName(settings.company_name);
          }
        }
      } catch (err) {
        console.error("Error fetching user settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Auto-launch workspace when coming from detail page with ?launch=id
  useEffect(() => {
    const launchId = searchParams.get('launch');
    if (launchId) {
      setActiveAgentId(launchId);
      router.replace('/agents');
    }
  }, [searchParams, router]);

  type ListedAgent = {
    id: string;
    name: string;
    description: string;
    isBuiltin: boolean;
    category?: string;
    chatsCount: string;
    owner: string;
  };

  const allAgents: ListedAgent[] = [
    ...BUILTIN_AGENTS.map(a => ({
      id: a.id,
      name: t(a.nameKey, a.name),
      description: t(a.descriptionKey, a.description),
      isBuiltin: true,
      category: t(a.categoryKey, a.category),
      chatsCount: a.chatsCount,
      owner: 'Minerva',
    })),
    ...userAgents.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      isBuiltin: false,
      chatsCount: a.chatsCount,
      owner: a.owner === 'Alex Smith' || a.owner === 'Moi' ? userName : a.owner,
    })),
  ];

  const filteredAgents = allAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (sortBy === 'newest') return b.id.localeCompare(a.id);
    return a.name.localeCompare(b.name);
  });

  const showLucifeeCard = !searchQuery || 'lucifee'.includes(searchQuery.toLowerCase());

  const getActiveAgentInfo = () => {
    const builtin = BUILTIN_AGENTS.find(a => a.id === activeAgentId);
    if (builtin) return { name: t(builtin.nameKey, builtin.name), isBuiltin: true };
    const user = userAgents.find(a => a.id === activeAgentId);
    if (user) return { name: user.name, isBuiltin: false };
    return { name: '', isBuiltin: false };
  };

  const handleRunAgent = async () => {
    if (!selectedLeadId) return;
    setIsRunning(true);
    setLogs([]);
    setResultData(null);
    setSaveSuccess(false);

    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    // ── Build log steps based on agent type ──
    const logSteps: string[] = (() => {
      if (activeAgentId === 'audit-gmb') return [
        `Connexion à la fiche Google My Business de ${lead.businessName}...`,
        `Vérification de la fiche (${auditMode === 'deep' ? 'analyse complète' : 'scan rapide'})...`,
        `Analyse des photos, heures d'ouverture et description...`,
        `Évaluation des avis clients récents...`,
        `Génération du rapport GMB via IA...`,
      ];
      if (activeAgentId === 'pitcheur-qc') return [
        `Analyse du profil de ${lead.businessName} (${lead.niche || 'secteur'})...`,
        `Adaptation du ton « ${pitchTone} » au marché québécois...`,
        `Rédaction du pitch (canal : ${pitchChannel})...`,
        `Finalisation avec accroche locale...`,
      ];
      if (activeAgentId === 'radar-reputation') return [
        `Scan de la réputation de ${lead.businessName}...`,
        `Extraction des avis récents et analyse des sentiments...`,
        `Identification des points critiques...`,
        `Génération des templates de réponse via IA...`,
      ];
      return [
        `Initialisation de l'agent personnalisé...`,
        `Analyse du profil de ${lead.businessName}...`,
        `Génération du résultat via IA...`,
      ];
    })();

    // Show log steps while the API call runs in parallel
    const logPromise = (async () => {
      for (let i = 0; i < logSteps.length - 1; i++) {
        setLogs(prev => [...prev, `[${i + 1}/${logSteps.length}] ${logSteps[i]}`]);
        await new Promise(r => setTimeout(r, 700));
      }
    })();

    if (activeAgentId === 'pitcheur-qc') {
      // Pitcheur QC uses the existing generate-draft API (no random data needed)
      await logPromise;
      setLogs(prev => [...prev, `[${logSteps.length}/${logSteps.length}] ${logSteps[logSteps.length - 1]}`]);
      let content = '';
      if (pitchChannel === 'Email') {
        content = `Objet : Vos clients de ${lead.city || 'Montréal'} vous cherchent en ligne\n\nAllô ${lead.contactName || 'là'},\n\nJ'ai checké votre fiche Google pour ${lead.businessName} pis j'ai vu qu'y'a quelques affaires qui pourraient vous aider à pogner plus de clients dans le coin.\n\nTsé, les gens de ${lead.city || 'Montréal'} cherchent des ${lead.niche || 'commerces locaux'} en ligne avant de se déplacer. Si votre fiche est pas au boutte, c'est vos compétiteurs qui prennent vos clients.\n\nJ'aimerais ça vous montrer ça en 10 minutes — un petit appel pour vous expliquer concrètement. Êtes-vous disponible jeudi ou vendredi matin ?\n\nBonne journée,\n${userName}\n${companyName}`;
      } else if (pitchChannel === 'SMS') {
        content = `Allô ! C'est ${userName} de ${companyName}. J'ai vu la fiche Google de ${lead.businessName} — y'a des petites choses à régler pour attirer plus de monde à ${lead.city || 'Montréal'}. Ça vous tente qu'on jaspe 10 min ? 😊`;
      } else {
        content = `[SCRIPT D'APPEL — Ton : ${pitchTone}]\n\n« Allô, c'est-tu ${lead.contactName || 'le gérant'} de ${lead.businessName} ? Parfait !\n\nMoi c'est ${userName} de ${companyName}. Je vous appelle parce que j'ai checké votre présence sur Google à ${lead.city || 'Montréal'} pis j'ai remarqué des affaires qui pourraient vous aider à avoir plus de clients.\n\nÊtes-vous ouvert à ce qu'on jase 5-10 minutes pour que je vous montre ce que j'ai trouvé ? C'est pas un argumentaire de vente plate, promis — juste vous montrer ce que vos compétiteurs font pis ce qu'on pourrait faire pour vous. »`;
      }
      setResultData({ content });
      setIsRunning(false);

    } else {
      // audit-gmb, radar-reputation, and user-created agents → real AI via /api/agents/run
      const userAgent = userAgents.find(a => a.id === activeAgentId);
      const params: Record<string, string> = {
        auditMode,
        reviewSource,
        pitchTone,
        pitchChannel,
        ...(userAgent ? { agentName: userAgent.name, agentPrompt: userAgent.instructions || '' } : {}),
      };

      const [apiResult] = await Promise.all([
        fetch(getApiUrl('/api/agents/run'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: activeAgentId,
            lead: {
              businessName: lead.businessName,
              contactName: lead.contactName,
              city: lead.city,
              niche: lead.niche,
              website: lead.website,
            },
            params,
          }),
        }).then(r => r.json()),
        logPromise,
      ]);

      setLogs(prev => [...prev, `[${logSteps.length}/${logSteps.length}] ${logSteps[logSteps.length - 1]}`]);

      if (apiResult.error) {
        setLogs(prev => [...prev, `⚠️ Erreur IA : ${apiResult.error}`]);
        setResultData({ report: `Erreur lors de la génération : ${apiResult.error}` });
      } else {
        setResultData({ report: apiResult.report, score: apiResult.score ?? null });
      }
      setIsRunning(false);
    }
  };

  const handleSaveResult = async () => {
    if (!selectedLeadId || !resultData) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (activeAgentId === 'pitcheur-qc' && resultData.content) {
        const { error } = await supabase
          .from('drafts')
          .insert({
            lead_id: selectedLeadId,
            user_id: user.id,
            channel: pitchChannel,
            tone: pitchTone,
            content: resultData.content,
            status: 'Draft'
          });
        if (error) throw error;
        setSaveSuccess(true);
      } else if (resultData.report) {
        await addNoteToLead(selectedLeadId, resultData.report, 'general');
        setSaveSuccess(true);
      }
    } catch (err) {
      console.error("Error saving agent result to Supabase:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Workspace Fullscreen
  if (activeAgentId) {
    const activeAgentInfo = getActiveAgentInfo();

    return (
      <div className="h-full bg-white flex flex-col font-sans text-[#26251e] selection:bg-[#059669]/10">
        {/* Workspace Top Header Bar */}
        <div className="h-16 border-b border-[#e5e5e0] px-6 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveAgentId(null);
                setSelectedLeadId('');
                setLogs([]);
                setResultData(null);
                setSaveSuccess(false);
              }}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-[#7a7a76] hover:text-[#26251e] transition-colors"
              title={t('agents.workspace.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <MinervaAgentIcon />
              <div className="text-left">
                <h2 className="font-bold text-sm leading-tight">{activeAgentInfo.name}</h2>
                <p className="text-[10px] text-[#7a7a76] font-medium">{t('agents.workspace.interactive_workspace')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a7a76]">{t('agents.workspace.by')} <strong className="text-[#26251e] font-semibold">{activeAgentInfo.isBuiltin ? 'Minerva' : userName}</strong></span>
          </div>
        </div>

        {/* Workspace Layout Split */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* Left Side: Parameters Form */}
          <div className="w-96 border-r border-[#e5e5e0] bg-[#fdfdfc]/50 p-6 flex flex-col justify-between overflow-y-auto shrink-0 text-left">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">{t('agents.workspace.step1_configure_lead')}</h3>
                <label htmlFor="lead-select" className="block text-xs font-bold text-[#26251e] mb-1.5">{t('agents.workspace.choose_lead_label')}</label>
                <select
                  id="lead-select"
                  title={t('agents.workspace.choose_lead_label')}
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    setResultData(null);
                    setLogs([]);
                    setSaveSuccess(false);
                  }}
                  className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] cursor-pointer"
                >
                  <option value="">{t('agents.workspace.select_lead_option')}</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.businessName} ({lead.city || t('agents.workspace.no_city')})
                    </option>
                  ))}
                </select>
                {leads.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">{t('agents.workspace.no_lead_available')}</p>
                )}
              </div>

              {/* Agent specific options */}
              {activeAgentId === 'audit-gmb' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">{t('agents.workspace.step2_audit_mode')}</h3>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="auditMode"
                          checked={auditMode === 'quick'}
                          onChange={() => setAuditMode('quick')}
                          className="text-[#059669] focus:ring-[#059669]"
                        />
                        <span>{t('agents.workspace.audit_mode_quick')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="auditMode"
                          checked={auditMode === 'deep'}
                          onChange={() => setAuditMode('deep')}
                          className="text-[#059669] focus:ring-[#059669]"
                        />
                        <span>{t('agents.workspace.audit_mode_deep')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeAgentId === 'pitcheur-qc' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">{t('agents.workspace.step2_channel_tone')}</h3>
                    <label className="block text-xs font-bold text-[#26251e] mb-1.5">{t('agents.workspace.prospecting_channel_label')}</label>
                    <div className="flex gap-2">
                      {(['Email', 'SMS', 'Appel'] as const).map(ch => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setPitchChannel(ch)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-md border text-center transition-colors ${pitchChannel === ch ? 'bg-[#059669] border-[#059669] text-white' : 'bg-white border-[#e6e5e0] text-[#555552] hover:bg-slate-50'}`}
                        >
                          {ch === 'Email' ? t('agents.workspace.channel_email') : ch === 'SMS' ? t('agents.workspace.channel_sms') : t('agents.workspace.channel_call')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pitch-tone-select" className="block text-xs font-bold text-[#26251e] mb-1.5">{t('agents.workspace.pitch_tone_label')}</label>
                    <select
                      id="pitch-tone-select"
                      title={t('agents.workspace.pitch_tone_label')}
                      value={pitchTone}
                      onChange={(e) => setPitchTone(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    >
                      <option value="Chaleureux">{t('agents.workspace.tone_warm')}</option>
                      <option value="Direct">{t('agents.workspace.tone_direct')}</option>
                      <option value="Storytelling">{t('agents.workspace.tone_storytelling')}</option>
                    </select>
                  </div>
                </div>
              )}

              {activeAgentId === 'radar-reputation' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">{t('agents.workspace.step2_extraction_source')}</h3>
                    <label htmlFor="review-source-select" className="block text-xs font-bold text-[#26251e] mb-1.5">{t('agents.workspace.review_network_label')}</label>
                    <select
                      id="review-source-select"
                      title={t('agents.workspace.review_network_label')}
                      value={reviewSource}
                      onChange={(e) => setReviewSource(e.target.value as 'google' | 'yelp' | 'facebook')}
                      className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    >
                      <option value="google">Google Maps</option>
                      <option value="yelp">Yelp</option>
                      <option value="facebook">Facebook</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#e5e5e0]/60 space-y-3">
              <Button
                onClick={handleRunAgent}
                disabled={!selectedLeadId || isRunning}
                className="w-full h-10 font-bold text-xs bg-[#059669] hover:bg-[#047857] text-white flex items-center justify-center gap-2 rounded-lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('agents.workspace.running')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>{t('agents.workspace.run_agent')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Side: Interactive Console and Output Panel */}
          <div className="flex-1 bg-slate-50/50 p-8 flex flex-col justify-between overflow-y-auto text-left">
            <div className="space-y-6 flex-1 flex flex-col justify-start">

              {/* Console log box when running or complete */}
              {(isRunning || logs.length > 0) && (
                <div className="border border-[#e5e5e0] bg-[#181717] text-[#10b981] font-mono text-[11px] p-4.5 rounded-xl space-y-1.5 shadow-xs overflow-hidden max-h-[160px] flex flex-col justify-end shrink-0">
                  <div className="text-[#7a7a76] text-[10px] mb-1 uppercase tracking-wider pb-1 border-b border-white/10 flex justify-between">
                    <span>{t('agents.workspace.terminal_label')}</span>
                    {isRunning && <span className="animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>{t('agents.workspace.live_badge')}</span>}
                  </div>
                  <div className="overflow-y-auto max-h-[110px] space-y-1 scrollbar-thin scrollbar-thumb-white/15">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-white/40">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                    {isRunning && (
                      <div className="flex gap-2 text-white/60 animate-pulse">
                        <span className="text-white/40">&gt;</span>
                        <span>{t('agents.workspace.analyzing')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action output card */}
              {!isRunning && !resultData ? (
                <div className="flex-1 border border-dashed border-[#e5e5e0] rounded-2xl flex flex-col items-center justify-center p-10 bg-white space-y-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-[#059669]/5 flex items-center justify-center border border-[#059669]/10">
                    <Sparkles className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div className="space-y-1.5 text-center max-w-sm">
                    <h4 className="font-bold text-sm text-[#26251e]">{t('agents.workspace.ready_title')}</h4>
                    <p className="text-xs text-[#7a7a76]">{t('agents.workspace.ready_desc')}</p>
                  </div>
                </div>
              ) : isRunning ? (
                <div className="flex-1 border border-[#e5e5e0] rounded-2xl flex flex-col items-center justify-center p-10 bg-white space-y-4 shadow-2xs">
                  <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
                  <div className="space-y-1.5 text-center">
                    <h4 className="font-bold text-sm text-[#26251e]">{t('agents.workspace.in_action_title')}</h4>
                    <p className="text-xs text-[#7a7a76] max-w-xs leading-relaxed">{t('agents.workspace.in_action_desc')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-5 animate-in fade-in duration-200">

                  {/* Audit GMB Output */}
                  {activeAgentId === 'audit-gmb' && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#059669]" />
                            <span className="font-bold text-xs">{t('agents.workspace.gmb_report_title')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#7a7a76]">{t('agents.workspace.gmb_score_label')}</span>
                            <div className="h-7 px-2.5 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center font-bold text-xs text-[#059669]">
                              {resultData.score}/100
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#fcfcfb] border border-[#e5e5e0]/60 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-left">
                          {resultData.report}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0]/60">
                        <p className="text-[10px] text-[#7a7a76]">{t('agents.workspace.gmb_save_note')}</p>
                        <Button
                          onClick={handleSaveResult}
                          disabled={isSaving || saveSuccess}
                          className={`h-9 font-bold text-xs rounded-lg px-4 flex items-center gap-1.5 transition-all ${saveSuccess ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20 hover:bg-[#059669]/10' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : saveSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{t('agents.workspace.gmb_saved')}</span>
                            </>
                          ) : (
                            <span>{t('agents.workspace.gmb_save_btn')}</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Pitcheur QC Output */}
                  {activeAgentId === 'pitcheur-qc' && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#059669]" />
                            <span className="font-bold text-xs">{t('agents.workspace.pitch_report_title')} ({pitchChannel})</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] bg-[#fdfdfc] border border-[#e5e5e0] px-2 py-0.5 rounded">
                            {t('agents.workspace.pitch_tone_badge')}: {pitchTone}
                          </span>
                        </div>

                        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xs">
                          <div className="bg-[#fcfcfb] px-4 py-2 border-b border-[#e5e5e0] text-[11px] text-[#7a7a76] space-y-1 font-medium">
                            <div><span className="text-[#26251e] font-semibold">{t('agents.workspace.pitch_recipient')} :</span> {leads.find(l => l.id === selectedLeadId)?.contactEmail || 'non-renseigne@prospect.qc.ca'}</div>
                            <div><span className="text-[#26251e] font-semibold">{t('agents.workspace.pitch_sender')} :</span> {userName} ({companyName})</div>
                          </div>
                          <textarea
                            title={t('agents.workspace.pitch_content_title')}
                            placeholder={t('agents.workspace.pitch_content_title')}
                            value={resultData.content}
                            onChange={(e) => setResultData({ content: e.target.value })}
                            className="w-full text-xs p-4 bg-white focus:outline-none h-64 font-sans leading-relaxed resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0]/60">
                        <p className="text-[10px] text-[#7a7a76]">{t('agents.workspace.pitch_save_note')}</p>
                        <Button
                          onClick={handleSaveResult}
                          disabled={isSaving || saveSuccess}
                          className={`h-9 font-bold text-xs rounded-lg px-4 flex items-center gap-1.5 transition-all ${saveSuccess ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20 hover:bg-[#059669]/10' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : saveSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{t('agents.workspace.pitch_saved')}</span>
                            </>
                          ) : (
                            <span>{t('agents.workspace.pitch_save_btn')}</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Radar Réputation Output */}
                  {activeAgentId === 'radar-reputation' && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-[#26251e] fill-[#26251e]" />
                            <span className="font-bold text-xs">{t('agents.workspace.radar_report_title')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#7a7a76] font-medium mr-1.5">{t('agents.workspace.radar_rating_label')}</span>
                            <span className="font-bold text-xs">{resultData.rating}/5</span>
                            <span className="text-[10px] text-[#7a7a76]">({resultData.totalReviews} {t('agents.workspace.radar_reviews_suffix')})</span>
                          </div>
                        </div>
                        <div className="bg-[#fcfcfb] border border-[#e5e5e0]/60 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-left">
                          {resultData.report}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0]/60">
                        <p className="text-[10px] text-[#7a7a76]">{t('agents.workspace.radar_save_note')}</p>
                        <Button
                          onClick={handleSaveResult}
                          disabled={isSaving || saveSuccess}
                          className={`h-9 font-bold text-xs rounded-lg px-4 flex items-center gap-1.5 transition-all ${saveSuccess ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20 hover:bg-[#059669]/10' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : saveSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{t('agents.workspace.radar_saved')}</span>
                            </>
                          ) : (
                            <span>{t('agents.workspace.radar_save_btn')}</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Generic user-created agent output */}
                  {!['audit-gmb', 'pitcheur-qc', 'radar-reputation'].includes(activeAgentId) && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="bg-[#fcfcfb] border border-[#e5e5e0]/60 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-left">
                        {resultData.report}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#059669]/10">

        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5 text-left">
            <h1 className="text-xl font-bold text-[#26251e]">{t('agents.page_title')}</h1>
            <p className="text-xs text-[#7a7a76]">
              {t('agents.page_subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Link href="/agents/store">
              <Button
                variant="ghost"
                size="sm"
                className="h-8.5 text-xs font-semibold px-3 text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 rounded-md"
              >
                <Store className="h-3.5 w-3.5" />
                <span>{t('agents.store_btn')}</span>
              </Button>
            </Link>
            <Link href="/agents/new">
              <Button
                size="sm"
                className="h-8.5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 rounded-md px-3.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('agents.create_btn')}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter and Search Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8.5 text-xs font-semibold px-3 border-[#e5e5e0] text-[#555552] hover:text-[#26251e] rounded-md flex items-center gap-1.5 bg-white"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#7a7a76]" />
            <span>{t('agents.filters_btn')}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76] ml-0.5" />
          </Button>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
            <Input
              placeholder={t('agents.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
            />
          </div>
        </div>

        {/* Community banner */}
        <div className="relative border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xs h-[75px] bg-[#f4f4f3]/10 flex items-center justify-between px-6 py-4">
          <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-grid-pattern" />
          <div className="z-10 text-left space-y-0.5">
            <h3 className="text-xs font-bold text-[#26251e]">{t('agents.community_banner_title')}</h3>
            <p className="text-[11px] text-[#7a7a76]">{t('agents.community_banner_desc')}</p>
          </div>
          <Link href="/agents/store">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold px-3 border-[#e5e5e0] text-[#26251e] bg-white rounded-md z-10 shrink-0 hover:bg-[#f4f4f3]/60"
            >
              {t('agents.community_store_btn')}
            </Button>
          </Link>
        </div>

        {/* All Agents Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-[#e5e5e0] pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
              <span>{t('agents.all_agents_label')}</span>
              <span className="text-[10px] lowercase font-normal text-[#7a7a76]">
                | {sortedAgents.length + (showLucifeeCard ? 1 : 0)} {t('agents.agents_count_suffix')}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy(sortBy === 'popular' ? 'newest' : 'popular')}
              className="h-7 text-xs font-semibold px-2 text-[#7a7a76] hover:text-[#26251e] flex items-center gap-1 rounded"
            >
              <span>{sortBy === 'popular' ? t('agents.sort_popular') : t('agents.sort_newest')}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {sortedAgents.map((agent) => (
              <Link
                key={'all-' + agent.id}
                href={`/agents/${agent.id}`}
                className="p-5 border border-[#e5e5e0] hover:border-[#7a7a76] bg-white rounded-xl flex flex-col justify-between min-h-[160px] h-auto pb-4 shadow-2xs transition-all relative overflow-hidden group cursor-pointer block no-underline"
              >
                <div className="space-y-2 text-left">
                  <div className="flex items-start justify-between">
                    <MinervaAgentIcon />
                    {agent.isBuiltin ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-[#059669]/10 text-[#059669] px-1.5 py-0.5 rounded border border-[#059669]/20">
                        {agent.category}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteAgent(agent.id);
                        }}
                        className="text-[#7a7a76] hover:text-red-600 p-0.5 rounded-md hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('agents.delete_agent_title')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-bold text-xs text-[#26251e] truncate">{agent.name}</h3>
                  <p className="text-[11px] text-[#7a7a76] leading-relaxed line-clamp-4">
                    {agent.description}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#7a7a76] font-medium border-t border-[#e5e5e0]/60 pt-2.5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#e5e5e2] flex items-center justify-center text-[8px] font-bold text-[#26251e]">
                      {agent.owner.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate max-w-[100px]">{agent.owner}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-[#7a7a76]" />
                    <span>{agent.chatsCount}</span>
                  </div>
                </div>
              </Link>
            ))}

            {/* Lucifee Easter Egg Card */}
            {showLucifeeCard && (
              <Link href="/agents/lucifee" className="block">
                <div className="p-5 border-2 border-[#7c3aed]/30 hover:border-[#7c3aed]/60 bg-[#7c3aed]/5 rounded-xl flex flex-col justify-between min-h-[160px] h-auto pb-4 shadow-2xs transition-all relative overflow-hidden group cursor-pointer animate-pulse [animation-duration:3s]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/5 via-transparent to-[#7c3aed]/10 pointer-events-none" />

                  <div className="space-y-2 text-left relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-full bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4 text-[#7c3aed] fill-[#7c3aed]" />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-[#7c3aed]/20 text-[#7c3aed] px-1.5 py-0.5 rounded border border-[#7c3aed]/30">
                        🥚 {t('agents.lucifee_badge')}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-[#7c3aed]">Lucifee 💜</h3>
                    <p className="text-[11px] text-[#7a7a76] leading-relaxed line-clamp-4">
                      {t('agents.lucifee_description')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7c3aed] font-medium border-t border-[#7c3aed]/20 pt-2.5 mt-2 relative z-10">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#7c3aed]/20 flex items-center justify-center text-[8px] font-bold text-[#7c3aed]">
                        L
                      </div>
                      <span>Lucifee</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      <span>{t('agents.lucifee_open_btn')}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {sortedAgents.length === 0 && !showLucifeeCard && (
              <div className="col-span-full border border-dashed border-[#e5e5e0] rounded-xl p-10 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f4f3] flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#7a7a76]" />
                </div>
                <div className="space-y-1 text-center">
                  <h4 className="text-sm font-bold text-[#26251e]">{t('agents.empty_state_title')}</h4>
                  <p className="text-xs text-[#7a7a76]">{t('agents.empty_state_desc')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
