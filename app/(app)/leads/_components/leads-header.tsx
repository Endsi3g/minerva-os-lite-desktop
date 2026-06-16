'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { Plus, RefreshCw, Upload, Check } from 'lucide-react';

export function LeadsHeader() {
  const { leads, addLead } = useReach();

  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

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

        {/* Add Lead — navigate to dedicated page */}
        <Button asChild size="sm" className="gap-2 bg-primary hover:bg-primary/90">
          <Link href="/leads/new">
            <Plus className="h-3.5 w-3.5" />
            <span>Nouveau lead</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
export default LeadsHeader;
