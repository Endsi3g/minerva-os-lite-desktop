'use client';

import React, { useState, useMemo } from 'react';
import { useReach } from '@/lib/reach-context';
import { useSkills } from '@/lib/use-skills';
import { SKILL_PACKS } from '@/lib/skills-data';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/language-context';
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
  const { t } = useLanguage();
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
    toast.success(t('skills.toast_created'));
    setName(''); setDescription(''); setInstructions('');
    setShowCreate(false);
    setSaving(false);
    setTab('mine');
  };

  const SkillCard = ({ id, name, description, builtIn }: { id: string; name: string; description: string; builtIn: boolean }) => {
    const on = isEnabled(id);
    return (
      <div className={cn(
        'rounded-xl border bg-white p-4 flex flex-col gap-2.5 transition-all duration-200 relative overflow-hidden',
        on
          ? 'border-[#e5e5e0] border-l-[3px] border-l-[#059669] shadow-xs'
          : 'border-[#e5e5e0] hover:border-[#c5c5c0]',
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            on ? 'bg-[#059669]/15 text-[#059669]' : 'bg-[#f4f4f3] text-[#7a7a76]',
          )}>
            <Sparkles className="h-4 w-4" />
          </div>
          <button
            onClick={() => toggleSkill(id)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 border-0',
              on ? 'bg-[#059669]' : 'bg-[#d4d4cf]',
            )}
            aria-label={on ? 'Désactiver' : 'Activer'}
          >
            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 mt-0.5', on ? 'translate-x-4' : 'translate-x-0.5')} />
          </button>
        </div>
        <div>
          <p className={cn('text-xs font-bold leading-snug', on ? 'text-[#26251e]' : 'text-[#555552]')}>{name}</p>
          <p className="text-[11px] text-[#7a7a76] mt-1 leading-relaxed line-clamp-2">{description}</p>
        </div>
        {on && <span className="text-[9px] font-bold text-[#059669] uppercase tracking-wider">Actif</span>}
        {!builtIn && (
          <button
            onClick={() => deleteCustomSkill(id)}
            className="self-start mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-700 hover:underline border-0 bg-transparent cursor-pointer"
          >
            <Trash2 className="h-3 w-3" /> {t('skills.delete')}
          </button>
        )}
      </div>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: t('skills.tab_all') },
    { key: 'installed', label: t('skills.tab_installed') },
    { key: 'packs', label: t('skills.tab_packs') },
    { key: 'mine', label: t('skills.tab_mine') },
  ];

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative animate-page-enter">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      
      <div className="w-full px-3 sm:px-4 md:px-8 py-6 md:py-10 space-y-6 relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#059669]/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#059669]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#26251e] tracking-tight">{t('skills.title')}</h1>
              <p className="text-xs text-neutral-500 font-medium">{t('skills.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors border-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('skills.add')}
          </button>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[#f4f4f3] rounded-lg p-0.5 border border-border">
            {tabs.map(tb => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={cn(
                  'px-3 h-8 rounded-md text-xs font-bold transition-colors border-0 cursor-pointer',
                  tab === tb.key ? 'bg-white text-[#26251e]' : 'text-[#807d72] hover:text-[#26251e] bg-transparent',
                )}
              >
                {tb.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#807d72]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('skills.search')}
              className="h-9 w-56 pl-8 pr-3 text-xs bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669] text-[#26251e]"
            />
          </div>
        </div>

        {/* Installed */}
        {(tab === 'all' || tab === 'installed') && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#059669]/10 flex items-center justify-center">
                <Check className="h-3 w-3 text-[#059669]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#26251e]">
                {t('skills.installed_count')}
              </span>
              <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/8 border border-[#059669]/20 px-1.5 py-0.5 rounded-md">
                {installed.length}
              </span>
            </div>
            {installed.length === 0 ? (
              <p className="text-xs text-[#7a7a76] bg-white border border-[#e5e5e0] p-4 rounded-xl">{t('skills.no_installed')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {installed.map(s => <SkillCard key={s.id} {...s} />)}
              </div>
            )}
          </div>
        )}

        {/* Created by you */}
        {(tab === 'mine') && (
          <div className="space-y-3">
            {state.customSkills.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center bg-white">
                <Wand2 className="h-6 w-6 text-[#807d72] mx-auto mb-2" />
                <p className="text-xs font-bold text-[#26251e]">{t('skills.no_mine')}</p>
                <p className="text-[11px] text-[#807d72] mt-1">{t('skills.no_mine_desc')}</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#059669] text-white text-xs font-bold border-0 cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> {t('skills.add')}
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
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              <Package className="h-3.5 w-3.5" /> {t('skills.packs_title')}
            </div>
            {filteredPacks.map(pack => {
              const Icon = PACK_ICON[pack.id] ?? Package;
              const installedInPack = pack.skills.filter(s => isEnabled(s.id)).length;
              return (
                <div key={pack.id} className="space-y-3">
                  <div className="flex items-center gap-3 py-2 border-b border-[#e5e5e0]">
                    <div className="h-8 w-8 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center text-[#555552] shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#26251e] leading-none">{pack.name}</p>
                      <p className="text-[10px] text-[#7a7a76] mt-0.5">{pack.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {installedInPack > 0 && (
                        <span className="text-[10px] font-bold text-[#059669] bg-[#059669]/8 border border-[#059669]/20 px-2 py-0.5 rounded-lg">
                          {installedInPack} actif{installedInPack > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-[10px] text-[#7a7a76] font-semibold">
                        {pack.skills.length} {t('skills.skills_count')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
          <div className="bg-white rounded-2xl shadow-xl w-[480px] max-w-[95vw] p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e] flex items-center gap-2"><Wand2 className="h-4 w-4 text-[#059669]" /> {t('skills.create_title')}</h2>
              <button onClick={() => setShowCreate(false)} className="text-[#807d72] hover:text-[#26251e] bg-transparent border-0 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('skills.form_name')}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t('skills.form_name_placeholder')} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('skills.form_desc')}</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t('skills.form_desc_placeholder')} className="w-full h-9 text-xs border border-[#e5e5e0] rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{t('skills.form_inst')}</label>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={5} placeholder={t('skills.form_inst_placeholder')} className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white text-[#26251e] resize-none" />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !instructions.trim() || saving}
              className="w-full h-10 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 border-0 cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('skills.btn_create')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillsRoot;
