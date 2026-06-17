'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Sparkles, Globe, Camera, BarChart3, MapPin, Star,
  MessageSquare, GripVertical, Upload, FileText, Check, Loader2,
  Share2, Mic, Smile, AlignLeft, Wand2, File, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MinervaIcon } from '@/components/icons';
import { addAgent, AgentInputField } from '@/lib/onboarding-store';
import { createClient } from '@/lib/supabase/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku', desc: 'Rapide et économique', badge: 'Rapide', badgeColor: 'blue', requiresKey: false },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet', desc: 'Équilibré, polyvalent', badge: 'Recommandé', badgeColor: 'green', requiresKey: false },
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
  number: 'bg-orange-50 text-orange-600 border-orange-200',
  select: 'bg-purple-50 text-purple-600 border-purple-200',
  file: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  email: 'bg-teal-50 text-teal-600 border-teal-200',
  checkbox: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  date: 'bg-red-50 text-red-500 border-red-200',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentCreateRoot() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knowledgeInputRef = useRef<HTMLInputElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  // Core form state
  const [agentName, setAgentName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [inputType, setInputType] = useState<'prompt' | 'form'>('prompt');
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [newStarter, setNewStarter] = useState('');
  const [inputFields, setInputFields] = useState<AgentInputField[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [enabledActions, setEnabledActions] = useState<Record<string, boolean>>({});
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [creativity, setCreativity] = useState(0.5);
  const [labels, setLabels] = useState<string[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [avatarBase64, setAvatarBase64] = useState('');

  // UI state
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [ownerName, setOwnerName] = useState('Moi');

  // Model key config modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [pendingModel, setPendingModel] = useState<string | null>(null);

  // Add field modal state
  const [addFieldModalOpen, setAddFieldModalOpen] = useState(false);
  const [newFieldDraft, setNewFieldDraft] = useState<{
    name: string; type: AgentInputField['type']; description: string; required: boolean;
  }>({ name: '', type: 'text', description: '', required: true });

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('settings').select('full_name').eq('user_id', user.id).maybeSingle();
          if (data?.full_name) setOwnerName(data.full_name);
        }
      } catch { /* silent */ }
    };
    load();
  }, []);

  // Close dropdown on outside click
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAvatarImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarBase64(ev.target?.result as string);
      setAvatarEmoji('');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddStarter = useCallback(() => {
    const val = newStarter.trim();
    if (!val) return;
    setConversationStarters(prev => [...prev, val]);
    setNewStarter('');
  }, [newStarter]);

  const handleAddField = useCallback(() => {
    setNewFieldDraft({ name: '', type: 'text', description: '', required: true });
    setAddFieldModalOpen(true);
  }, []);

  const handleConfirmAddField = useCallback(() => {
    if (!newFieldDraft.name.trim()) return;
    setInputFields(prev => [...prev, {
      id: 'field-' + Date.now(),
      name: newFieldDraft.name.trim(),
      type: newFieldDraft.type,
      description: newFieldDraft.description.trim() || undefined,
      required: newFieldDraft.required,
    }]);
    setAddFieldModalOpen(false);
  }, [newFieldDraft]);

  const handleUpdateField = useCallback((id: string, key: keyof AgentInputField, value: string) => {
    setInputFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  }, []);

  const handleRemoveField = useCallback((id: string) => {
    setInputFields(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleKnowledgeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setKnowledgeFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))]);
    e.target.value = '';
  }, []);

  const handleToggleAction = useCallback((id: string) => {
    setEnabledActions(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAddLabel = useCallback((label: string) => {
    if (labels.length >= 3 || labels.includes(label)) return;
    setLabels(prev => [...prev, label]);
  }, [labels]);

  const handleLabelInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelInput.trim()) {
      handleAddLabel(labelInput.trim());
      setLabelInput('');
    }
  }, [labelInput, handleAddLabel]);

  const handleSave = useCallback(async () => {
    if (!agentName.trim()) return;
    setIsSaving(true);
    setSaveStatus('saving');

    addAgent({
      name: agentName.trim(),
      description: description.trim(),
      iconType: avatarBase64 ? 'gradient' : avatarEmoji ? 'gradient' : 'minerva',
      instructions,
      inputType,
      inputFields: inputType === 'form' ? inputFields : undefined,
      conversationStarters: inputType === 'prompt' ? conversationStarters.filter(Boolean) : undefined,
      knowledgeFiles: knowledgeFiles.length ? knowledgeFiles : undefined,
      actions: Object.entries(enabledActions).filter(([, v]) => v).map(([id]) => ({ id, enabled: true })),
      model,
      creativity,
      labels: labels.length ? labels : undefined,
      avatarEmoji: avatarEmoji || undefined,
      avatarBase64: avatarBase64 || undefined,
    }, ownerName);

    await new Promise(r => setTimeout(r, 400));
    setSaveStatus('saved');
    setIsSaving(false);
    setTimeout(() => router.push('/agents'), 700);
  }, [agentName, description, avatarBase64, avatarEmoji, instructions, inputType, inputFields, conversationStarters, knowledgeFiles, enabledActions, model, creativity, labels, ownerName, router]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-white text-[#26251e] font-sans selection:bg-[#059669]/10">

      {/* ── Topbar ── */}
      <div className="h-14 border-b border-[#e5e5e0] px-6 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/agents" className="text-[#7a7a76] hover:text-[#26251e] transition-colors font-medium">
            Agents
          </Link>
          <span className="text-[#d0cfc9]">/</span>
          <span className="font-semibold text-[#26251e] max-w-[200px] truncate">
            {agentName || 'Nouvel agent'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {saveStatus === 'saved' && (
            <span className="text-xs text-[#059669] flex items-center gap-1 animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5" />
              Sauvegardé
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold border-[#059669]/40 text-[#059669] hover:bg-[#059669]/5 hover:border-[#059669] gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            Partager
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!agentName.trim() || isSaving}
            className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Créer l'agent
          </Button>
        </div>
      </div>

      {/* ── Main split layout ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ─ Left panel (form) ─ */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[640px] mx-auto px-8 py-8 space-y-7">

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-3 pb-7 border-b border-[#e5e5e0]">
              <div className="relative" ref={avatarDropdownRef}>
                <button
                  onClick={() => { setAvatarDropdownOpen(p => !p); setEmojiPickerOpen(false); }}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-[#e5e5e0] hover:border-[#059669] bg-[#f7f7f4] flex items-center justify-center transition-colors relative overflow-hidden group"
                >
                  {avatarBase64 ? (
                    <img src={avatarBase64} alt="avatar" className="w-full h-full object-cover" />
                  ) : avatarEmoji ? (
                    <span className="text-3xl">{avatarEmoji}</span>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#c5c5c0] group-hover:text-[#059669] transition-colors">
                      <Plus className="w-6 h-6" />
                      <span className="text-[8px] font-bold uppercase tracking-wider">Photo</span>
                    </div>
                  )}
                  {(avatarBase64 || avatarEmoji) && (
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>

                {/* Avatar dropdown */}
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
                    {(avatarBase64 || avatarEmoji) && (
                      <button
                        onClick={() => { setAvatarBase64(''); setAvatarEmoji(''); setAvatarDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}

                {/* Emoji picker */}
                {emojiPickerOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-56 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-50 p-3 animate-in fade-in slide-in-from-top-1 duration-100">
                    <div className="grid grid-cols-8 gap-0.5">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { setAvatarEmoji(emoji); setAvatarBase64(''); setEmojiPickerOpen(false); }}
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
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description</label>
              <textarea
                placeholder="Décrivez en une phrase ce que fait cet agent..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] resize-none text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Instructions</label>
                <span className="text-[10px] text-[#7a7a76]">Définit le comportement de l'agent</span>
              </div>
              <div className="relative">
                <textarea
                  placeholder="Ex : Tu es un expert en prospection locale au Québec. Tu analyses les commerces et génères des pitchs adaptés au marché québécois..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={7}
                  maxLength={8000}
                  className="w-full text-sm px-3.5 py-2.5 pb-10 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] resize-none text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
                />
                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[11px] text-[#059669] font-semibold hover:text-[#047857] transition-colors pointer-events-auto"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Optimiser
                  </button>
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button type="button" className="text-[#c5c5c0] hover:text-[#7a7a76] transition-colors">
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-[#c5c5c0]">{instructions.length}/8000</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input type */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Type d'entrée</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'prompt' as const, Icon: MessageSquare, label: 'Prompt', sub: 'Par défaut' },
                  { value: 'form' as const, Icon: AlignLeft, label: 'Formulaire', sub: null },
                ].map(({ value, Icon, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setInputType(value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-2.5 ${
                      inputType === value
                        ? 'border-[#059669] bg-[#059669]/5'
                        : 'border-[#e5e5e0] bg-white hover:border-[#059669]/30'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${inputType === value ? 'text-[#059669]' : 'text-[#7a7a76]'}`} />
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${inputType === value ? 'text-[#059669]' : 'text-[#26251e]'}`}>{label}</span>
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
            {inputType === 'prompt' && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Messages de démarrage</label>
                <div className="space-y-2">
                  {conversationStarters.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-[#f7f7f4] border border-[#e5e5e0] rounded-lg">
                        <MessageSquare className="w-3.5 h-3.5 text-[#7a7a76] shrink-0" />
                        <span className="text-xs text-[#26251e] flex-1">{s}</span>
                      </div>
                      <button
                        onClick={() => setConversationStarters(prev => prev.filter((_, idx) => idx !== i))}
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
            {inputType === 'form' && (
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Champs du formulaire</label>
                {inputFields.length === 0 ? (
                  <div className="border border-dashed border-[#e5e5e0] rounded-xl p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#f7f7f4] flex items-center justify-center mx-auto mb-3">
                      <AlignLeft className="w-5 h-5 text-[#c5c5c0]" />
                    </div>
                    <p className="text-xs text-[#7a7a76] mb-1">Aucun champ pour l'instant</p>
                    <p className="text-[10px] text-[#c5c5c0]">Ajoutez des champs pour créer un formulaire structuré</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inputFields.map((field) => (
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
                    <div key={ext} className="w-9 h-11 bg-white border border-[#e5e5e0] rounded-lg flex flex-col items-center justify-end pb-1 shadow-xs">
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
              {knowledgeFiles.length > 0 && (
                <div className="space-y-1.5">
                  {knowledgeFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 group border border-[#e5e5e0] rounded-lg px-3 py-2 bg-white">
                      <File className="w-4 h-4 text-[#059669] shrink-0" />
                      <span className="flex-1 text-xs text-[#26251e] truncate">{f.name}</span>
                      <span className="text-[10px] text-[#7a7a76] shrink-0">{(f.size / 1024).toFixed(0)} Ko</span>
                      <button
                        onClick={() => setKnowledgeFiles(prev => prev.filter((_, idx) => idx !== i))}
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
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${enabledActions[id] ? 'bg-[#059669]' : 'bg-[#e5e5e0]'}`}
                      aria-label={`Toggle ${name}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabledActions[id] ? 'translate-x-4' : 'translate-x-0'}`} />
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
                    onClick={() => {
                      if (m.requiresKey) {
                        setPendingModel(m.id);
                        setShowKeyModal(true);
                      } else {
                        setModel(m.id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 border rounded-xl bg-white cursor-pointer transition-colors text-left ${
                      model === m.id ? 'border-[#059669] bg-[#059669]/5' : 'border-[#e5e5e0] hover:border-[#059669]/30'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      model === m.id ? 'border-[#059669]' : 'border-[#d0cfc9]'
                    }`}>
                      {model === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${model === m.id ? 'text-[#059669]' : 'text-[#26251e]'}`}>{m.name}</span>
                        {m.badge && (
                          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                            m.badgeColor === 'green' ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' :
                            m.badgeColor === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            m.badgeColor === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-200' :
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
                  value={creativity}
                  onChange={(e) => setCreativity(parseFloat(e.target.value))}
                  className="w-full accent-[#059669]"
                />
                <div className="flex justify-between items-center text-[10px] font-medium text-[#7a7a76]">
                  <span>Déterministe</span>
                  <span className="text-[#26251e] font-bold text-xs bg-[#f7f7f4] border border-[#e5e5e0] px-2 py-0.5 rounded-full">{creativity.toFixed(1)}</span>
                  <span>Créatif</span>
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-2.5 pb-8">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Étiquettes</label>
                <span className="text-[10px] text-[#c5c5c0]">{labels.length}/3 max</span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-white border border-[#e5e5e0] rounded-lg focus-within:ring-1 focus-within:ring-[#059669] focus-within:border-[#059669] transition-colors">
                {labels.map((label) => (
                  <div key={label} className="flex items-center gap-1 bg-[#059669]/10 border border-[#059669]/20 text-[#059669] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    <span>{label}</span>
                    <button onClick={() => setLabels(prev => prev.filter(l => l !== label))} className="hover:text-[#047857]">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {labels.length < 3 && (
                  <input
                    type="text"
                    placeholder={labels.length === 0 ? "Ajouter une étiquette..." : "+ Étiquette"}
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={handleLabelInputKeyDown}
                    className="text-xs bg-transparent focus:outline-none text-[#26251e] placeholder:text-[#c5c5c0] min-w-[100px] flex-1"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-[#7a7a76] font-medium">Suggestions :</span>
                {SUGGESTED_LABELS.filter(s => !labels.includes(s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAddLabel(s)}
                    disabled={labels.length >= 3}
                    className="text-[10px] text-[#7a7a76] border border-[#e5e5e0] px-2.5 py-0.5 rounded-full hover:border-[#059669] hover:text-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ─ Right panel (live preview) ─ */}
        <div className="w-[400px] border-l border-[#e5e5e0] flex flex-col bg-[#f7f7f4]/60 shrink-0">
          <div className="h-14 border-b border-[#e5e5e0] px-5 flex items-center justify-between shrink-0 bg-white/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Aperçu</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
              <span className="text-[10px] text-[#7a7a76]">Temps réel</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Agent card preview */}
            <div className="border border-[#e5e5e0] bg-white rounded-xl p-5 shadow-xs">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {avatarBase64 ? (
                    <img src={avatarBase64} alt="" className="w-full h-full object-cover" />
                  ) : avatarEmoji ? (
                    <span className="text-xl">{avatarEmoji}</span>
                  ) : (
                    <MinervaIcon size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-[#26251e] truncate">{agentName || 'Nouvel agent'}</h3>
                  <p className="text-[10px] text-[#7a7a76]">par {ownerName}</p>
                </div>
              </div>
              {description ? (
                <p className="text-xs text-[#555552] leading-relaxed line-clamp-2">{description}</p>
              ) : (
                <p className="text-xs text-[#c5c5c0] leading-relaxed italic">Ajoutez une description...</p>
              )}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {labels.map((l) => (
                    <span key={l} className="text-[9px] font-bold uppercase tracking-wide bg-[#059669]/10 text-[#059669] px-1.5 py-0.5 rounded border border-[#059669]/20">
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interface simulation */}
            <div className="border border-[#e5e5e0] bg-white rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-2.5 border-b border-[#e5e5e0] bg-[#f7f7f4]/60 flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#059669]" />
                <span className="text-[10px] text-[#7a7a76] font-medium">
                  {inputType === 'prompt' ? 'Interface de chat' : 'Formulaire interactif'}
                </span>
              </div>

              {inputType === 'prompt' ? (
                <div className="p-3 space-y-2 min-h-[160px] flex flex-col">
                  {conversationStarters.length > 0 ? (
                    <div className="flex-1 space-y-1.5">
                      {conversationStarters.slice(0, 3).map((s, i) => (
                        <div key={i} className="text-[11px] px-3 py-2 rounded-lg border border-[#e5e5e0] bg-[#f7f7f4] text-[#555552] line-clamp-1">
                          {s}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[10px] text-[#c5c5c0] italic">Ajoutez des messages de démarrage...</p>
                    </div>
                  )}
                  <div className="border border-[#e5e5e0] rounded-lg px-3 py-2 flex items-center gap-2 mt-auto">
                    <span className="text-[11px] text-[#c5c5c0] flex-1 truncate">
                      Message {agentName || 'Nouvel agent'}...
                    </span>
                    <div className="w-5 h-5 rounded-md bg-[#059669] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-3 min-h-[160px] flex flex-col">
                  {inputFields.length > 0 ? (
                    <>
                      <div className="flex-1 space-y-2.5">
                        {inputFields.slice(0, 4).map((field) => (
                          <div key={field.id} className="space-y-1">
                            <label className="text-[10px] font-semibold text-[#26251e]">
                              {field.name || 'Champ'}
                            </label>
                            {field.type === 'multiline' ? (
                              <div className="h-10 border border-[#e5e5e0] rounded-md bg-[#f7f7f4]/40" />
                            ) : field.type === 'file' ? (
                              <div className="h-7 border border-dashed border-[#e5e5e0] rounded-md flex items-center justify-center gap-1">
                                <Upload className="w-3 h-3 text-[#7a7a76]" />
                                <span className="text-[9px] text-[#7a7a76]">Joindre</span>
                              </div>
                            ) : field.type === 'select' ? (
                              <div className="h-7 border border-[#e5e5e0] rounded-md bg-[#f7f7f4]/40 flex items-center justify-between px-2">
                                <span className="text-[9px] text-[#c5c5c0]">Sélectionner...</span>
                                <ChevronDown className="w-3 h-3 text-[#c5c5c0]" />
                              </div>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2 h-7">
                                <div className="w-4 h-4 border border-[#e5e5e0] rounded bg-[#f7f7f4]/40" />
                                <span className="text-[9px] text-[#c5c5c0]">Cocher si applicable</span>
                              </div>
                            ) : field.type === 'date' ? (
                              <div className="h-7 border border-[#e5e5e0] rounded-md bg-[#f7f7f4]/40 flex items-center px-2">
                                <span className="text-[9px] text-[#c5c5c0]">jj/mm/aaaa</span>
                              </div>
                            ) : (
                              <div className="h-7 border border-[#e5e5e0] rounded-md bg-[#f7f7f4]/40" />
                            )}
                          </div>
                        ))}
                        {inputFields.length > 4 && (
                          <p className="text-[9px] text-[#7a7a76] text-center">+{inputFields.length - 4} champ(s) supplémentaire(s)</p>
                        )}
                      </div>
                      <button className="w-full h-7 bg-[#059669] text-white text-[11px] font-bold rounded-md mt-auto">
                        Soumettre
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[10px] text-[#c5c5c0] italic">Ajoutez des champs pour l'aperçu...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model + creativity summary */}
            <div className="border border-[#e5e5e0] bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Configuration</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#7a7a76]">Modèle</span>
                  <span className="text-[11px] font-semibold text-[#26251e]">
                    {MODELS.find(m => m.id === model)?.name ?? model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#7a7a76]">Créativité</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-[#e5e5e0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#059669] rounded-full" style={{ width: `${creativity * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-[#26251e]">{creativity.toFixed(1)}</span>
                  </div>
                </div>
                {Object.values(enabledActions).some(Boolean) && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#7a7a76]">Actions</span>
                    <span className="text-[11px] font-semibold text-[#059669]">
                      {Object.values(enabledActions).filter(Boolean).length} active(s)
                    </span>
                  </div>
                )}
                {knowledgeFiles.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#7a7a76]">Connaissances</span>
                    <span className="text-[11px] font-semibold text-[#059669]">
                      {knowledgeFiles.length} fichier(s)
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Model Key Config Modal ── */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#e5e5e0] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 mx-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5">
                <Star className="w-4.5 h-4.5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26251e]">Clé API requise</h3>
                <p className="text-xs text-[#7a7a76] mt-1 leading-relaxed">
                  GPT-4o s&apos;exécute via <strong>OpenRouter</strong>. Configurez votre clé OpenRouter dans
                  {' '}<strong>Paramètres → Clés API</strong> pour utiliser ce modèle.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  router.push('/settings');
                }}
                className="flex-1 py-2 text-xs font-bold bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
              >
                Configurer la clé
              </button>
              <button
                onClick={() => {
                  if (pendingModel) setModel(pendingModel);
                  setShowKeyModal(false);
                  setPendingModel(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-[#7a7a76] border border-[#e5e5e0] rounded-lg hover:bg-[#f7f7f4] transition-colors"
              >
                Sélectionner quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Input Field Modal ── */}
      {addFieldModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-xs">
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

            {/* Name */}
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

            {/* Type */}
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

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#26251e]">
                Description <span className="text-[#7a7a76] font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                placeholder="Expliquez à quoi sert ce champ ou comment il doit être rempli."
                value={newFieldDraft.description}
                onChange={(e) => setNewFieldDraft(p => ({ ...p, description: e.target.value }))}
                className="w-full text-sm px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] text-[#26251e] placeholder:text-[#c5c5c0] transition-colors"
              />
            </div>

            {/* Required */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={newFieldDraft.required}
                onChange={(e) => setNewFieldDraft(p => ({ ...p, required: e.target.checked }))}
                className="w-4 h-4 accent-[#059669] rounded"
              />
              <span className="text-sm text-[#26251e] font-medium">Obligatoire</span>
            </label>

            {/* Actions */}
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
