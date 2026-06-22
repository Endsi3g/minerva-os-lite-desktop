'use client';

import React, { useState, useMemo } from 'react';
import { useReach } from '@/lib/reach-context';
import { useSkills } from '@/lib/use-skills';
import { SKILL_PACKS } from '@/lib/skills-data';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Sparkles, Search, Plus, X, Check, Trash2, Wand2, Loader2,
  Briefcase, Megaphone, Package, Database, Settings2, Headphones,
} from 'lucide-react';

type Tab = 'all' | 'installed' | 'packs' | 'mine';

const PACK_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  sales: Briefcase, marketing: Megaphone, product: Package,
  data: Database, ops: Settings2, support: Headphones,
};

export function SkillsRoot() {
  const { activeWorkspace } = useReach();
  const { state, allSkills, isEnabled, toggleSkill, addCustomSkill, deleteCustomSkill } = useSkills(activeWorkspace?.id);

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Skill Creator form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const q = query.toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);

  const installed = allSkills.filter(s => isEnabled(s.id) && (!q || matches(s.name) || matches(s.description)));

  const filteredPacks = useMemo(() => {
    return SKILL_PACKS
      .map(p => ({ ...p, skills: p.skills.filter(s => !q || matches(s.name) || matches(s.description)) }))
      .filter(p => p.skills.length > 0);
  }, [q]);

  const handleCreate = () => {
    if (!name.trim() || !instructions.trim()) return;
    setSaving(true);
    addCustomSkill({ name: name.trim(), description: description.trim() || 'Compétence personnalisée', instructions: instructions.trim(), pack: 'Créées par vous' });
    toast.success('Compétence créée et activée');
    setName(''); setDescription(''); setInstructions('');
    setShowCreate(false);
    setSaving(false);
    setTab('mine');
  };

  const SkillCard = ({ id, name, description, builtIn }: { id: string; name: string; description: string; builtIn: boolean }) => {
    const on = isEnabled(id);
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-card p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#f54e00]/10 text-[#f54e00] flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <button
            onClick={() => toggleSkill(id)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              on ? 'bg-[#059669]' : 'bg-[#c5c5c0]',
            )}
            aria-label={on ? 'Désactiver' : 'Activer'}
          >
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition', on ? 'translate-x-4' : 'translate-x-0')} />
          </button>
        </div>
        <div>
          <p className="text-sm font-bold text-[#26251e] leading-snug">{name}</p>
          <p className="text-xs text-[#7a7a76] mt-1 leading-relaxed line-clamp-2">{description}</p>
        </div>
        {!builtIn && (
          <button
            onClick={() => deleteCustomSkill(id)}
            className="self-start mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:underline"
          >
            <Trash2 className="h-3 w-3" /> Supprimer
          </button>
        )}
      </div>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'installed', label: 'Installées' },
    { key: 'packs', label: 'Packs' },
    { key: 'mine', label: 'Créées par vous' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#f54e00]/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#f54e00]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Skills</h1>
              <p className="text-sm text-muted-foreground">Des compétences qui étendent les capacités de l&apos;assistant IA. Activez-les puis utilisez <span className="font-semibold">@</span> dans le chat.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#f54e00] hover:bg-[#d94400] text-white text-xs font-bold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une compétence
          </button>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            {tabs.map(tb => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={cn(
                  'px-3 h-8 rounded-md text-xs font-semibold transition-colors',
                  tab === tb.key ? 'bg-white text-[#26251e] shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tb.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une compétence…"
              className="h-9 w-56 pl-8 pr-3 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#f54e00]"
            />
          </div>
        </div>

        {/* Installed */}
        {(tab === 'all' || tab === 'installed') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-[#059669]" /> Installées ({installed.length})
            </div>
            {installed.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune compétence activée. Activez-en dans les packs ci-dessous.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {installed.map(s => <SkillCard key={s.id} {...s} />)}
              </div>
            )}
          </div>
        )}

        {/* Created by you */}
        {(tab === 'mine') && (
          <div className="space-y-3">
            {state.customSkills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Wand2 className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Aucune compétence personnalisée</p>
                <p className="text-xs text-muted-foreground mt-1">Créez une compétence pour donner des instructions sur mesure à l&apos;assistant.</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#f54e00] text-white text-xs font-bold">
                  <Plus className="h-3.5 w-3.5" /> Créer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {state.customSkills.filter(s => !q || matches(s.name)).map(s => <SkillCard key={s.id} {...s} />)}
              </div>
            )}
          </div>
        )}

        {/* Packs */}
        {(tab === 'all' || tab === 'packs') && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Packs de compétences
            </div>
            {filteredPacks.map(pack => {
              const Icon = PACK_ICON[pack.id] ?? Package;
              return (
                <div key={pack.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-[#f4f4f3] border border-border flex items-center justify-center text-[#7a7a76]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{pack.name}</p>
                      <p className="text-[11px] text-muted-foreground">{pack.description} · {pack.skills.length} compétences</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {pack.skills.map(s => <SkillCard key={s.id} {...s} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill Creator modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[95vw] p-6 space-y-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#26251e] flex items-center gap-2"><Wand2 className="h-4 w-4 text-[#f54e00]" /> Créer une compétence</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#7a7a76] hover:text-[#26251e]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Auditeur SEO local" className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#f54e00]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description courte</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="À quoi sert cette compétence ?" className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#f54e00]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Instructions (injectées dans l&apos;IA)</label>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} placeholder="Tu es un expert en… Quand on te le demande, tu…" className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#f54e00] resize-none" />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !instructions.trim() || saving}
              className="w-full h-10 rounded-lg bg-[#f54e00] hover:bg-[#d94400] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Créer et activer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillsRoot;
