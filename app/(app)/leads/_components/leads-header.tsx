'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { Plus, RefreshCw, Upload, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead } from '@/lib/mock-data';

export function LeadsHeader() {
  const { leads, addLead } = useReach();
  
  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  const [leadForm, setLeadForm] = useState({
    businessName: '',
    contactName: '',
    contactEmail: '',
    niche: '',
    city: '',
    source: '',
    status: 'New' as Lead['status'],
    temperature: 'Warm' as Lead['temperature'],
    nextAction: '',
    nextActionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.businessName) return;
    addLead(leadForm);
    // Reset form
    setLeadForm({
      businessName: '',
      contactName: '',
      contactEmail: '',
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

  const handleCsvImport = () => {
    setImporting(true);
    // Simulate reading a CSV file and adding 2 leads
    setTimeout(() => {
      addLead({
        businessName: "Boucherie Charcuterie Vessière",
        contactName: "Marc Vessière",
        contactEmail: "contact@boucherie-vessiere.ca",
        niche: "Alimentation / Commerce",
        city: "Montréal",
        source: "CSV Import",
        status: "New",
        temperature: "Warm",
        nextAction: "Appel d'introduction pour offrir l'audit de visibilité locale",
        nextActionDate: new Date().toISOString().split('T')[0],
        notes: "Commerce de quartier historique. Pas de site web ni de fiche Maps revendiquée."
      });

      addLead({
        businessName: "Hôtel Le Roosevelt",
        contactName: "Hélène Dubois",
        contactEmail: "direction@hotelroosevelt.ca",
        niche: "Hôtellerie / Tourisme",
        city: "Montréal",
        source: "CSV Import",
        status: "Contacted",
        temperature: "Hot",
        nextAction: "Envoyer la brochure commerciale Minerva Reach",
        nextActionDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "Intérêt manifesté sur LinkedIn suite au post d'Uprising Studio."
      });

      setImporting(false);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
      }, 3000);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border">
      {/* Title block */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Portefeuille des opportunités de prospection locale ({leads.length} prospect{leads.length > 1 ? 's' : ''} au total).
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        {/* CSV Import simulation */}
        <Button 
          variant="outline" 
          size="sm" 
          disabled={importing}
          onClick={handleCsvImport}
          className="gap-2"
        >
          {importing ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Importation...</span>
            </>
          ) : importSuccess ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-600">Importé ! (+2)</span>
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              <span>Importer CSV</span>
            </>
          )}
        </Button>

        {/* Add Lead Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" />
              <span>Nouveau lead</span>
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
                <div className="grid gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nom du business *</label>
                  <Input 
                    placeholder="Boulangerie L'Épi d'Or" 
                    value={leadForm.businessName}
                    onChange={e => setLeadForm(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nom du contact</label>
                    <Input 
                      placeholder="Jean Dupont" 
                      value={leadForm.contactName}
                      onChange={e => setLeadForm(prev => ({ ...prev, contactName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                    <Input 
                      type="email"
                      placeholder="jean.dupont@mail.com" 
                      value={leadForm.contactEmail}
                      onChange={e => setLeadForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Secteur / Niche</label>
                    <Input 
                      placeholder="Boulangerie" 
                      value={leadForm.niche}
                      onChange={e => setLeadForm(prev => ({ ...prev, niche: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ville</label>
                    <Input 
                      placeholder="Montréal" 
                      value={leadForm.city}
                      onChange={e => setLeadForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Température</label>
                    <Select
                      value={leadForm.temperature}
                      onValueChange={(val: Lead['temperature']) => setLeadForm(prev => ({ ...prev, temperature: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hot">🔥 Chaud (Hot)</SelectItem>
                        <SelectItem value="Warm">☀️ Tiède (Warm)</SelectItem>
                        <SelectItem value="Cold">❄️ Froid (Cold)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Statut du lead</label>
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
                        <SelectItem value="Lost">Perdu (Lost)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Source</label>
                  <Input 
                    placeholder="ex: Google Maps, Prospection Physique" 
                    value={leadForm.source}
                    onChange={e => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Action suivante</label>
                  <Input 
                    placeholder="ex: Rappeler pour fixer un créneau" 
                    value={leadForm.nextAction}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextAction: e.target.value }))}
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date de l&apos;action</label>
                  <Input 
                    type="date"
                    value={leadForm.nextActionDate}
                    onChange={e => setLeadForm(prev => ({ ...prev, nextActionDate: e.target.value }))}
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notes de terrain / Contexte</label>
                  <Textarea 
                    placeholder="ex: Pas de site mobile, gérant ouvert mais manque de temps." 
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
export default LeadsHeader;
