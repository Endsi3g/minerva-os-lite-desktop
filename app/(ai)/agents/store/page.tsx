'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  MessageSquare,
  Plus,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MinervaIcon } from '@/components/icons';
import { getApiUrl } from '@/lib/api-helper';
import { createClient } from '@/lib/supabase/client';
import { addAgent } from '@/lib/onboarding-store';

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  icon: string;
  category: string;
  author_id: string | null;
  author_name: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

const CATEGORIES = ['all', 'Prospection', 'Rédaction', 'Analyse', 'Audit', 'Réputation', 'Autre'] as const;

export default function AgentsStorePage() {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('popular');
  const [usingId, setUsingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Prospection');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [userName, setUserName] = useState('Moi');

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      params.set('sort', sortBy);
      const res = await fetch(getApiUrl(`/api/agents?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Error fetching marketplace agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [category, sortBy]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (settings?.full_name) setUserName(settings.full_name);
        }
      } catch (err) {
        console.error('Error fetching user settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleUseAgent = async (agent: MarketplaceAgent) => {
    setUsingId(agent.id);
    try {
      await fetch(getApiUrl('/api/agents'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agent.id }),
      });
      addAgent({
        name: agent.name,
        description: agent.description,
        iconType: 'minerva',
      }, userName);
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, usage_count: a.usage_count + 1 } : a));
    } catch (err) {
      console.error('Error using marketplace agent:', err);
    } finally {
      setUsingId(null);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsPublishing(true);
    try {
      const res = await fetch(getApiUrl('/api/agents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          systemPrompt,
          category: formCategory,
          icon: 'minerva',
          authorName: userName,
        }),
      });
      if (res.ok) {
        setPublishSuccess(true);
        setName('');
        setDescription('');
        setSystemPrompt('');
        setFormCategory('Prospection');
        fetchAgents();
        setTimeout(() => {
          setPublishSuccess(false);
          setShowCreateForm(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Error publishing agent:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-6xl mx-auto p-8 space-y-8 text-[#26251e] font-sans selection:bg-[#059669]/10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/agents"
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-[#7a7a76] hover:text-[#26251e] transition-colors"
              title="Retour aux agents"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="space-y-1.5 text-left">
              <h1 className="text-xl font-bold text-[#26251e]">Agents Store</h1>
              <p className="text-xs text-[#7a7a76]">
                Découvrez et publiez des agents IA partagés par la communauté Minerva.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateForm(v => !v)}
            size="sm"
            className="h-8.5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 rounded-md px-3.5 shrink-0 self-start sm:self-center"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Créer & Publier</span>
          </Button>
        </div>

        {/* Create & Publish form */}
        {showCreateForm && (
          <form
            onSubmit={handlePublish}
            className="border border-[#e5e5e0] rounded-xl p-6 bg-[#fdfdfc] space-y-4 shadow-2xs animate-in fade-in duration-150"
          >
            <h3 className="text-sm font-bold text-[#26251e] text-left">Publier un nouvel agent</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Catégorie</label>
                <select
                  title="Catégorie"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] cursor-pointer"
                >
                  {CATEGORIES.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description courte</label>
              <textarea
                placeholder="Ex: Analyse la structure de vos pages web et rédige des suggestions."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-16 resize-none"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Instructions (system prompt)</label>
              <textarea
                placeholder="Décrivez en détail comment l'agent doit se comporter, son ton, ses objectifs..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-28 resize-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-[#e5e5e0]/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="h-8 text-[#555552]"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isPublishing || publishSuccess}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : publishSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Publié !</span>
                  </>
                ) : (
                  <span>Publier dans la communauté</span>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`h-8 px-3 text-xs font-semibold rounded-md border transition-colors ${
                  category === c
                    ? 'bg-[#059669] border-[#059669] text-white'
                    : 'bg-white border-[#e5e5e0] text-[#555552] hover:bg-slate-50'
                }`}
              >
                {c === 'all' ? 'Toutes' : c}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
              <Input
                placeholder="Rechercher un agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy(sortBy === 'popular' ? 'recent' : 'popular')}
              className="h-8.5 text-xs font-semibold px-2 text-[#7a7a76] hover:text-[#26251e] flex items-center gap-1 rounded-md shrink-0"
            >
              <span>{sortBy === 'popular' ? 'Populaires' : 'Récents'}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
            <p className="text-xs text-[#7a7a76]">Chargement des agents...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="border border-dashed border-[#e5e5e0] rounded-xl p-10 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#f4f4f3] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#7a7a76]" />
            </div>
            <div className="space-y-1 text-center">
              <h4 className="text-sm font-bold text-[#26251e]">Aucun agent trouvé</h4>
              <p className="text-xs text-[#7a7a76]">Soyez le premier à publier un agent dans cette catégorie.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredAgents.map(agent => (
              <div
                key={agent.id}
                className="p-5 border border-[#e5e5e0] hover:border-[#7a7a76] bg-white rounded-xl flex flex-col justify-between min-h-[180px] h-auto pb-4 shadow-2xs transition-all relative overflow-hidden"
              >
                <div className="space-y-2 text-left">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0">
                      <MinervaIcon size={16} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-[#059669]/10 text-[#059669] px-1.5 py-0.5 rounded border border-[#059669]/20">
                      {agent.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-[#26251e] truncate">{agent.name}</h3>
                  <p className="text-[11px] text-[#7a7a76] leading-relaxed line-clamp-4">
                    {agent.description}
                  </p>
                </div>
                <div className="space-y-2.5 mt-2">
                  <div className="flex items-center justify-between text-[10px] text-[#7a7a76] font-medium border-t border-[#e5e5e0]/60 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#e5e5e2] flex items-center justify-center text-[8px] font-bold text-[#26251e]">
                        {agent.author_name.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[90px]">{agent.author_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-[#7a7a76]" />
                      <span>{agent.usage_count}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleUseAgent(agent)}
                    disabled={usingId === agent.id}
                    size="sm"
                    className="w-full h-8 text-xs font-bold bg-[#26251e] hover:bg-[#000] text-white rounded-md flex items-center justify-center gap-1.5"
                  >
                    {usingId === agent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Utiliser</span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
