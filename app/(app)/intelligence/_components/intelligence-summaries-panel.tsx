'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { RefreshCw, Sparkles, BookOpen } from 'lucide-react';

export function IntelligenceSummariesPanel() {


  const { leads } = useReach();
  const [scope, setScope] = useState('all');
  const [generating, setGenerating] = useState(false);

  // Calculate portfolio stats
  const totalLeads = leads.length;
  const uniqueNiches = new Set(leads.map(l => l.niche?.split(' / ')[0] || 'Général')).size;
  const cities = new Set(leads.map(l => l.city || 'Lyon')).size;
  const hotLeads = leads.filter(l => l.temperature === 'Hot');
  const meetingBookedLeads = leads.filter(l => l.status === 'Meeting Booked');

  const getDynamicSummary = (scopeVal: string) => {
    if (scopeVal === 'all') {
      const activeNiche = leads.length > 0 ? leads[0].niche.split(' / ')[0] : 'Boulangerie';
      return `Synthèse globale de ton portefeuille : ${totalLeads} prospects répartis sur ${uniqueNiches} niches commerciales à travers ${cities} villes. Tu as actuellement ${hotLeads.length} prospects très chauds et ${meetingBookedLeads.length} rendez-vous planifiés dans ton CRM local. Le segment le plus représenté est "${activeNiche}".`;
    }

    // Niche specifics filter
    const keyword = scopeVal === 'coiffure' ? 'coiff' : scopeVal === 'boulangerie' ? 'boulang' : scopeVal;
    const filtered = leads.filter(l => l.niche?.toLowerCase().includes(keyword));
    const count = filtered.length;
    const hotCount = filtered.filter(l => l.temperature === 'Hot').length;

    if (count === 0) {
      return `Focus ${scopeVal.toUpperCase()} : Aucun prospect n'est actuellement enregistré dans cette niche. Utilise la recherche Google Maps Rapide ci-contre pour identifier des opportunités dans le secteur.`;
    }

    const firstLead = filtered[0];
    return `Focus ${scopeVal.toUpperCase()} : Tu as ${count} prospect(s) dans ce secteur commercial, dont ${hotCount} très chaud(s). La priorité immédiate est ${firstLead.businessName} (${firstLead.contactName || 'le gérant'}) à ${firstLead.city}, dont le statut est "${firstLead.status}" (prochaine action : ${firstLead.nextAction || 'non spécifiée'}).`;
  };

  const summary = getDynamicSummary(scope);

  const handleScopeChange = (val: string) => {
    setScope(val);
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
    }, 600);
  };

  const handleRegenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
    }, 800);
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Synthèse IA de Portefeuille</CardTitle>
              <p className="text-[11px] text-muted-foreground">Résumés thématiques générés à partir des données terrain.</p>
            </div>
          </div>

          {/* Regenerate action */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={generating}
            onClick={handleRegenerate}
            className="h-7 w-7 text-muted-foreground hover:text-primary shrink-0"
            title="Régénérer la synthèse"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Scope Selector dropdown */}
        <div className="flex items-center justify-between gap-3 bg-muted/30 p-2 rounded-lg border border-border/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Périmètre :</span>
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger className="h-7.5 w-[160px] text-xs bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Global (Tous les leads)</SelectItem>
              <SelectItem value="boulangerie" className="text-xs">Boulangerie / Artisanat</SelectItem>
              <SelectItem value="automobile" className="text-xs">Automobile</SelectItem>
              <SelectItem value="restauration" className="text-xs">Restauration</SelectItem>
              <SelectItem value="coiffure" className="text-xs">Coiffure & Beauté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Output Area */}
        <div className="relative p-3.5 rounded-lg border border-border bg-muted/15 min-h-[110px] flex flex-col justify-between">
          {generating ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card/65 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Génération de la synthèse...</span>
              </div>
            </div>
          ) : null}

          <div className="text-[11px] text-muted-foreground leading-relaxed">
            {summary}
          </div>

          <div className="flex justify-end gap-1.5 pt-3 border-t border-border/40 mt-3 text-[9px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span>Mis à jour en temps réel</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IntelligenceSummariesPanel;

