'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Plus, CheckSquare, Sparkles, Zap, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead, Task } from '@/lib/mock-data';
import { toast } from 'sonner';

interface TodayHeaderProps {
  onAestheticToggle?: () => void;
}

export function TodayHeader({ onAestheticToggle }: TodayHeaderProps) {
  const { addLead, addTask } = useReach();
  const { t } = useLanguage();
  
  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    businessName: '',
    contactName: '',
    niche: '',
    city: '',
    source: '',
    status: 'New' as Lead['status'],
    temperature: 'Warm' as Lead['temperature'],
    nextAction: '',
    nextActionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // New Task dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<{ title: string; category: Task['category'] }>({
    title: '',
    category: 'Follow-up'
  });

  // Unified Action Menu & Raycast Palette states
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Keyboard Shortcuts (⌘K, ⌘N, ⌘T, ⌘E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenuOpen((prev) => !prev);
      } else if (isMeta && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setMenuOpen(false);
        setSheetOpen(true);
      } else if (isMeta && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setMenuOpen(false);
        setDialogOpen(true);
      } else if (isMeta && e.key.toLowerCase() === 'e' && onAestheticToggle) {
        e.preventDefault();
        setMenuOpen(false);
        onAestheticToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAestheticToggle]);

  // Actions definitions for the command palette
  const allActions = [
    {
      id: 'add-lead',
      label: t('today.add_lead') || 'Ajouter un prospect',
      description: 'Créer une opportunité commerciale',
      shortcut: '⌘N',
      icon: <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      onClick: () => {
        setSheetOpen(true);
        setMenuOpen(false);
      },
    },
    {
      id: 'new-task',
      label: t('today.new_task') || 'Nouvelle tâche',
      description: 'Planifier une action ou relance',
      shortcut: '⌘T',
      icon: <CheckSquare className="w-3.5 h-3.5 stroke-[2]" />,
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      onClick: () => {
        setDialogOpen(true);
        setMenuOpen(false);
      },
    },
    ...(onAestheticToggle
      ? [
          {
            id: 'aesthetic-mode',
            label: 'Basculer Mode Esthétique',
            description: 'Aperçu & partage visuel haute définition',
            shortcut: '⌘E',
            icon: <Sparkles className="w-3.5 h-3.5 stroke-[2]" />,
            iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
            onClick: () => {
              onAestheticToggle();
              setMenuOpen(false);
            },
          },
        ]
      : []),
  ];

  const filteredActions = allActions.filter(action => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return action.label.toLowerCase().includes(q) || action.description.toLowerCase().includes(q);
  });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.businessName) return;
    try {
      await addLead(leadForm);
    } catch (err: any) {
      toast.error(`Échec de la création du prospect : ${err?.message || 'erreur inconnue'}`, { duration: 8000 });
      return;
    }
    // Reset form
    setLeadForm({
      businessName: '',
      contactName: '',
      niche: '',
      city: '',
      source: '',
      status: 'New',
      temperature: 'Warm',
      nextAction: '',
      nextActionDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setSheetOpen(false);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title) return;
    addTask(taskForm.title, taskForm.category);
    // Reset form
    setTaskForm({
      title: '',
      category: 'Follow-up'
    });
    setDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 sm:pb-6">
      {/* Title block */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-sans font-bold tracking-tight text-foreground truncate">
          {t('today.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2 sm:line-clamp-1">
          {t('today.subtitle')}
        </p>
      </div>

      {/* Unified Action Button (Actions Rapides Dropdown) */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <DropdownMenu
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setSearchQuery('');
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "group relative inline-flex items-center gap-2.5 h-9.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-tight cursor-pointer shrink-0 select-none",
                // Gradient & Rich Surface
                "bg-gradient-to-b from-[#188c64] via-[#157c58] to-[#0f6244] text-white",
                // Bevel Highlight & Shadow Depth
                "border border-emerald-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_8px_rgba(15,98,68,0.30)]",
                // Hover & Focus States
                "hover:from-[#1ba173] hover:to-[#126f4e] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_4px_14px_rgba(21,124,88,0.40)] hover:border-emerald-300/50",
                "active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2",
                menuOpen && "from-[#147050] to-[#0d533a] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] border-emerald-500/60"
              )}
            >
              {/* Subtle ambient glow behind the button */}
              <span className="absolute -inset-0.5 rounded-xl bg-emerald-500/20 blur-xs -z-10 group-hover:opacity-100 opacity-60 transition-opacity" />

              <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] text-emerald-100 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 text-white fill-white drop-shadow-xs" />
              </span>
              <span className="font-medium text-[13px] tracking-tight drop-shadow-xs">Actions Rapides</span>
              
              {/* Keyboard shortcut pill */}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-400/20 text-[10px] font-mono font-medium text-emerald-100/90 shadow-2xs">
                ⌘K
              </kbd>

              <ChevronDown className={cn("w-3.5 h-3.5 text-emerald-100/80 transition-transform duration-200", menuOpen && "rotate-180")} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-72 p-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl text-foreground animate-in fade-in-0 zoom-in-95 duration-150"
          >
            {/* Raycast-style instant search bar */}
            <div className="relative flex items-center px-2 py-1.5 mb-1 border-b border-border/60">
              <Search className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0 mr-2" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher une action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    setMenuOpen(false);
                  }
                }}
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground text-[10px] px-1 py-0.5 rounded hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filtered actions list (Linear / Raycast high density) */}
            <div className="space-y-0.5 py-0.5">
              {filteredActions.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Aucune action trouvée pour "{searchQuery}"
                </div>
              ) : (
                filteredActions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={action.onClick}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors focus:bg-accent/80 hover:bg-accent/80 text-foreground group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("flex items-center justify-center w-5 h-5 rounded-md text-foreground/80 group-hover:text-foreground transition-colors shrink-0", action.iconBg)}>
                        {action.icon}
                      </div>
                      <span className="truncate text-[12px] font-medium text-foreground">{action.label}</span>
                    </div>

                    {/* Keyboard shortcut badge */}
                    {action.shortcut && (
                      <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-muted-foreground bg-muted/60 border border-border/50 group-hover:border-border transition-colors">
                        {action.shortcut}
                      </kbd>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="mt-1 pt-1.5 border-t border-border/50 px-2 py-0.5 flex items-center justify-between text-[10px] text-muted-foreground/70">
              <span>Commandes rapides</span>
              <span className="font-mono">Esc pour fermer</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New Task Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-2xl bg-card text-card-foreground border-border">
            <form onSubmit={handleTaskSubmit}>
              <DialogHeader>
                <DialogTitle className="text-foreground">{t('today.new_task_title')}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {t('today.new_task_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="task-title" className="text-xs font-semibold text-foreground">{t('today.task_title_label')}</label>
                  <Input 
                    id="task-title" 
                    placeholder="ex: Relancer M. Dupont" 
                    value={taskForm.title}
                    onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="bg-background border-input text-foreground"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="task-category" className="text-xs font-semibold text-foreground">{t('today.task_category_label')}</label>
                  <Select
                    value={taskForm.category}
                    onValueChange={(val: Task['category']) => setTaskForm(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger id="task-category" className="bg-background border-input text-foreground">
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="Follow-up">Relance / Follow-up</SelectItem>
                      <SelectItem value="Preparation">Préparation commerciale</SelectItem>
                      <SelectItem value="Meeting">Rendez-vous / Meeting</SelectItem>
                      <SelectItem value="General">Tâche générale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('today.cancel') || 'Annuler'}</Button>
                <Button type="submit" className="bg-brand-accent-emerald text-white hover:bg-brand-accent-emeraldHover">{t('today.create_task')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Lead Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full max-w-[480px] sm:max-w-[540px] overflow-y-auto bg-card text-card-foreground border-border">
            <form onSubmit={handleLeadSubmit} className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-foreground">{t('today.add_lead_title')}</SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  {t('today.add_lead_desc')}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-foreground">{t('today.business_name_label')}</label>
                  <Input 
                    placeholder="Boulangerie L'Épi d'Or" 
                    value={leadForm.businessName}
                    onChange={e => setLeadForm(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-foreground">{t('today.contact_name_label')}</label>
                  <Input 
                    placeholder="Jean Dupont" 
                    value={leadForm.contactName}
                    onChange={e => setLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-foreground">{t('today.niche_label')}</label>
                    <Input 
                      placeholder="Boulangerie" 
                      value={leadForm.niche}
                      onChange={e => setLeadForm(prev => ({ ...prev, niche: e.target.value }))}
                      className="bg-background border-input text-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-foreground">{t('today.city_label')}</label>
                    <Input 
                      placeholder="Lyon" 
                      value={leadForm.city}
                      onChange={e => setLeadForm(prev => ({ ...prev, city: e.target.value }))}
                      className="bg-background border-input text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-foreground">{t('today.temperature_label')}</label>
                    <Select
                      value={leadForm.temperature}
                      onValueChange={(val: Lead['temperature']) => setLeadForm(prev => ({ ...prev, temperature: val }))}
                    >
                      <SelectTrigger className="bg-background border-input text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="Hot">🔥 Hot</SelectItem>
                        <SelectItem value="Warm">☀️ Warm</SelectItem>
                        <SelectItem value="Cold">❄️ Cold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-foreground">{t('today.status_label')}</label>
                    <Select
                      value={leadForm.status}
                      onValueChange={(val: Lead['status']) => setLeadForm(prev => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger className="bg-background border-input text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="New">Nouveau (New)</SelectItem>
                        <SelectItem value="Contacted">Contacté (Contacted)</SelectItem>
                        <SelectItem value="Meeting Booked">RDV Fixé (Meeting Booked)</SelectItem>
                        <SelectItem value="Won">Gagné (Won)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-foreground">{t('today.source_label')}</label>
                  <Input 
                    placeholder="ex: Google Maps, Prospection Physique" 
                    value={leadForm.source}
                    onChange={e => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-foreground">{t('today.next_action_label')}</label>
                  <Input 
                    placeholder="ex: Rappeler pour confirmer le rendez-vous" 
                    value={leadForm.nextAction}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextAction: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-foreground">{t('today.next_action_date_label')}</label>
                  <Input 
                    type="date"
                    value={leadForm.nextActionDate}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextActionDate: e.target.value }))}
                    className="bg-background border-input text-foreground"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-foreground">{t('today.notes_label')}</label>
                  <Textarea 
                    placeholder="ex: Site web non responsive, manque de visibilité locale..." 
                    value={leadForm.notes}
                    onChange={e => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-border flex flex-row items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>{t('today.cancel')}</Button>
                <Button type="submit" className="bg-brand-accent-emerald text-white hover:bg-brand-accent-emeraldHover">{t('today.save_lead')}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default TodayHeader;
