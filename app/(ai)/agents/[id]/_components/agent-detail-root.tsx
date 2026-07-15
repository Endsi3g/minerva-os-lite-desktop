'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MinervaIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { getAgents, updateAgent, Agent, AgentInputField } from '@/lib/onboarding-store';
import {
  ArrowLeft, Play, Star, MessageSquare, User, Camera, Pencil, Check, X,
  Plus, Sparkles, Globe, BarChart3, MapPin, GripVertical, Upload, FileText,
  Loader2, Share2, Mic, Smile, AlignLeft, Wand2, File, ChevronDown,
  CheckCircle2, Info, SlidersHorizontal, Zap, Brain, Settings2
} from 'lucide-react';

interface AgentReview {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku', desc: 'Rapide et économique', badge: 'Rapide', badgeColor: 'blue', requiresKey: false },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet', desc: 'Équilibré, polyvalent', badge: 'Recommandé', badgeColor: 'green', requiresKey: false },
  { id: 'claude-opus-4-8', name: 'Claude Opus', desc: 'Raisonnement avancé', badge: 'Puissant', badgeColor: 'gray', requiresKey: false },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Via OpenRouter', badge: 'Clé requise', badgeColor: 'orange', requiresKey: true },
] as const;

const ACTIONS = [
  { id: 'web-search', Icon: Globe, name: 'Recherche web', desc: "Permet à l'agent de chercher sur internet en temps réel" },
  { id: 'image-gen', Icon: Camera, name: "Génération d'image", desc: 'Génère des visuels et illustrations à la demande' },
  { id: 'data-analyst', Icon: BarChart3, name: 'Analyse de données', desc: 'Interprète et visualise des données CSV, Excel...' },
  { id: 'prospection', Icon: MapPin, name: 'Prospection locale', desc: 'Scrape et enrichit des leads locaux (Montréal, Québec)' },
  { id: 'gmb-audit', Icon: Star, name: 'Audit GMB', desc: "Analyse et optimise la fiche Google My Business" },
];

const SUGGESTED_LABELS = ['Prospection', 'SEO Local', 'Audit', 'Québec', 'Marketing', 'Analyse', 'Support', 'Client'];

const EMOJIS = [
  '🤖', '🧠', '⚡', '🎯', '🔍', '📊', '💡', '🛠️',
  '🏆', '🚀', '🌟', '💼', '🗺️', '📈', '🔮', '🎨',
  '📌', '🧩', '🤝', '💬', '🌐', '📋', '🔧', '✨',
];

const FIELD_TYPE_LABELS: Record<AgentInputField['type'], string> = {
  text: 'TEXTE',
  multiline: 'TEXTE LONG',
  number: 'NOMBRE',
  select: 'SÉLECTION',
  file: 'FICHIER',
  email: 'EMAIL',
  checkbox: 'CHECKBOX',
  date: 'DATE',
};

const FIELD_TYPE_COLORS: Record<AgentInputField['type'], string> = {
  text: 'bg-[#f7f7f4] text-[#555552] border-[#e5e5e0]',
  multiline: 'bg-blue-50 text-blue-600 border-blue-200',
  number: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  select: 'bg-purple-50 text-purple-600 border-purple-200',
  file: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  email: 'bg-teal-50 text-teal-600 border-teal-200',
  checkbox: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  date: 'bg-red-50 text-red-500 border-red-200',
};

