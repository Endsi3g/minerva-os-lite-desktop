'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { Plus, CheckSquare } from 'lucide-react';
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

export function TodayHeader() {
  const { addLead, addTask } = useReach();
  
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

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.businessName) return;
    addLead(leadForm);
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-sans font-bold tracking-tight text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Concentre-toi sur tes relances, leads chauds et tâches clés du jour.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* New Task Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span>Nouvelle tâche</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleTaskSubmit}>
              <DialogHeader>
                <DialogTitle>Nouvelle tâche du jour</DialogTitle>
                <DialogDescription>
                  Ajoute une tâche transverse à faire aujourd&apos;hui.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="task-title" className="text-xs font-semibold">Titre de la tâche</label>
                  <Input 
                    id="task-title" 
                    placeholder="ex: Relancer M. Dupont" 
                    value={taskForm.title}
                    onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="task-category" className="text-xs font-semibold">Catégorie</label>
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
                <Button type="submit">Créer la tâche</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Lead Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              <span>Ajouter un lead</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <form onSubmit={handleLeadSubmit} className="space-y-6">
              <SheetHeader>
                <SheetTitle>Ajouter un nouveau prospect</SheetTitle>
                <SheetDescription>
                  Renseigne le profil commercial de ton lead. Il sera visible immédiatement.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold">Nom du business *</label>
                  <Input 
                    placeholder="Boulangerie L'Épi d'Or" 
                    value={leadForm.businessName}
                    onChange={e => setLeadForm(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">Nom du contact principal</label>
                  <Input 
                    placeholder="Jean Dupont" 
                    value={leadForm.contactName}
                    onChange={e => setLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">Niche / Secteur</label>
                    <Input 
                      placeholder="Boulangerie" 
                      value={leadForm.niche}
                      onChange={e => setLeadForm(prev => ({ ...prev, niche: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">Ville</label>
                    <Input 
                      placeholder="Lyon" 
                      value={leadForm.city}
                      onChange={e => setLeadForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold">Température</label>
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
                    <label className="text-xs font-semibold">Statut initial</label>
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
                  <label className="text-xs font-semibold">Source d&apos;acquisition</label>
                  <Input 
                    placeholder="ex: Google Maps, Prospection Physique" 
                    value={leadForm.source}
                    onChange={e => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">Action suivante</label>
                  <Input 
                    placeholder="ex: Rappeler pour confirmer le rendez-vous" 
                    value={leadForm.nextAction}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextAction: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">Date de l&apos;action suivante</label>
                  <Input 
                    type="date"
                    value={leadForm.nextActionDate}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextActionDate: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold">Notes terrain / Observations initiales</label>
                  <Textarea 
                    placeholder="ex: Site web non responsive, manque de visibilité locale..." 
                    value={leadForm.notes}
                    onChange={e => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Annuler</Button>
                <Button type="submit">Enregistrer le prospect</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
export default TodayHeader;
