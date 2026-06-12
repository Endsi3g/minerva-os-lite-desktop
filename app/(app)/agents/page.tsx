'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  SlidersHorizontal, 
  Clock, 
  MessageSquare, 
  LayoutGrid, 
  X,
  Sparkles,
  ArrowLeft,
  Check,
  Loader2,
  Play,
  FileText,
  Mail,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MinervaIcon } from '@/components/icons';
import { getAgents, addAgent, deleteAgent, Agent } from '@/lib/onboarding-store';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

interface AgentResult {
  score?: number;
  report?: string;
  content?: string;
  rating?: string;
  totalReviews?: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create agent form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconType, setIconType] = useState<'minerva' | 'gradient' | 'black'>('minerva');

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

  // Specific workspace configuration options
  const [auditMode, setAuditMode] = useState<'quick' | 'deep'>('quick');
  const [outreachChannel, setOutreachChannel] = useState<'Email' | 'DM' | 'Call'>('Email');
  const [outreachTone, setOutreachTone] = useState<string>('Calme & Professionnel');
  const [outreachInstructions, setOutreachInstructions] = useState<string>('');
  const [reviewSource, setReviewSource] = useState<'google' | 'yelp'>('google');

  useEffect(() => {
    const syncStore = () => {
      setAgents(getAgents());
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

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addAgent({
      name: name.trim(),
      description: description.trim(),
      iconType
    });

    setName('');
    setDescription('');
    setIconType('minerva');
    setShowCreateModal(false);
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.id.localeCompare(a.id);
    }
    return a.name.localeCompare(b.name);
  });

  // Render the appropriate icon for the agent card
  const renderAgentIcon = (type: 'minerva' | 'gradient' | 'black', size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'md' ? 'w-12 h-12 text-base' : 'w-8 h-8 text-xs';
    const minervaIconSize = size === 'md' ? 24 : 16;
    
    switch (type) {
      case 'minerva':
        return (
          <div className={`${sizeClasses} rounded-full bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0`}>
            <MinervaIcon size={minervaIconSize} />
          </div>
        );
      case 'gradient':
        return (
          <div className={`${sizeClasses} rounded-full bg-gradient-to-tr from-[#ffba00] via-[#ea4335] via-[#a98aff] to-[#2ccfca] border border-[#e5e5e0] shrink-0`} />
        );
      case 'black':
        return (
          <div className={`${sizeClasses} rounded-full bg-[#181717] flex items-center justify-center font-bold text-white uppercase tracking-tighter shrink-0 select-none ${size === 'md' ? 'text-[9px]' : 'text-[7px]'}`}>
            ASMOB
          </div>
        );
    }
  };

  const handleRunAgent = async () => {
    if (!selectedLeadId) return;
    setIsRunning(true);
    setLogs([]);
    setResultData(null);
    setSaveSuccess(false);

    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    if (activeAgentId === 'tableau-insight') {
      const steps = [
        `Connexion à l'outil d'audit SEO pour ${lead.businessName}...`,
        `Analyse du site web (détection responsive et balises meta)...`,
        `Évaluation de la vitesse sur mobile (${auditMode === 'deep' ? 'Analyse approfondie de la bande passante' : 'Scan rapide Pre-Render'})...`,
        `Vérification de la présence et revendication de la fiche Google Maps...`,
        `Génération du rapport final...`
      ];

      for (let i = 0; i < steps.length; i++) {
        setLogs(prev => [...prev, `[${i + 1}/${steps.length}] ${steps[i]}`]);
        await new Promise(r => setTimeout(r, 600));
      }

      // Generate SEO Score and Report
      const score = Math.floor(Math.random() * 25) + 55; // 55 to 80
      const mockReport = `# Rapport d'Audit SEO - ${lead.businessName}
**Score Global :** ${score}/100
**Mode d'Analyse :** ${auditMode === 'deep' ? 'Analyse Profonde' : 'Scan Rapide'}
**Date :** ${new Date().toLocaleDateString('fr-FR')}

## Observations Clés :
- ⚠️ Fiche Google My Business non revendiquée ou mal optimisée.
- ❌ Balise méta-description absente sur la page d'accueil.
- ⚠️ Temps de chargement sur mobile de 4,3 secondes (Optimisation d'images requise).
- ✅ Certificat SSL activé et valide.

## Recommandations prioritaires :
1. Revendiquer et configurer la fiche d'établissement GMB.
2. Ajouter une méta-description contenant la ville (${lead.city || 'locale'}) et le secteur d'activité.
3. Compresser les images lourdes pour optimiser la vitesse mobile.`;

      setResultData({ score, report: mockReport });
      setIsRunning(false);

    } else if (activeAgentId === 'health-assistant') {
      const steps = [
        `Analyse du profil de ${lead.businessName} (Secteur: ${lead.niche || 'Général'})...`,
        `Extraction des notes et des points de contact (Canal: ${outreachChannel})...`,
        `Structuration de la proposition de valeur avec le ton "${outreachTone}"...`,
        `Rédaction du message personnalisé final...`
      ];

      for (let i = 0; i < steps.length; i++) {
        setLogs(prev => [...prev, `[${i + 1}/${steps.length}] ${steps[i]}`]);
        await new Promise(r => setTimeout(r, 600));
      }

      let generatedContent = '';
      if (outreachChannel === 'Email') {
        generatedContent = `Objet : Question concernant la visibilité en ligne de ${lead.businessName}\n\nBonjour ${lead.contactName || 'le gérant'},\n\nJ'ai récemment analysé la présence sur Google de ${lead.businessName} à ${lead.city || 'votre ville'} et j'ai repéré quelques détails importants concernant votre référencement.\n\nNotamment, votre fiche d'établissement ne ressort pas sur les recherches locales clés de votre secteur. À l'agence ${companyName}, nous aidons les professionnels locaux à corriger cela pour attirer de nouveaux clients directement.\n\nSeriez-vous disponible pour un appel de 5 minutes ce jeudi afin que je vous montre les opportunités concrètes ?\n\nBien cordialement,\n${userName}\n${companyName}`;
      } else if (outreachChannel === 'DM') {
        generatedContent = `Salut ${lead.contactName || 'l\'équipe'},\nJ'adore ce que vous proposez chez ${lead.businessName} ! Je me demandais si vous étiez au courant que votre fiche Google Maps manquait d'avis récents pour ressortir à ${lead.city || 'votre ville'}. J'ai préparé un mini audit vidéo gratuit de 2 minutes pour vous montrer comment y remédier. Ça vous intéresse ?\nBonne journée, ${userName}`;
      } else {
        generatedContent = `[SCRIPT D'APPEL TÉLÉPHONIQUE]\nTon : ${outreachTone}\n\nIntro : "Bonjour ${lead.contactName || 'le gérant'}, c'est ${userName} de ${companyName}. Je vous contacte brièvement au sujet de ${lead.businessName} à ${lead.city}..."\n\nPoint d'accroche : "J'ai remarqué sur Internet que votre fiche Google locale n'est pas encore optimisée, ce qui vous fait perdre de la visibilité face aux concurrents de la zone..."\n\nAppel à l'action : "Je propose de vous envoyer un rapide audit vidéo de 2 minutes par email, ou qu'on prenne 5 minutes pour en parler de vive voix ce vendredi matin. Quelle heure vous conviendrait le mieux ?"`;
      }

      setResultData({ content: generatedContent });
      setIsRunning(false);

    } else if (activeAgentId === 'asmobbin-agent') {
      const steps = [
        `Connexion au flux d'avis ${reviewSource === 'google' ? 'Google' : 'Yelp'} de ${lead.businessName}...`,
        `Extraction des avis clients récents...`,
        `Analyse des sentiments des retours clients...`,
        `Rédaction de modèles de réponses automatiques personnalisées...`
      ];

      for (let i = 0; i < steps.length; i++) {
        setLogs(prev => [...prev, `[${i + 1}/${steps.length}] ${steps[i]}`]);
        await new Promise(r => setTimeout(r, 600));
      }

      const rating = (Math.random() * 1.5 + 3.0).toFixed(1); // 3.0 to 4.5
      const totalReviews = Math.floor(Math.random() * 18) + 5; // 5 to 23
      const mockRepReport = `# Rapport de Réputation Client - ${lead.businessName}
**Note Moyenne :** ${rating}/5 étoiles (${totalReviews} avis analysés via ${reviewSource === 'google' ? 'Google' : 'Yelp'})
**Sentiment dominant :** ${parseFloat(rating) >= 4.0 ? 'Positif' : 'Mitigé'}

## 💬 Modèle de réponse pour avis Positif (5 étoiles) :
"Bonjour ! Un grand merci pour votre retour chaleureux. Notre équipe est ravie de savoir que vous avez apprécié votre expérience chez ${lead.businessName}. Au plaisir de vous accueillir de nouveau !"

## ⚠️ Modèle de réponse pour avis Critique (1-2 étoiles) :
"Bonjour, nous sommes désolés d'apprendre que votre dernière visite n'a pas été à la hauteur de vos attentes. Nous attachons une grande importance à la satisfaction de nos clients. Pouvez-vous nous contacter directement par email pour que nous comprenions mieux la situation et puissions y remédier ?"`;

      setResultData({ rating, totalReviews, report: mockRepReport });
      setIsRunning(false);
    }
  };

  const handleSaveResult = async () => {
    if (!selectedLeadId || !resultData) return;
    setIsSaving(true);
    try {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (!lead) return;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (activeAgentId === 'tableau-insight') {
        if (resultData.report) {
          await addNoteToLead(selectedLeadId, resultData.report, 'general');
          setSaveSuccess(true);
        }
      } else if (activeAgentId === 'health-assistant') {
        if (resultData.content) {
          const { error } = await supabase
            .from('drafts')
            .insert({
              lead_id: selectedLeadId,
              user_id: user.id,
              channel: outreachChannel,
              tone: outreachTone,
              content: resultData.content,
              status: 'Draft'
            });
          if (error) throw error;
          setSaveSuccess(true);
        }
      } else if (activeAgentId === 'asmobbin-agent') {
        if (resultData.report) {
          await addNoteToLead(selectedLeadId, resultData.report, 'general');
          setSaveSuccess(true);
        }
      }
    } catch (err) {
      console.error("Error saving agent result to Supabase:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Workspace Fullscreen
  if (activeAgentId) {
    const activeAgent = agents.find(a => a.id === activeAgentId);
    
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
              title="Retour aux agents"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {activeAgent && renderAgentIcon(activeAgent.iconType, 'sm')}
              <div className="text-left">
                <h2 className="font-bold text-sm leading-tight">{activeAgent?.name}</h2>
                <p className="text-[10px] text-[#7a7a76] font-medium">Workspace Interactif</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7a7a76]">Auteur : <strong className="text-[#26251e] font-semibold">{activeAgent?.owner}</strong></span>
          </div>
        </div>

        {/* Workspace Layout Split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left Side: Parameters Form */}
          <div className="w-96 border-r border-[#e5e5e0] bg-[#fdfdfc]/50 p-6 flex flex-col justify-between overflow-y-auto shrink-0 text-left">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">1. Configurer le Prospect</h3>
                <label htmlFor="lead-select" className="block text-xs font-bold text-[#26251e] mb-1.5">Choisir un prospect ciblé</label>
                <select
                  id="lead-select"
                  title="Choisir un prospect ciblé"
                  value={selectedLeadId}
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    setResultData(null);
                    setLogs([]);
                    setSaveSuccess(false);
                  }}
                  className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] cursor-pointer"
                >
                  <option value="">-- Sélectionner un prospect --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.businessName} ({lead.city || 'Sans ville'})
                    </option>
                  ))}
                </select>
                {leads.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">Aucun prospect disponible. Veuillez d&apos;abord en créer un dans l&apos;application.</p>
                )}
              </div>

              {/* Agent specific options */}
              {activeAgentId === 'tableau-insight' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">2. Mode d&apos;analyse</h3>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input 
                          type="radio" 
                          name="auditMode" 
                          checked={auditMode === 'quick'} 
                          onChange={() => setAuditMode('quick')}
                          className="text-[#059669] focus:ring-[#059669]"
                        />
                        <span>Scan rapide</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                        <input 
                          type="radio" 
                          name="auditMode" 
                          checked={auditMode === 'deep'} 
                          onChange={() => setAuditMode('deep')}
                          className="text-[#059669] focus:ring-[#059669]"
                        />
                        <span>Analyse profonde</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dest-url-input" className="block text-xs font-bold text-[#26251e] mb-1.5">URL de destination (simulé)</label>
                    <input 
                      id="dest-url-input"
                      title="URL de destination (simulé)"
                      placeholder="URL de destination (simulé)"
                      type="text" 
                      disabled
                      value={selectedLeadId ? `www.${leads.find(l => l.id === selectedLeadId)?.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.fr` : 'Sélectionnez un prospect'}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-[#e6e5e0] rounded-md text-slate-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {activeAgentId === 'health-assistant' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">2. Paramètres du message</h3>
                    <label className="block text-xs font-bold text-[#26251e] mb-1.5">Canal de prospection</label>
                    <div className="flex gap-2">
                      {(['Email', 'DM', 'Call'] as const).map(ch => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setOutreachChannel(ch)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-md border text-center transition-colors ${outreachChannel === ch ? 'bg-[#059669] border-[#059669] text-white' : 'bg-white border-[#e6e5e0] text-[#555552] hover:bg-slate-50'}`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="outreach-tone-select" className="block text-xs font-bold text-[#26251e] mb-1.5">Ton rédactionnel</label>
                    <select
                      id="outreach-tone-select"
                      title="Ton rédactionnel"
                      value={outreachTone}
                      onChange={(e) => setOutreachTone(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    >
                      <option value="Calme & Professionnel">Calme & Professionnel</option>
                      <option value="Amical & Enthousiaste">Amical & Enthousiaste</option>
                      <option value="Direct & Concis">Direct & Concis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#26251e] mb-1.5">Instructions spécifiques (Optionnel)</label>
                    <textarea
                      placeholder="Ex: Insister sur la création d'un système de commande en ligne."
                      value={outreachInstructions}
                      onChange={(e) => setOutreachInstructions(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-20 resize-none"
                    />
                  </div>
                </div>
              )}

              {activeAgentId === 'asmobbin-agent' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider mb-2">2. Source d&apos;extraction</h3>
                    <label htmlFor="review-source-select" className="block text-xs font-bold text-[#26251e] mb-1.5">Réseau d&apos;avis</label>
                    <select
                      id="review-source-select"
                      title="Réseau d'avis"
                      value={reviewSource}
                      onChange={(e) => setReviewSource(e.target.value as 'google' | 'yelp')}
                      className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    >
                      <option value="google">Google Maps Business Reviews</option>
                      <option value="yelp">Yelp Local Directory</option>
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
                    <span>Exécution en cours...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Lancer l&apos;Agent</span>
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
                    <span>Terminal d&apos;exécution</span>
                    {isRunning && <span className="animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>Live</span>}
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
                        <span>Analyse en cours...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action output card */}
              {!isRunning && !resultData ? (
                // Pre-run Empty State
                <div className="flex-1 border border-dashed border-[#e5e5e0] rounded-2xl flex flex-col items-center justify-center p-10 bg-white space-y-4 shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-[#059669]/5 flex items-center justify-center border border-[#059669]/10">
                    <Sparkles className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div className="space-y-1.5 text-center max-w-sm">
                    <h4 className="font-bold text-sm text-[#26251e]">Espace de Travail Prêt</h4>
                    <p className="text-xs text-[#7a7a76]">Sélectionnez un prospect local dans la colonne latérale gauche puis cliquez sur <strong>Lancer l&apos;Agent</strong> pour débuter l&apos;analyse automatisée.</p>
                  </div>
                </div>
              ) : isRunning ? (
                // Running Load State
                <div className="flex-1 border border-[#e5e5e0] rounded-2xl flex flex-col items-center justify-center p-10 bg-white space-y-4 shadow-2xs">
                  <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
                  <div className="space-y-1.5 text-center">
                    <h4 className="font-bold text-sm text-[#26251e]">Agent en Action</h4>
                    <p className="text-xs text-[#7a7a76] max-w-xs leading-relaxed">Veuillez patienter pendant que Minerva récolte les informations et structure le rendu...</p>
                  </div>
                </div>
              ) : (
                // Complete Result state
                <div className="flex-1 flex flex-col space-y-5 animate-in fade-in duration-200">
                  
                  {/* Tableau Insight Explorer Output */}
                  {activeAgentId === 'tableau-insight' && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#059669]" />
                            <span className="font-bold text-xs">Rapport SEO généré</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#7a7a76]">Score :</span>
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
                        <p className="text-[10px] text-[#7a7a76]">Le rapport sera enregistré dans l&apos;historique des notes de ce prospect.</p>
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
                              <span>Audit Enregistré !</span>
                            </>
                          ) : (
                            <span>Enregistrer dans les notes</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Health Assistant Output */}
                  {activeAgentId === 'health-assistant' && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#059669]" />
                            <span className="font-bold text-xs">Aperçu du brouillon ({outreachChannel})</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] bg-[#fdfdfc] border border-[#e5e5e0] px-2 py-0.5 rounded">
                            Ton: {outreachTone}
                          </span>
                        </div>

                        {/* Simulated client box */}
                        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xs">
                          <div className="bg-[#fcfcfb] px-4 py-2 border-b border-[#e5e5e0] text-[11px] text-[#7a7a76] space-y-1 font-medium">
                            <div><span className="text-[#26251e] font-semibold">Destinataire :</span> {leads.find(l => l.id === selectedLeadId)?.contactEmail || 'non-renseigne@prospect.fr'}</div>
                            <div><span className="text-[#26251e] font-semibold">Expéditeur :</span> {userName} ({companyName})</div>
                          </div>
                          <textarea
                            title="Contenu du message"
                            placeholder="Contenu du message"
                            value={resultData.content}
                            onChange={(e) => setResultData({ content: e.target.value })}
                            className="w-full text-xs p-4 bg-white focus:outline-none h-64 font-sans leading-relaxed resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0]/60">
                        <p className="text-[10px] text-[#7a7a76]">Le message sera enregistré dans la section brouillons de ce prospect.</p>
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
                              <span>Brouillon enregistré !</span>
                            </>
                          ) : (
                            <span>Enregistrer dans les Brouillons</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ASMobbin Agent Output */}
                  {activeAgentId === 'asmobbin-agent' && resultData && (
                    <div className="border border-[#e5e5e0] rounded-2xl bg-white p-6 space-y-5 shadow-2xs flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-4">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold text-xs">Analyse de Réputation Locale</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#7a7a76] font-medium mr-1.5">Note locale estimée:</span>
                            <div className="flex items-center text-amber-500 mr-1">
                              <Star className="w-3.5 h-3.5 fill-amber-500" />
                            </div>
                            <span className="font-bold text-xs">{resultData.rating}/5</span>
                            <span className="text-[10px] text-[#7a7a76]">({resultData.totalReviews} avis)</span>
                          </div>
                        </div>
                        <div className="bg-[#fcfcfb] border border-[#e5e5e0]/60 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-left">
                          {resultData.report}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#e5e5e0]/60">
                        <p className="text-[10px] text-[#7a7a76]">Ces modèles seront sauvegardés dans les notes du prospect.</p>
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
                              <span>Plan enregistré !</span>
                            </>
                          ) : (
                            <span>Sauvegarder dans les Notes</span>
                          )}
                        </Button>
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
            <h1 className="text-xl font-bold text-[#26251e]">Agents</h1>
            <p className="text-xs text-[#7a7a76]">
              Specialized chatbots you can configure for specific use cases or documents.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8.5 text-xs font-semibold px-3 text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 rounded-md"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Browse templates</span>
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              size="sm" 
              className="h-8.5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 rounded-md px-3.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create agent</span>
            </Button>
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
            <span>Filters</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76] ml-0.5" />
          </Button>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
            <Input 
              placeholder="Search agents"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
            />
          </div>
        </div>

        {/* Recently Used Section */}
        {sortedAgents.length > 0 && searchQuery === '' && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
              <Clock className="h-3.5 w-3.5" />
              <span>Recently used</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {sortedAgents.slice(0, 3).map((agent) => (
                <div 
                  key={'recent-' + agent.id}
                  onClick={() => setActiveAgentId(agent.id)}
                  className="p-5 border border-[#e5e5e0] hover:border-[#7a7a76] bg-white rounded-xl flex flex-col justify-between h-[155px] shadow-2xs transition-all relative overflow-hidden group cursor-pointer"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-start justify-between">
                      {renderAgentIcon(agent.iconType)}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAgent(agent.id);
                        }}
                        className="text-[#7a7a76] hover:text-red-600 p-0.5 rounded-md hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete agent"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-bold text-xs text-[#26251e] truncate">{agent.name}</h3>
                    <p className="text-[11px] text-[#7a7a76] leading-relaxed line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#7a7a76] font-medium border-t border-[#e5e5e0]/60 pt-2.5 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#e5e5e2] flex items-center justify-center text-[8px] font-bold text-[#26251e]">
                        {agent.owner.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[80px]">{agent.owner}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3 text-[#7a7a76]" />
                        <span>{agent.chatsCount}</span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#e5e5e2]" />
                      <span className="truncate">{agent.lastUsed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Looking for inspiration grid banner */}
        <div className="relative border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xs h-[75px] bg-[#f4f4f3]/10 flex items-center justify-between px-6 py-4">
          <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-grid-pattern" />
          <div className="z-10 text-left space-y-0.5">
            <h3 className="text-xs font-bold text-[#26251e]">Looking for inspiration?</h3>
            <p className="text-[11px] text-[#7a7a76]">Explore our template library to discover pre-built agents and get started quickly</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-semibold px-3 border-[#e5e5e0] text-[#26251e] bg-white rounded-md z-10 shrink-0 hover:bg-[#f4f4f3]/60"
          >
            Browse templates
          </Button>
        </div>

        {/* All Agents Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-[#e5e5e0] pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7a7a76]">
              <span>All agents</span>
              <span className="text-[10px] lowercase font-normal text-[#7a7a76]">
                | {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSortBy(sortBy === 'popular' ? 'newest' : 'popular')}
              className="h-7 text-xs font-semibold px-2 text-[#7a7a76] hover:text-[#26251e] flex items-center gap-1 rounded"
            >
              <span>{sortBy === 'popular' ? 'Most popular' : 'Newest'}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {sortedAgents.length === 0 ? (
            <div className="border border-dashed border-[#e5e5e0] rounded-xl p-10 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#f4f4f3] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#7a7a76]" />
              </div>
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-bold text-[#26251e]">No agents found</h4>
                <p className="text-xs text-[#7a7a76]">Get started by creating your first agent.</p>
              </div>
              <Button 
                onClick={() => setShowCreateModal(true)}
                variant="outline" 
                size="sm" 
                className="h-8 text-xs font-semibold px-3 border-[#e5e5e0] text-[#26251e] bg-white rounded-md"
              >
                Create agent
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {sortedAgents.map((agent) => (
                <div 
                  key={'all-' + agent.id}
                  onClick={() => setActiveAgentId(agent.id)}
                  className="p-5 border border-[#e5e5e0] hover:border-[#7a7a76] bg-white rounded-xl flex flex-col justify-between h-[145px] shadow-2xs transition-all relative overflow-hidden group cursor-pointer"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-start justify-between">
                      {renderAgentIcon(agent.iconType)}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAgent(agent.id);
                        }}
                        className="text-[#7a7a76] hover:text-red-600 p-0.5 rounded-md hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete agent"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-bold text-xs text-[#26251e] truncate">{agent.name}</h3>
                    <p className="text-[11px] text-[#7a7a76] leading-relaxed line-clamp-2">
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
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create Agent Modal Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleCreateAgent} className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">Créer un Agent</h3>
              <p className="text-xs text-[#7a7a76] text-left">Configurez un nouvel assistant IA spécialisé.</p>
            </div>
            
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom de l&apos;agent</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Expert SEO Local"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description</label>
              <textarea 
                placeholder="Ex: Analyse la structure de vos pages web et rédige des suggestions."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-20 resize-none"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block mb-1.5">Style d&apos;icône</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="iconType" 
                    checked={iconType === 'minerva'} 
                    onChange={() => setIconType('minerva')}
                    className="text-[#059669] focus:ring-[#059669]"
                  />
                  <span>Minerva M</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="iconType" 
                    checked={iconType === 'gradient'} 
                    onChange={() => setIconType('gradient')}
                    className="text-[#059669] focus:ring-[#059669]"
                  />
                  <span>Gradient</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="iconType" 
                    checked={iconType === 'black'} 
                    onChange={() => setIconType('black')}
                    className="text-[#059669] focus:ring-[#059669]"
                  />
                  <span>Noir</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-[#e5e5e0]/60">
              <Button 
                type="button"
                variant="ghost"
                onClick={() => {
                  setName('');
                  setDescription('');
                  setIconType('minerva');
                  setShowCreateModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                Créer l&apos;agent
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