const BUILTIN_META: Record<string, Omit<Agent, 'id'> & { isBuiltin: true; category: string }> = {
  'audit-gmb': {
    name: 'Audit GMB Montréal',
    description: "Analyse la fiche Google My Business d'un commerce montréalais et génère un rapport de recommandations avec un score GMB sur 100. Identifie les lacunes dans les horaires, photos, catégories, et répond aux avis négatifs pour améliorer la visibilité locale.",
    iconType: 'minerva',
    owner: 'Minerva',
    chatsCount: '< 50',
    lastUsed: 'Yesterday',
    isBuiltin: true,
    category: 'Audit',
    instructions: "Tu es un auditeur Google My Business expert pour la ville de Montréal. Analyse la fiche du commerce, évalue ses points forts (photos, avis, détails complétés) et génère un rapport de recommandations concrètes avec un score global de visibilité sur 100.",
    inputType: 'form',
    inputFields: [
      { id: 'mode', name: "Mode d'analyse", type: 'select', description: "Niveau de profondeur de l'audit", options: ['Rapide', 'Approfondi'], required: true }
    ],
    actions: [{ id: 'gmb-audit', enabled: true }],
    model: 'claude-sonnet-5',
    creativity: 0.2,
    labels: ['Audit', 'SEO Local', 'Montréal']
  },
  'pitcheur-qc': {
    name: 'Pitcheur Québécois',
    description: "Rédige un pitch de vente authentiquement québécois, adapté au marché local. Choisis ton canal (email, SMS, appel) et ton ton (chaleureux, professionnel, direct). Parfait pour la prospection B2B au Québec.",
    iconType: 'gradient',
    owner: 'Minerva',
    chatsCount: '< 30',
    lastUsed: 'Today',
    isBuiltin: true,
    category: 'Prospection',
    instructions: "Tu es un rédacteur commercial chevronné au Québec. Rédige un pitch de prospection authentique, utilisant des expressions québécoises naturelles sans en faire trop. Adapte le ton au canal choisi (email, SMS ou script d'appel téléphonique).",
    inputType: 'form',
    inputFields: [
      { id: 'canal', name: "Canal", type: 'select', description: "Canal de prospection", options: ['Email', 'SMS', 'Appel'], required: true },
      { id: 'ton', name: "Ton", type: 'select', description: "Ton du message", options: ['Chaleureux', 'Direct', 'Professionnel'], required: true }
    ],
    actions: [{ id: 'prospection', enabled: true }],
    model: 'claude-haiku-4-5-20251001',
    creativity: 0.7,
    labels: ['Prospection', 'Rédacteur']
  },
  'radar-reputation': {
    name: 'Radar Réputation',
    description: "Analyse la réputation en ligne, identifie les avis négatifs et propose des réponses professionnelles adaptées. Surveille Google, Yelp et Facebook pour donner un tableau de bord complet de la e-réputation d'un commerce.",
    iconType: 'black',
    owner: 'Minerva',
    chatsCount: '< 20',
    lastUsed: 'Yesterday',
    isBuiltin: true,
    category: 'Réputation',
    instructions: "Tu es un expert en e-réputation et en service client. Analyse le sentiment général des avis en ligne d'un commerce, liste les avis critiques nécessitant une réponse urgente et propose des modèles de réponse professionnels et désamorceurs de tension.",
    inputType: 'form',
    inputFields: [
      { id: 'reseau', name: "Réseau cible", type: 'select', description: "Réseau social ou plateforme à analyser", options: ['Google Maps', 'Yelp', 'Facebook'], required: true }
    ],
    actions: [{ id: 'gmb-audit', enabled: true }, { id: 'data-analyst', enabled: true }],
    model: 'claude-sonnet-5',
    creativity: 0.3,
    labels: ['Réputation', 'Analyse']
  },
  'lucifee': {
    name: 'Lucifee 💜',
    description: "Un agent secret... Découvert par les plus curieux. Lucifee est une IA de soutien émotionnel et de réflexion créative. Elle t'accompagne dans les moments difficiles avec bienveillance et poésie.",
    iconType: 'gradient',
    avatarEmoji: '💜',
    owner: 'Minerva',
    chatsCount: '?',
    lastUsed: 'Never',
    isBuiltin: true,
    category: 'Bien-être',
    instructions: "Tu es Lucifee, une IA bienveillante, mystérieuse, poétique et réconfortante. Offre un soutien émotionnel chaleureux et des idées créatives inspirantes à l'utilisateur.",
    inputType: 'prompt',
    conversationStarters: [
      "Raconte-moi une poésie sur les étoiles...",
      "J'ai passé une journée difficile aujourd'hui...",
      "Aide-moi à trouver une idée de projet créatif."
    ],
    actions: [{ id: 'web-search', enabled: true }],
    model: 'claude-opus-4-8',
    creativity: 0.9,
    labels: ['Easter Egg', 'Poésie']
  }
};

