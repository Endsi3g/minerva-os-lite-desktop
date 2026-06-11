'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, BookOpen } from 'lucide-react';

export function IntelligenceSummariesPanel() {
  const [scope, setScope] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(
    'Synthèse globale de ton portefeuille : 5 prospects répartis sur 4 niches commerciales à Lyon et Villeurbanne. Le segment le plus actif est "Boulangerie / Artisanat" (1 lead chaud, démonstration à confirmer). La méthode d\'accroche "Audit SEO local" génère de forts retours dans la niche automobile (1 lead tiède, en attente d\'audit).'
  );

  const summaries: Record<string, string> = {
    all: 'Synthèse globale de ton portefeuille : 5 prospects répartis sur 4 niches commerciales à Lyon et Villeurbanne. Le segment le plus actif est "Boulangerie / Artisanat" (1 lead chaud, démonstration à confirmer). La méthode d\'accroche "Audit SEO local" génère de forts retours dans la niche automobile (1 lead tiède, en attente d\'audit).',
    boulangerie: 'Focus Boulangerie : Jean Dupont (L\'Épi d\'Or) présente un intérêt immédiat pour la commande en ligne. Le prospect est chaud et en attente d\'un appel pour fixer la date de démonstration. L\'angle d\'attaque doit porter sur le gain de temps et la simplicité de la commande mobile.',
    auto: 'Focus Automobile : Le Garage du Centre (Michel Martin) a un besoin flagrant en e-réputation locale (zéro avis Google My Business, fiche non optimisée). L\'envoi programmé d\'un audit de visibilité local personnalisé est crucial aujourd\'hui pour initier le contact.',
    restauration: 'Focus Restauration : Le Bistrot Gourmand (Antoine Lambert) a été identifié via Google Maps. Il n\'y a aucune action en cours hormis une visite physique planifiée pour le passage de fin de service. L\'objectif est d\'identifier le décideur sur place.',
    coiffure: 'Focus Coiffure & Beauté : Zen & Co (Sophie Bernard) a un rendez-vous planifié demain à 14h pour discuter de la gestion automatique de fidélité. Le lead est très chaud et très engagé.'
  };

  const handleScopeChange = (val: string) => {
    setScope(val);
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setSummary(summaries[val] || summaries.all);
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
              <SelectItem value="auto" className="text-xs">Automobile</SelectItem>
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
