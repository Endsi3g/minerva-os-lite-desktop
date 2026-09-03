'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  FileText, 
  Mail, 
  MessageSquare, 
  Link2, 
  Phone, 
  Check, 
  Sparkles, 
  Tag, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { CURATED_TEMPLATES, CuratedTemplate, StoredEmailTemplate } from '@/app/(app)/composer/_components/composer-types';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface SelectedTemplateData {
  title: string;
  subject: string;
  body: string;
  channel?: string;
}

interface TemplatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelFilter?: 'Email' | 'Call' | 'LinkedIn' | 'SMS';
  onSelectTemplate: (tpl: SelectedTemplateData) => void;
}

export function TemplatePickerDialog({
  open,
  onOpenChange,
  channelFilter,
  onSelectTemplate,
}: TemplatePickerDialogProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customTemplates, setCustomTemplates] = useState<StoredEmailTemplate[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch custom templates from Supabase
  useEffect(() => {
    if (!open) return;
    const fetchTemplates = async () => {
      setLoadingCustom(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setCustomTemplates(data.map((t: any) => ({
            id: t.id,
            name: t.name || 'Template sans titre',
            subject: t.subject || '',
            body: t.body || '',
            tags: t.tags || [],
            created_at: t.created_at,
          })));
        }
      } catch {
        // ignore
      } finally {
        setLoadingCustom(false);
      }
    };
    fetchTemplates();
  }, [open]);

  // Map channelFilter to ComposerChannel
  const targetChannel = useMemo(() => {
    if (!channelFilter) return undefined;
    switch (channelFilter) {
      case 'Email': return 'email';
      case 'LinkedIn': return 'linkedin';
      case 'SMS': return 'sms';
      case 'Call': return 'call';
    }
  }, [channelFilter]);

  // Filter curated
  const filteredCurated = useMemo(() => {
    return CURATED_TEMPLATES.filter((tpl) => {
      if (targetChannel && tpl.channel !== targetChannel && targetChannel !== 'email') {
        // if user wants SMS or LinkedIn, only show matching channel
        return false;
      }
      const matchCat = activeCategory === 'all' || tpl.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        tpl.title.toLowerCase().includes(q) || 
        tpl.body.toLowerCase().includes(q) ||
        (tpl.subject && tpl.subject.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [targetChannel, activeCategory, search]);

  // Filter custom
  const filteredCustom = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'custom') return [];
    const q = search.toLowerCase().trim();
    return customTemplates.filter((tpl) => {
      return !q || tpl.name.toLowerCase().includes(q) || tpl.body.toLowerCase().includes(q) || tpl.subject.toLowerCase().includes(q);
    });
  }, [activeCategory, customTemplates, search]);

  const allItems = useMemo(() => {
    const curatedMapped = filteredCurated.map(c => ({
      id: c.id,
      title: c.title,
      subject: c.subject || '',
      body: c.body,
      isCustom: false,
      tags: c.tags,
      channel: c.channel,
    }));

    const customMapped = filteredCustom.map(c => ({
      id: c.id,
      title: c.name,
      subject: c.subject || '',
      body: c.body,
      isCustom: true,
      tags: c.tags || ['Personnel'],
      channel: 'email',
    }));

    return [...customMapped, ...curatedMapped];
  }, [filteredCurated, filteredCustom]);

  const activeItem = allItems.find(i => i.id === selectedId) || allItems[0];

  const handleConfirm = () => {
    if (!activeItem) return;
    onSelectTemplate({
      title: activeItem.title,
      subject: activeItem.subject,
      body: activeItem.body,
      channel: activeItem.channel,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-[#111827]">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-[#E5E7EB] bg-[#F9FAFB] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#1E4B33] text-white flex items-center justify-center font-bold">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-[#111827]">
                  Insérer un Modèle de Message
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B7280]">
                  Sélectionnez un modèle prêt à l'emploi ou issu de votre bibliothèque.
                </DialogDescription>
              </div>
            </div>
            {channelFilter && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1E4B33]/10 text-[#1E4B33] border border-[#1E4B33]/20">
                Canal : {channelFilter}
              </span>
            )}
          </div>

          {/* Search & Categories Bar */}
          <div className="pt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B7280]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par titre, accroche ou mot-clé..."
                className="w-full h-8 pl-9 pr-3 rounded-lg border border-[#E5E7EB] bg-white text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#1E4B33]"
              />
            </div>
          </div>
        </DialogHeader>

        {/* Content Body: Split View (List on Left, Preview on Right) */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 min-h-0 divide-y sm:divide-y-0 sm:divide-x divide-[#E5E7EB] overflow-hidden">
          {/* Left Column: List of Templates */}
          <div className="sm:col-span-5 overflow-y-auto p-2 space-y-1 max-h-[300px] sm:max-h-[460px]">
            {allItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B7280]">
                Aucun modèle ne correspond à votre recherche.
              </div>
            ) : (
              allItems.map((item) => {
                const isSelected = (selectedId || allItems[0]?.id) === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1',
                      isSelected
                        ? 'border-[#1E4B33] bg-[#1E4B33]/5 text-[#111827] shadow-2xs'
                        : 'border-transparent hover:bg-[#F3F4F6] text-[#4B5563]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate text-[#111827]">{item.title}</span>
                      {item.isCustom && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#10B981]/15 text-[#065F46] rounded shrink-0">
                          Custom
                        </span>
                      )}
                    </div>
                    {item.subject && (
                      <p className="text-[10px] text-[#6B7280] truncate">Objet: {item.subject}</p>
                    )}
                    <p className="text-[10px] text-[#6B7280] line-clamp-2 leading-normal">
                      {item.body}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Live Preview & Inspection */}
          <div className="sm:col-span-7 overflow-y-auto p-4 flex flex-col justify-between space-y-3 bg-[#FAFAFA] max-h-[360px] sm:max-h-[460px]">
            {activeItem ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <span className="text-xs font-bold text-[#111827]">{activeItem.title}</span>
                  <div className="flex items-center gap-1">
                    {activeItem.tags?.map((t: string) => (
                      <span key={t} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#6B7280]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {activeItem.subject && (
                  <div className="p-2 rounded-lg bg-white border border-[#E5E7EB] text-xs space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Objet du message</span>
                    <span className="font-semibold text-[#111827]">{activeItem.subject}</span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] text-xs leading-relaxed text-[#111827] whitespace-pre-line max-h-[220px] overflow-y-auto font-sans">
                  {activeItem.body}
                </div>

                <div className="flex flex-wrap gap-1 text-[10px] text-[#6B7280] items-center pt-1">
                  <span className="font-bold">Variables détectées :</span>
                  {activeItem.body.match(/\{\{[^}]+\}\}/g)?.map((token) => (
                    <span key={token} className="font-mono px-1 py-0.2 rounded bg-white border border-[#E5E7EB] text-[#1E4B33] font-semibold">
                      {token}
                    </span>
                  )) || <span>Aucune variable dynamique</span>}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#6B7280]">
                Sélectionnez un modèle pour visualiser son contenu.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 border-t border-[#E5E7EB] bg-white flex items-center justify-between sm:justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs border-[#E5E7EB]"
          >
            Annuler
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!activeItem}
            onClick={handleConfirm}
            className="bg-[#1E4B33] hover:bg-[#1E4B33]/90 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <span>Insérer ce modèle</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