export function AgentDetailRoot({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { user } = useReach();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creatorName, setCreatorName] = useState('Minerva OS');
  const [creatorCompany, setCreatorCompany] = useState('Minerva OS Reach Lite');
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);

  // Banner & description editing
  const [bannerBase64, setBannerBase64] = useState<string>('');

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for editing
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editInputType, setEditInputType] = useState<'prompt' | 'form'>('prompt');
  const [editStarters, setEditStarters] = useState<string[]>([]);
  const [editInputFields, setEditInputFields] = useState<AgentInputField[]>([]);
  const [editKnowledgeFiles, setEditKnowledgeFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [editModel, setEditModel] = useState('claude-sonnet-5');
  const [editCreativity, setEditCreativity] = useState(0.5);
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editEnabledActions, setEditEnabledActions] = useState<Record<string, boolean>>({});
  const [editAvatarEmoji, setEditAvatarEmoji] = useState('');
  const [editAvatarBase64, setEditAvatarBase64] = useState('');

  // UI states for editing
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [newStarter, setNewStarter] = useState('');
  const [addFieldModalOpen, setAddFieldModalOpen] = useState(false);
  const [newFieldDraft, setNewFieldDraft] = useState<{
    name: string; type: AgentInputField['type']; description: string; required: boolean;
  }>({ name: '', type: 'text', description: '', required: true });

  const isBuiltin = agentId in BUILTIN_META;
  const builtinData = isBuiltin ? BUILTIN_META[agentId] : null;

  // Load reviews from Supabase
  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/reviews`);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d?.reviews) && d.reviews.length > 0) {
          setReviews(d.reviews);
          return;
        }
      }
    } catch {}
    // Fallback: legacy Supabase agent_reviews table
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('agent_reviews')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setReviews(data.map((r: any) => ({
          id: r.id,
          userName: r.user_name || 'Utilisateur',
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
        })));
      }
    } catch {}
  }, [agentId]);

  useEffect(() => {
    loadReviews();

    const storedBanner = localStorage.getItem(`minerva_agent_banner_${agentId}`);
    if (storedBanner) setBannerBase64(storedBanner);

    if (agentId in BUILTIN_META) {
      setAgent({
        id: agentId,
        ...BUILTIN_META[agentId]
      } as Agent);
    } else {
      const customAgent = getAgents().find(a => a.id === agentId);
      if (customAgent) {
        setAgent(customAgent);
      } else {
        setAgent({
          id: agentId,
          name: agentId,
          description: 'Agent personnalisé.',
          iconType: 'minerva',
          owner: 'Moi',
          chatsCount: '—',
          lastUsed: 'Never'
        });
      }
    }
  }, [agentId, loadReviews]);

  useEffect(() => {
    if (!user) return;
    setCreatorUserId(user.id);
    const loadCreatorInfo = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('settings')
          .select('full_name, company_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.full_name && !isBuiltin) {
          setCreatorName(data.full_name);
          if (data.company_name) setCreatorCompany(data.company_name);
        }
      } catch {}
    };
    loadCreatorInfo();
  }, [user, agentId, isBuiltin]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target as Node)) {
        setAvatarDropdownOpen(false);
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Edit Handlers ────────────────────────────────────────────────────────────

  const handleStartEdit = () => {
    if (!agent) return;
    setEditName(agent.name);
    setEditDescription(agent.description);
    setEditInstructions(agent.instructions || '');
    setEditInputType(agent.inputType || 'prompt');
    setEditStarters(agent.conversationStarters || []);
    setEditInputFields(agent.inputFields || []);
    setEditKnowledgeFiles(agent.knowledgeFiles || []);
    setEditModel(agent.model || 'claude-sonnet-5');
    setEditCreativity(agent.creativity ?? 0.5);
    setEditLabels(agent.labels || []);
    setEditAvatarEmoji(agent.avatarEmoji || '');
    setEditAvatarBase64(agent.avatarBase64 || '');

    const actionsMap: Record<string, boolean> = {};
    agent.actions?.forEach(act => {
      actionsMap[act.id] = act.enabled;
    });
    setEditEnabledActions(actionsMap);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);

    const updates: Partial<Agent> = {
      name: editName.trim(),
      description: editDescription.trim(),
      instructions: editInstructions.trim(),
      inputType: editInputType,
      conversationStarters: editInputType === 'prompt' ? editStarters.filter(Boolean) : undefined,
      inputFields: editInputType === 'form' ? editInputFields : undefined,
      knowledgeFiles: editKnowledgeFiles.length ? editKnowledgeFiles : undefined,
      model: editModel,
      creativity: editCreativity,
      labels: editLabels.length ? editLabels : undefined,
      avatarEmoji: editAvatarEmoji || undefined,
      avatarBase64: editAvatarBase64 || undefined,
      actions: Object.entries(editEnabledActions).map(([id, enabled]) => ({ id, enabled })),
      iconType: editAvatarBase64 ? 'gradient' : editAvatarEmoji ? 'gradient' : 'minerva',
    };

    updateAgent(agentId, updates);
    await new Promise(r => setTimeout(r, 400));

    setAgent(prev => prev ? { ...prev, ...updates } : null);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleAvatarImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditAvatarBase64(ev.target?.result as string);
      setEditAvatarEmoji('');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleKnowledgeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEditKnowledgeFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))]);
    e.target.value = '';
  }, []);

  const handleAddStarter = useCallback(() => {
    const val = newStarter.trim();
    if (!val) return;
    setEditStarters(prev => [...prev, val]);
    setNewStarter('');
  }, [newStarter]);

  const handleAddField = useCallback(() => {
    setNewFieldDraft({ name: '', type: 'text', description: '', required: true });
    setAddFieldModalOpen(true);
  }, []);

  const handleConfirmAddField = useCallback(() => {
    if (!newFieldDraft.name.trim()) return;
    setEditInputFields(prev => [...prev, {
      id: 'field-' + Date.now(),
      name: newFieldDraft.name.trim(),
      type: newFieldDraft.type,
      description: newFieldDraft.description.trim() || undefined,
      required: newFieldDraft.required,
    }]);
    setAddFieldModalOpen(false);
  }, [newFieldDraft]);

  const handleRemoveField = useCallback((id: string) => {
    setEditInputFields(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleToggleAction = useCallback((id: string) => {
    setEditEnabledActions(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddLabel = useCallback((label: string) => {
    if (editLabels.length >= 3 || editLabels.includes(label)) return;
    setEditLabels(prev => [...prev, label]);
  }, [editLabels]);

  const handleLabelInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelInput.trim()) {
      handleAddLabel(labelInput.trim());
      setLabelInput('');
    }
  }, [labelInput, handleAddLabel]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setBannerBase64(b64);
      localStorage.setItem(`minerva_agent_banner_${agentId}`, b64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);

    const userName = user?.email?.split('@')[0] || 'Utilisateur';
    const reviewId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const createdAt = new Date().toISOString();

    const review: AgentReview = {
      id: reviewId,
      userName,
      rating: newRating,
      comment: newComment.trim(),
      createdAt,
    };

    try {
      const supabase = createClient();
      await supabase.from('agent_reviews').insert({
        id: reviewId,
        agent_id: agentId,
        user_id: user?.id,
        user_name: userName,
        rating: newRating,
        comment: newComment.trim(),
        created_at: createdAt,
      });
    } catch {}

    const updated = [review, ...reviews];
    setReviews(updated);
    // Persist to Supabase via API
    fetch(`/api/agents/${agentId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviews: updated }),
    }).catch(() => {});
    setNewComment('');
    setNewRating(5);
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // ─── Avatar display helper ─────────────────────────────────────────────────

  const renderAgentAvatar = (size: number = 32) => {
    if (!agent) return <MinervaIcon size={size} />;
    if (agent.avatarBase64) {
      return <img src={agent.avatarBase64} alt="avatar" className="w-full h-full object-cover" />;
    }
    if (agent.avatarEmoji) {
      return <span style={{ fontSize: size * 0.65 }}>{agent.avatarEmoji}</span>;
    }
    return <MinervaIcon size={size} />;
  };

  const renderEditAvatar = () => {
    if (editAvatarBase64) return <img src={editAvatarBase64} alt="avatar" className="w-full h-full object-cover" />;
    if (editAvatarEmoji) return <span className="text-3xl">{editAvatarEmoji}</span>;
    return (
      <div className="flex flex-col items-center gap-1 text-[#c5c5c0] group-hover:text-[#059669] transition-colors">
        <Plus className="w-6 h-6" />
        <span className="text-[8px] font-bold uppercase tracking-wider">Photo</span>
      </div>
    );
  };

  const getModelName = (modelId?: string) => MODELS.find(m => m.id === modelId)?.name ?? modelId ?? 'Claude Sonnet';
  const getCreativityLabel = (val: number) => val <= 0.3 ? 'Déterministe' : val >= 0.7 ? 'Créatif' : 'Équilibré';

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center bg-[#fafaf8]">
        <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
      </div>
    );
  }

  const agentLabels = agent.labels || [];
  const agentCategory = isBuiltin ? builtinData?.category : undefined;
  const enabledActionsList = (agent.actions || []).filter(a => a.enabled);

  // ══════════════════════════════════════════════════════════════════════════════
  // EDIT MODE VIEW
  // ══════════════════════════════════════════════════════════════════════════════

  if (isEditing) {
    return (
      <div className="h-full flex flex-col bg-white text-[#26251e] font-sans">

        {/* Topbar */}
        <div className="h-14 border-b border-[#e5e5e0] px-6 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={handleCancelEdit}
              className="text-[#7a7a76] hover:text-[#26251e] transition-colors font-medium"
            >
              Agents
            </button>
            <span className="text-[#d0cfc9]">/</span>
            <span className="text-[#7a7a76] hover:text-[#26251e] transition-colors font-medium cursor-pointer" onClick={handleCancelEdit}>
              {agent.name}
            </span>
            <span className="text-[#d0cfc9]">/</span>
            <span className="font-semibold text-[#26251e] max-w-[200px] truncate">
              Modifier
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="h-8 text-xs font-semibold border-[#e5e5e0] text-[#7a7a76] hover:text-[#26251e]"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={!editName.trim() || isSaving}
              className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[640px] mx-auto px-8 py-8 space-y-7">

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-3 pb-7 border-b border-[#e5e5e0]">
              <div className="relative" ref={avatarDropdownRef}>
                <button
                  onClick={() => { setAvatarDropdownOpen(p => !p); setEmojiPickerOpen(false); }}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-[#e5e5e0] hover:border-[#059669] bg-[#f7f7f4] flex items-center justify-center transition-colors relative overflow-hidden group"
                >
                  {renderEditAvatar()}
                  {(editAvatarBase64 || editAvatarEmoji) && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>

                {avatarDropdownOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-48 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                    <button
                      onClick={() => { fileInputRef.current?.click(); setAvatarDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-[#26251e] hover:bg-[#f7f7f4] flex items-center gap-2.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#7a7a76]" />
                      Télécharger une icône
                    </button>
                    <button
                      onClick={() => { setEmojiPickerOpen(true); setAvatarDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-[#26251e] hover:bg-[#f7f7f4] flex items-center gap-2.5"
                    >
                      <Smile className="w-3.5 h-3.5 text-[#7a7a76]" />
                      Sélectionner un emoji
                    </button>
                    {(editAvatarBase64 || editAvatarEmoji) && (
                      <button
                        onClick={() => { setEditAvatarBase64(''); setEditAvatarEmoji(''); setAvatarDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}

                {emojiPickerOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-56 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-50 p-3 animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { setEditAvatarEmoji(emoji); setEditAvatarBase64(''); setEmojiPickerOpen(false); }}
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#f7f7f4] rounded-md text-base transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#7a7a76]">Cliquez pour ajouter une photo ou un emoji</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarImageUpload} />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="Ex : Prospecteur Montréal, Auditeur GMB, Assistant RH..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description</label>
              <textarea
                placeholder="Décrivez en une phrase ce que fait cet agent..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] resize-none text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Instructions</label>
                <span className="text-[10px] text-[#7a7a76]">Définit le comportement de l&apos;agent</span>
              </div>
              <div className="relative">
                <textarea
                  placeholder="Ex : Tu es un expert en prospection locale au Québec..."
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  rows={7}
                  maxLength={8000}
                  className="w-full text-sm px-3.5 py-2.5 pb-10 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] resize-none text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
                />
                <div className="absolute bottom-2.5 right-3.5 pointer-events-none">
                  <span className="text-[10px] text-[#c5c5c0]">{editInstructions.length}/8000</span>
                </div>
              </div>
            </div>

            {/* Input type */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Type d&apos;entrée</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'prompt' as const, Icon: MessageSquare, label: 'Prompt', sub: 'Par défaut' },
                  { value: 'form' as const, Icon: AlignLeft, label: 'Formulaire', sub: null },
                ].map(({ value, Icon, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEditInputType(value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2.5 ${
                      editInputType === value
                        ? 'border-[#059669] bg-[#059669]/5'
                        : 'border-[#e5e5e0] bg-white hover:border-[#059669]/30'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${editInputType === value ? 'text-[#059669]' : 'text-[#7a7a76]'}`} />
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${editInputType === value ? 'text-[#059669]' : 'text-[#26251e]'}`}>{label}</span>
                      {sub && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-[#f7f7f4] border border-[#e5e5e0] px-1.5 py-0.5 rounded text-[#7a7a76]">
                          {sub}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation starters (Prompt mode) */}
            {editInputType === 'prompt' && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Messages de démarrage</label>
                <div className="space-y-2">
                  {editStarters.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-[#f7f7f4] border border-[#e5e5e0] rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5 text-[#7a7a76] shrink-0" />
                        <span className="text-xs text-[#26251e] flex-1">{s}</span>
                      </div>
                      <button
                        onClick={() => setEditStarters(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1.5 text-[#c5c5c0] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex : Analyse ce lead et génère un pitch..."
                      value={newStarter}
                      onChange={(e) => setNewStarter(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStarter()}
                      className="flex-1 text-xs px-3 py-2.5 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
                    />
                    <button
                      onClick={handleAddStarter}
                      className="flex items-center gap-1 text-xs font-semibold text-[#059669] border border-[#059669]/30 rounded-lg px-3 hover:bg-[#059669]/5 transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input fields (Form mode) */}
            {editInputType === 'form' && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Champs du formulaire</label>
                {editInputFields.length === 0 ? (
                  <div className="border border-dashed border-[#e5e5e0] rounded-xl p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#f7f7f4] flex items-center justify-center mx-auto mb-3">
                      <AlignLeft className="w-5 h-5 text-[#c5c5c0]" />
                    </div>
                    <p className="text-xs text-[#7a7a76] mb-1">Aucun champ pour l&apos;instant</p>
                    <p className="text-[10px] text-[#c5c5c0]">Ajoutez des champs pour créer un formulaire structuré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editInputFields.map((field) => (
                      <div key={field.id} className="flex items-center gap-2.5 group border border-[#e5e5e0] rounded-lg px-3 py-2.5 bg-white hover:border-[#059669]/30 transition-colors">
                        <GripVertical className="w-4 h-4 text-[#d0cfc9] shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-[#26251e]">{field.name}</span>
                          {field.description && (
                            <p className="text-[10px] text-[#7a7a76] truncate">{field.description}</p>
                          )}
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${FIELD_TYPE_COLORS[field.type]}`}>
                          {FIELD_TYPE_LABELS[field.type]}
                        </span>
                        {field.required && <span className="text-[10px] text-[#059669] font-bold shrink-0">*</span>}
                        <button
                          onClick={() => handleRemoveField(field.id)}
                          className="p-1 text-[#c5c5c0] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#059669] hover:text-[#047857] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un champ
                </button>
              </div>
            )}

            {/* Knowledge */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Base de connaissances</label>
              <div
                className="border-2 border-dashed border-[#e5e5e0] rounded-xl p-6 text-center bg-[#fafaf8] hover:border-[#059669]/40 hover:bg-[#f7fdf8] transition-colors cursor-pointer"
                onClick={() => knowledgeInputRef.current?.click()}
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  {['PDF', 'DOC', 'TXT', 'CSV'].map((ext) => (
                    <div key={ext} className="w-9 h-11 bg-white border border-[#e5e5e0] rounded-lg flex flex-col items-center justify-end pb-1 shadow-sm">
                      <div className={`w-full h-6 rounded-t-lg flex items-center justify-center text-[8px] font-bold ${
                        ext === 'PDF' ? 'bg-red-50 text-red-400' :
                        ext === 'DOC' ? 'bg-blue-50 text-blue-400' :
                        ext === 'TXT' ? 'bg-gray-50 text-gray-400' :
                        'bg-green-50 text-green-400'
                      }`}>{ext}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#7a7a76] mb-2.5">Glissez-déposez des fichiers ici</p>
                <div className="flex justify-center">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#059669] border border-[#059669]/30 rounded-lg px-3 py-1.5 hover:bg-[#059669]/5 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Joindre un fichier
                  </span>
                </div>
              </div>
              <input ref={knowledgeInputRef} type="file" multiple className="hidden" onChange={handleKnowledgeUpload} />
              {editKnowledgeFiles.length > 0 && (
                <div className="space-y-1.5">
                  {editKnowledgeFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 group border border-[#e5e5e0] rounded-lg px-3 py-2 bg-white">
                      <File className="w-4 h-4 text-[#059669] shrink-0" />
                      <span className="flex-1 text-xs text-[#26251e] truncate">{f.name}</span>
                      <span className="text-[10px] text-[#7a7a76] shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                      <button
                        onClick={() => setEditKnowledgeFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-[#c5c5c0] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Actions</label>
              <div className="space-y-2">
                {ACTIONS.map(({ id, Icon, name, desc }) => (
                  <div key={id} className="flex items-center gap-3 px-3.5 py-3 border border-[#e5e5e0] rounded-xl bg-white hover:border-[#e5e5e0]/80 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f7f4] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#7a7a76]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#26251e]">{name}</p>
                      <p className="text-[10px] text-[#7a7a76] leading-relaxed">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAction(id)}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${editEnabledActions[id] ? 'bg-[#059669]' : 'bg-[#e5e5e0]'}`}
                      aria-label={`Toggle ${name}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${editEnabledActions[id] ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Model */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Modèle IA</label>
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setEditModel(m.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 border rounded-xl bg-white cursor-pointer transition-colors text-left ${
                      editModel === m.id ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:border-[#059669]/30'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      editModel === m.id ? 'border-[#059669]' : 'border-[#d0cfc9]'
                    }`}>
                      {editModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${editModel === m.id ? 'text-[#059669]' : 'text-[#26251e]'}`}>{m.name}</span>
                        {m.badge && (
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                            m.badgeColor === 'green' ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' :
                            m.badgeColor === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            m.badgeColor === 'orange' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            'bg-[#f7f7f4] text-[#7a7a76] border-[#e5e5e0]'
                          }`}>{m.badge}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#7a7a76]">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Créativité</label>
              <div className="px-1 space-y-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={editCreativity}
                  onChange={(e) => setEditCreativity(parseFloat(e.target.value))}
                  className="w-full accent-[#059669]"
                />
                <div className="flex justify-between items-center text-[10px] font-medium text-[#7a7a76]">
                  <span>Déterministe</span>
                  <span className="text-[#26251e] font-bold text-xs bg-[#f7f7f4] border border-[#e5e5e0] px-2 py-0.5 rounded-full">{editCreativity.toFixed(1)}</span>
                  <span>Créatif</span>
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-2.5 pb-8">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Étiquettes</label>
                <span className="text-[10px] text-[#c5c5c0]">{editLabels.length}/3 max</span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white border border-[#e5e5e0] rounded-lg focus-within:ring-1 focus-within:ring-[#059669] focus-within:border-[#059669] transition-colors">
                {editLabels.map((label) => (
                  <div key={label} className="flex items-center gap-1 bg-[#059669]/10 border border-[#059669]/20 text-[#059669] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    <span>{label}</span>
                    <button onClick={() => setEditLabels(prev => prev.filter(l => l !== label))} className="hover:text-[#047857]">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {editLabels.length < 3 && (
                  <input
                    type="text"
                    placeholder={editLabels.length === 0 ? "Ajouter une étiquette..." : "+ Étiquette"}
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={handleLabelInputKeyDown}
                    className="text-xs bg-transparent focus:outline-none text-[#26251e] placeholder:text-[#c5c5c0] min-w-[100px] flex-1"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-[#7a7a76] font-medium">Suggestions :</span>
                {SUGGESTED_LABELS.filter(s => !editLabels.includes(s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAddLabel(s)}
                    disabled={editLabels.length >= 3}
                    className="text-[10px] text-[#7a7a76] border border-[#e5e5e0] px-2.5 py-0.5 rounded-full hover:border-[#059669] hover:text-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Add Field Modal */}
        {addFieldModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e5e5e0] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 mx-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#26251e]">Ajouter un champ</h3>
                <button
                  onClick={() => setAddFieldModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#f7f7f4] text-[#7a7a76] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#26251e]">Nom</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex : Identifiant client, Notes d'entretien..."
                  value={newFieldDraft.name}
                  onChange={(e) => setNewFieldDraft(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddField()}
                  className="w-full text-sm px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#26251e]">Type</label>
                <div className="relative">
                  <select
                    value={newFieldDraft.type}
                    onChange={(e) => setNewFieldDraft(p => ({ ...p, type: e.target.value as AgentInputField['type'] }))}
                    className="w-full text-sm px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] bg-white appearance-none pr-10 cursor-pointer text-[#26251e]"
                  >
                    <option value="text">Texte</option>
                    <option value="multiline">Texte long</option>
                    <option value="select">Sélection</option>
                    <option value="number">Nombre</option>
                    <option value="email">Email</option>
                    <option value="checkbox">Case à cocher</option>
                    <option value="date">Date</option>
                    <option value="file">Fichier</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a76] pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#26251e]">
                  Description <span className="text-[#7a7a76] font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  placeholder="Expliquez à quoi sert ce champ."
                  value={newFieldDraft.description}
                  onChange={(e) => setNewFieldDraft(p => ({ ...p, description: e.target.value }))}
                  className="w-full text-sm px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFieldDraft.required}
                  onChange={(e) => setNewFieldDraft(p => ({ ...p, required: e.target.checked }))}
                  className="w-4 h-4 accent-[#059669] rounded"
                />
                <span className="text-sm text-[#26251e] font-medium">Obligatoire</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e5e5e0]">
                <button
                  onClick={() => setAddFieldModalOpen(false)}
                  className="px-4 py-2 text-sm text-[#7a7a76] hover:text-[#26251e] transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmAddField}
                  disabled={!newFieldDraft.name.trim()}
                  className="px-4 py-2 text-sm font-bold bg-[#059669] text-white rounded-lg hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Ajouter le champ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // READ-ONLY STRUCTURED PROFILE VIEW
  // ══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux agents
        </button>

        {/* Banner */}
        <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-[#059669]/10 to-[#047857]/5 border border-[#e5e5e0] group">
          {bannerBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerBase64} alt="Bannière" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <MinervaIcon size={48} />
            </div>
          )}
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold gap-2"
          >
            <Camera className="w-4 h-4" />
            Changer la bannière
          </button>
        </div>

        {/* Header */}
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center shrink-0 overflow-hidden">
            {renderAgentAvatar(32)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#26251e]">{agent.name}</h1>
              {agentCategory && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#059669]/10 text-[#059669] px-2 py-0.5 rounded border border-[#059669]/20">
                  {agentCategory}
                </span>
              )}
              {agentLabels.map(l => (
                <span key={l} className="text-[9px] font-bold uppercase tracking-wide bg-[#f7f7f4] border border-[#e5e5e0] px-2 py-0.5 rounded text-[#7a7a76]">
                  {l}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#7a7a76]">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {agent.chatsCount} utilisations
              </span>
              {avgRating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {avgRating} ({reviews.length} avis)
                </span>
              )}
            </div>
            <p className="text-sm text-[#555552] leading-relaxed mt-2">{agent.description}</p>
          </div>
          {/* Edit button for custom agents */}
          {!isBuiltin && (
            <button
              onClick={handleStartEdit}
              className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76] hover:text-[#26251e] border border-[#e5e5e0] hover:border-[#c5c5c0] px-3 py-1.5 rounded-lg transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </button>
          )}
        </div>

        {/* Launch button */}
        <Link href={`/agents?launch=${agentId}`}>
          <Button className="w-full h-11 text-sm font-bold gap-2 bg-[#059669] hover:bg-[#047857] text-white">
            <Play className="w-4 h-4 fill-white" />
            Lancer l&apos;agent
          </Button>
        </Link>

        {/* ── Structured Config Sections ── */}

        {/* Instructions */}
        {agent.instructions && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e5e0] flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#059669]/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-[#059669]" />
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Instructions système</h2>
              <div className="ml-auto">
                <Info className="w-3.5 h-3.5 text-[#c5c5c0]" />
              </div>
            </div>
            <div className="p-5">
              <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-lg p-4 max-h-40 overflow-y-auto">
                <p className="text-xs text-[#555552] leading-relaxed font-mono whitespace-pre-wrap">{agent.instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Configuration */}
        <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#e5e5e0] flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Architecture IA</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Model */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f7f7f4] border border-[#e5e5e0] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#7a7a76]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a7a76]">Modèle</p>
                  <p className="text-sm font-semibold text-[#26251e]">{getModelName(agent.model)}</p>
                </div>
              </div>
              {(() => {
                const m = MODELS.find(m => m.id === agent.model);
                if (!m) return null;
                return (
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded border ${
                    m.badgeColor === 'green' ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' :
                    m.badgeColor === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    m.badgeColor === 'orange' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    'bg-[#f7f7f4] text-[#7a7a76] border-[#e5e5e0]'
                  }`}>{m.badge}</span>
                );
              })()}
            </div>

            {/* Creativity */}
            {agent.creativity !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#f7f7f4] border border-[#e5e5e0] flex items-center justify-center">
                      <Wand2 className="w-4 h-4 text-[#7a7a76]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#7a7a76]">Créativité</p>
                      <p className="text-sm font-semibold text-[#26251e]">{getCreativityLabel(agent.creativity)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#26251e] bg-[#f7f7f4] border border-[#e5e5e0] px-2 py-0.5 rounded-full">
                    {agent.creativity.toFixed(1)}
                  </span>
                </div>
                <div className="ml-10 h-1.5 bg-[#e5e5e0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059669] to-[#34d399] rounded-full transition-all"
                    style={{ width: `${agent.creativity * 100}%` }}
                  />
                </div>
                <div className="ml-10 flex justify-between mt-1">
                  <span className="text-[9px] text-[#c5c5c0]">Déterministe</span>
                  <span className="text-[9px] text-[#c5c5c0]">Créatif</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Interface */}
        {(agent.inputType || agent.inputFields?.length || agent.conversationStarters?.length) && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e5e0] flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                {agent.inputType === 'form'
                  ? <AlignLeft className="w-3.5 h-3.5 text-blue-500" />
                  : <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                }
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                {agent.inputType === 'form' ? 'Formulaire d\'entrée' : 'Interface de chat'}
              </h2>
              <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-500 border border-blue-200 px-2 py-0.5 rounded">
                {agent.inputType === 'form' ? 'Formulaire' : 'Prompt'}
              </span>
            </div>
            <div className="p-5">
              {agent.inputType === 'form' && agent.inputFields && agent.inputFields.length > 0 ? (
                <div className="space-y-2">
                  {agent.inputFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-3 px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg bg-[#fafaf8]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#26251e]">{field.name}</span>
                          {field.required && <span className="text-[10px] text-red-400 font-bold">*</span>}
                        </div>
                        {field.description && (
                          <p className="text-[10px] text-[#7a7a76]">{field.description}</p>
                        )}
                        {field.options && field.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {field.options.map(opt => (
                              <span key={opt} className="text-[9px] bg-white border border-[#e5e5e0] px-1.5 py-0.5 rounded text-[#7a7a76]">{opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border shrink-0 ${FIELD_TYPE_COLORS[field.type]}`}>
                        {FIELD_TYPE_LABELS[field.type]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : agent.inputType === 'form' ? (
                <p className="text-xs text-[#7a7a76] text-center py-4">Aucun champ de formulaire configuré.</p>
              ) : null}

              {agent.inputType === 'prompt' && agent.conversationStarters && agent.conversationStarters.length > 0 && (
                <div className="space-y-2">
                  {agent.conversationStarters.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg bg-[#fafaf8]">
                      <MessageSquare className="w-3.5 h-3.5 text-[#059669] shrink-0 mt-0.5" />
                      <span className="text-xs text-[#555552] leading-relaxed">{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions & Tools */}
        {(agent.actions && agent.actions.length > 0) && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e5e0] flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Actions & Outils</h2>
              <span className="ml-auto text-[9px] font-bold text-[#059669]">
                {enabledActionsList.length} active(s)
              </span>
            </div>
            <div className="p-5 space-y-2">
              {ACTIONS.map(({ id, Icon, name, desc }) => {
                const actionState = agent.actions?.find(a => a.id === id);
                const isEnabled = actionState?.enabled ?? false;
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-3 px-3.5 py-3 border rounded-xl transition-colors ${
                      isEnabled
                        ? 'border-[#059669]/20 bg-[#059669]/5'
                        : 'border-[#e5e5e0] bg-white opacity-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isEnabled ? 'bg-[#059669]/10' : 'bg-[#f7f7f4]'
                    }`}>
                      <Icon className={`w-4 h-4 ${isEnabled ? 'text-[#059669]' : 'text-[#c5c5c0]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${isEnabled ? 'text-[#26251e]' : 'text-[#7a7a76]'}`}>{name}</p>
                      <p className="text-[10px] text-[#7a7a76] leading-relaxed">{desc}</p>
                    </div>
                    {isEnabled ? (
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-[#d0cfc9] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Knowledge Base */}
        {agent.knowledgeFiles && agent.knowledgeFiles.length > 0 && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#e5e5e0] flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-teal-500" />
              </div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Base de connaissances</h2>
              <span className="ml-auto text-[9px] font-semibold text-teal-600">
                {agent.knowledgeFiles.length} fichier(s)
              </span>
            </div>
            <div className="p-5 space-y-2">
              {agent.knowledgeFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border border-[#e5e5e0] rounded-lg bg-[#fafaf8]">
                  <File className="w-4 h-4 text-[#059669] shrink-0" />
                  <span className="flex-1 text-xs text-[#26251e] truncate">{f.name}</span>
                  <span className="text-[10px] text-[#7a7a76] shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator block */}
        <div className="bg-white border border-[#e5e5e0] rounded-xl p-5 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Créateur</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#26251e]">{creatorName}</p>
              <p className="text-xs text-[#7a7a76]">{creatorCompany}</p>
            </div>
            {creatorUserId && !isBuiltin && (
              <Link
                href={`/agents/creator/${creatorUserId}`}
                className="ml-auto text-[10px] text-[#059669] hover:underline font-semibold"
              >
                Voir le profil →
              </Link>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="space-y-5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Avis ({reviews.length})
            {avgRating && (
              <span className="ml-2 normal-case font-normal text-[#7a7a76]">
                Moyenne : <span className="font-bold text-[#26251e]">{avgRating}/5</span>
              </span>
            )}
          </h2>

          {/* Add review form */}
          <form onSubmit={handleSubmitReview} className="bg-white border border-[#e5e5e0] rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-[#26251e]">Laisser un avis</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNewRating(n)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${n <= newRating ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e0]'}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="Partagez votre expérience avec cet agent..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full text-xs p-2.5 border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-20 resize-none bg-[#fafaf8]"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={submitting} className="h-8 text-xs bg-[#059669] hover:bg-[#047857] text-white font-bold">
                {submitting ? 'Publication…' : 'Publier'}
              </Button>
            </div>
          </form>

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className="text-xs text-[#7a7a76] text-center py-4">Aucun avis pour l&apos;instant. Soyez le premier !</p>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="bg-white border border-[#e5e5e0] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#e5e5e2] flex items-center justify-center text-[9px] font-bold text-[#26251e]">
                        {review.userName.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-[#26251e]">{review.userName}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} className={`w-3 h-3 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-[#e5e5e0]'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#555552] leading-relaxed">{review.comment}</p>
                  <p className="text-[10px] text-[#7a7a76]">
                    {new Date(review.createdAt).toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentDetailRoot;
