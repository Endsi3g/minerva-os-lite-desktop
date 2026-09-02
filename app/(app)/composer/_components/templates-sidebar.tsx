'use client';

import React, { useState, useMemo } from 'react';
import { Search, FileText, Sparkles, Plus, ExternalLink, Copy, Check, ArrowRight, CornerDownLeft, Tag } from 'lucide-react';
import { CURATED_TEMPLATES, CuratedTemplate, StoredEmailTemplate, TemplateCategory } from './composer-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TemplatesSidebarProps {
  customTemplates: StoredEmailTemplate[];
  loadingCustom: boolean;
  onApplyTemplate: (subject: string, body: string, templateName?: string) => void;
  onAppendTemplateBody: (body: string) => void;
  onOpenSaveTemplateModal: () => void;
}

export function TemplatesSidebar({
  customTemplates,
  loadingCustom,
  onApplyTemplate,
  onAppendTemplateBody,
  onOpenSaveTemplateModal,
}: TemplatesSidebarProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories: { id: TemplateCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'cold', label: 'Cold outreach' },
    { id: 'relance', label: 'Relance' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'valeur', label: 'Proposition' },
    { id: 'custom', label: `Mes templates (${customTemplates.length})` },
  ];

  const filteredCurated = useMemo(() => {
    if (categoryFilter === 'custom') return [];
    return CURATED_TEMPLATES.filter(tpl => {
      const matchesCategory = categoryFilter === 'all' || tpl.category === categoryFilter;
      const matchesSearch = !search.trim() ||
        tpl.title.toLowerCase().includes(search.toLowerCase()) ||
        tpl.body.toLowerCase().includes(search.toLowerCase()) ||
        (tpl.subject && tpl.subject.toLowerCase().includes(search.toLowerCase())) ||
        tpl.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, search]);

  const filteredCustom = useMemo(() => {
    if (categoryFilter !== 'all' && categoryFilter !== 'custom') return [];
    return customTemplates.filter(tpl => {
      const matchesSearch = !search.trim() ||
        tpl.name.toLowerCase().includes(search.toLowerCase()) ||
        tpl.body.toLowerCase().includes(search.toLowerCase()) ||
        tpl.subject.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [categoryFilter, customTemplates, search]);

  const totalResults = filteredCurated.length + filteredCustom.length;

  return (
    <div className="flex flex-col h-full bg-[#fdfdfc] border-l border-[#e5e5e0]">
      {/* Header */}
      <div className="p-3 border-b border-[#e5e5e0] space-y-2.5 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-[#059669]" />
            <h3 className="text-xs font-bold text-[#1a1f1c]">Bibliothèque de Templates</h3>
          </div>
          <button
            onClick={onOpenSaveTemplateModal}
            className="flex items-center gap-1 text-[10px] font-bold text-[#059669] hover:text-[#047857] transition-colors"
          >
            <Plus className="h-3 w-3" /> Enregistrer actuel
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher accroches, relances, ROI…"
            className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] text-xs text-[#1a1f1c] placeholder:text-[#9c9c96] focus:outline-none focus:border-[#059669] focus:bg-white transition-colors"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                'px-2 py-1 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap shrink-0',
                categoryFilter === cat.id
                  ? 'bg-[#059669] text-white shadow-xs'
                  : 'bg-[#f4f4f3] text-[#7a7a76] hover:bg-[#e5e5e0] hover:text-[#1a1f1c]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Custom Templates Section if any */}
        {filteredCustom.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#7a7a76] uppercase tracking-wider">
              <span>Mes Templates Sauvegardés</span>
              <span className="text-[10px] font-medium">{filteredCustom.length}</span>
            </div>
            {filteredCustom.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/60 hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#1a1f1c]">{tpl.name}</h4>
                    <p className="text-[10px] text-[#7a7a76] truncate mt-0.5">Objet : {tpl.subject}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                    Personnalisé
                  </span>
                </div>

                <p className="text-[11px] text-[#4a4a46] line-clamp-2 bg-[#fafaf8] p-2 rounded-lg border border-[#f4f4f3] font-mono text-[10px]">
                  {tpl.body}
                </p>

                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => onApplyTemplate(tpl.subject, tpl.body, tpl.name)}
                    className="h-6 text-[10px] px-2 gap-1 bg-[#059669] hover:bg-[#047857] text-white flex-1"
                  >
                    <ArrowRight className="h-3 w-3" /> Appliquer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAppendTemplateBody(tpl.body)}
                    className="h-6 text-[10px] px-2 gap-1 border-[#e5e5e0] hover:bg-[#fafaf8]"
                    title="Ajouter à la suite du texte existant"
                  >
                    <CornerDownLeft className="h-3 w-3" /> + Ajouter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Curated Pro Templates */}
        {filteredCurated.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#7a7a76] uppercase tracking-wider">
              <span>Bibliothèque d'Accroches Pro</span>
              <span className="text-[10px] font-medium">{filteredCurated.length}</span>
            </div>

            {filteredCurated.map((tpl) => {
              const isExpanded = expandedId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className="p-3 rounded-xl border border-[#e5e5e0] bg-white hover:border-[#059669]/60 hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#1a1f1c]">{tpl.title}</h4>
                      {tpl.subject && (
                        <p className="text-[10px] text-[#7a7a76] truncate mt-0.5">
                          <span className="font-semibold">Objet :</span> {tpl.subject}
                        </p>
                      )}
                    </div>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                      tpl.category === 'cold' && 'bg-blue-50 text-blue-700 border border-blue-200',
                      tpl.category === 'relance' && 'bg-amber-50 text-amber-700 border border-amber-200',
                      tpl.category === 'linkedin' && 'bg-sky-50 text-sky-700 border border-sky-200',
                      tpl.category === 'valeur' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    )}>
                      {tpl.category}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#7a7a76] leading-snug">
                    {tpl.description}
                  </p>

                  <div className={cn(
                    'bg-[#fafaf8] p-2 rounded-lg border border-[#f4f4f3] text-[10px] text-[#4a4a46] font-mono whitespace-pre-line',
                    !isExpanded && 'line-clamp-3'
                  )}>
                    {tpl.body}
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="text-[10px] font-semibold text-[#059669] hover:underline"
                  >
                    {isExpanded ? 'Réduire l\'aperçu' : 'Voir le template complet'}
                  </button>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {tpl.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#f4f4f3] text-[#7a7a76]">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-[#f4f4f3]">
                    <Button
                      size="sm"
                      onClick={() => onApplyTemplate(tpl.subject || '', tpl.body, tpl.title)}
                      className="h-6 text-[10px] px-2 gap-1 bg-[#059669] hover:bg-[#047857] text-white flex-1"
                    >
                      <ArrowRight className="h-3 w-3" /> Remplacer tout
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAppendTemplateBody(tpl.body)}
                      className="h-6 text-[10px] px-2 gap-1 border-[#e5e5e0] hover:bg-[#fafaf8]"
                      title="Ajouter ce bloc à la suite"
                    >
                      <CornerDownLeft className="h-3 w-3" /> + Insérer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalResults === 0 && (
          <div className="py-8 text-center space-y-2 text-[#7a7a76]">
            <FileText className="h-6 w-6 mx-auto opacity-40 text-[#7a7a76]" />
            <p className="text-xs font-semibold">Aucun template trouvé</p>
            <p className="text-[11px]">Modifiez vos critères de recherche ou enregistrez votre premier template personnalisé.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-[#fafaf8] border-t border-[#e5e5e0] flex items-center justify-between shrink-0">
        <a
          href="/settings/email-templates"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-[#059669] hover:underline flex items-center gap-1"
        >
          Gérer tous les templates <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
