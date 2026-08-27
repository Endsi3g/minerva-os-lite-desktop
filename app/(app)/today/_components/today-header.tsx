'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { Plus, CheckSquare, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e5e5e0] pb-6">
      {/* Title block */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-sans font-bold tracking-tight text-[#14171A]">{t('today.title')}</h1>
        <p className="text-sm text-[#7a7a76] mt-1">
          {t('today.subtitle')}
        </p>
      </div>

      {/* Action buttons (Header Controls - Pixel Perfect) */}
      <div className="flex items-center gap-2 flex-wrap">
        {onAestheticToggle && (
          <button
            type="button"
            onClick={onAestheticToggle}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-medium bg-[#E8EFE6] border border-[#72D2B2] text-[#064E3B] hover:bg-[#DCE7DA] transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-[#059669]" />
            <span>Mode Esthétique</span>
          </button>
        )}

        {/* New Task Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-medium bg-[#ECECE2] border border-[#DCD9CE] text-[#1F2937] hover:bg-[#E2E2D5] transition-colors cursor-pointer shrink-0"
            >
              <CheckSquare className="w-4 h-4 text-[#525252]" />
              <span>{t('today.new_task')}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleTaskSubmit}>
              <DialogHeader>
                <DialogTitle>{t('today.new_task_title')}</DialogTitle>
                <DialogDescription>
                  {t('today.new_task_desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="task-title" className="text-xs font-semibold">{t('today.task_title_label')}</label>
                  <Input 
                    id="task-title" 
                    placeholder="ex: Relancer M. Dupont" 
                    value={taskForm.title}
                    onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="task-category" className="text-xs font-semibold">{t('today.task_category_label')}</label>
                  <Select
                    value={taskForm.category}
                    onValueChange={(val: Task['category']) => setTaskForm(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger id="task-category">
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Follow-up">Relance / Follow-up</SelectItem>
                      <SelectItem value="Preparation">Préparation commerciale</SelectItem>
                      <SelectItem value="Meeting">Rendez-vous / Meeting</SelectItem>
                      <SelectItem value="General">Tâche générale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{t('today.create_task')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Lead Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-xs sm:text-sm font-medium bg-[#058A5E] text-white hover:bg-[#047857] shadow-sm active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>{t('today.add_lead')}</span>
            </button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <form onSubmit={handleLeadSubmit} className="space-y-6">
              <SheetHeader>
                <SheetTitle>{t('today.add_lead_title')}</SheetTitle>
                <SheetDescription>
                  {t('today.add_lead_desc')}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold">{t('today.business_name_label')}</label>
                  <Input 
                    placeholder="Boulangerie L'Épi d'Or" 
                    value={leadForm.businessName}
                    onChange={e => setLeadForm(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">{t('today.contact_name_label')}</label>
                  <Input 
                    placeholder="Jean Dupont" 
                    value={leadForm.contactName}
                    onChange={e => setLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">{t('today.niche_label')}</label>
                    <Input 
                      placeholder="Boulangerie" 
                      value={leadForm.niche}
                      onChange={e => setLeadForm(prev => ({ ...prev, niche: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">{t('today.city_label')}</label>
                    <Input 
                      placeholder="Lyon" 
                      value={leadForm.city}
                      onChange={e => setLeadForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">{t('today.temperature_label')}</label>
                    <Select
                      value={leadForm.temperature}
                      onValueChange={(val: Lead['temperature']) => setLeadForm(prev => ({ ...prev, temperature: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hot">🔥 Hot</SelectItem>
                        <SelectItem value="Warm">☀️ Warm</SelectItem>
                        <SelectItem value="Cold">❄️ Cold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">{t('today.status_label')}</label>
                    <Select
                      value={leadForm.status}
                      onValueChange={(val: Lead['status']) => setLeadForm(prev => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">Nouveau (New)</SelectItem>
                        <SelectItem value="Contacted">Contacté (Contacted)</SelectItem>
                        <SelectItem value="Meeting Booked">RDV Fixé (Meeting Booked)</SelectItem>
                        <SelectItem value="Won">Gagné (Won)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">{t('today.source_label')}</label>
                  <Input 
                    placeholder="ex: Google Maps, Prospection Physique" 
                    value={leadForm.source}
                    onChange={e => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">{t('today.next_action_label')}</label>
                  <Input 
                    placeholder="ex: Rappeler pour confirmer le rendez-vous" 
                    value={leadForm.nextAction}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextAction: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">{t('today.next_action_date_label')}</label>
                  <Input 
                    type="date"
                    value={leadForm.nextActionDate}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextActionDate: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">{t('today.notes_label')}</label>
                  <Textarea 
                    placeholder="ex: Site web non responsive, manque de visibilité locale..." 
                    value={leadForm.notes}
                    onChange={e => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-[#e5e5e0]">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>{t('today.cancel')}</Button>
                <Button type="submit">{t('today.save_lead')}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
export default TodayHeader;
