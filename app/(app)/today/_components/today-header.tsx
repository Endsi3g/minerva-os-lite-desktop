'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Plus, CheckSquare, Sparkles, Zap, ChevronDown } from 'lucide-react';
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

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    category: 'Follow-up' as Task['category']
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 h-9 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold bg-brand-accent-emerald text-white hover:bg-brand-accent-emeraldHover shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <Zap className="w-4 h-4 text-white fill-white" />
              <span>Actions Rapides</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl bg-card border-border shadow-lg">
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
              Actions Rapides
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground rounded-lg cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold">{t('today.add_lead') || 'Nouveau Lead'}</span>
                <span className="text-[10px] text-muted-foreground">Créer une opportunité</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground rounded-lg cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 shrink-0">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold">{t('today.new_task') || 'Nouvelle Tâche'}</span>
                <span className="text-[10px] text-muted-foreground">Planifier une action</span>
              </div>
            </DropdownMenuItem>
            {onAestheticToggle && (
              <>
                <DropdownMenuSeparator className="my-1 bg-border" />
                <DropdownMenuItem
                  onClick={onAestheticToggle}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-foreground rounded-lg cursor-pointer hover:bg-accent focus:bg-accent"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/10 text-purple-600 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold">Basculer Mode Esthétique</span>
                    <span className="text-[10px] text-muted-foreground">Aperçu & partage visuel</span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
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
