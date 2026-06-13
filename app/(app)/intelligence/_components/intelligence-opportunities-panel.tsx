'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import Link from 'next/link';

interface Opportunity {
  id: string;
  leadId: string;
  businessName: string;
  niche: string;
  city: string;
  signal: string;
  score: number;
  type: 'seo' | 'website' | 'reviews';
}

export function IntelligenceOpportunitiesPanel() {
  const { leads } = useReach();

  // Parse real leads to build dynamic opportunities
  const dynamicOpportunities: Opportunity[] = [];

  leads.forEach((lead) => {
    const allNotesText = (lead.notes?.map(n => n.content).join(' ') || '') + ' ' + (lead.nextAction || '');
    
    // Parse rating and reviews count from source
    let rating = 4.0;
    let reviews = 0;
    const ratingMatch = lead.source.match(/([0-9.]+)\s*★/);
    const reviewsMatch = lead.source.match(/\(([0-9]+)\s*avis\)/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
    if (reviewsMatch) reviews = parseInt(reviewsMatch[1]);

    let hasIssue = false;
    let signal = '';
    let score = 50;
    let type: 'seo' | 'website' | 'reviews' = 'seo';

    if (allNotesText.toLowerCase().includes('aucun site') || allNotesText.toLowerCase().includes('pas de site') || !lead.contactEmail) {
      signal = "Absence de site internet référencé. Excellente opportunité de création de site internet.";
      score += 35;
      type = 'website';
      hasIssue = true;
    } else if (allNotesText.toLowerCase().includes('non sécurisé') || allNotesText.toLowerCase().includes('pas de https')) {
      signal = "Site internet existant non sécurisé (pas de HTTPS), pénalisant le SEO local.";
      score += 20;
      type = 'seo';
      hasIssue = true;
    } else if (allNotesText.toLowerCase().includes('non optimisé mobiles') || allNotesText.toLowerCase().includes('viewport absent')) {
      signal = "Site web non optimisé pour les mobiles (viewport absent). Perte de clients mobiles.";
      score += 25;
      type = 'website';
      hasIssue = true;
    } else if (allNotesText.toLowerCase().includes('temps de réponse lent') || allNotesText.toLowerCase().includes('lent à charger')) {
      signal = "Vitesse de chargement lente, impactant négativement le positionnement de la fiche.";
      score += 15;
      type = 'website';
      hasIssue = true;
    }

    if (rating < 4.0) {
      signal = signal 
        ? `${signal} Note Google Maps faible (${rating}★, ${reviews} avis).` 
        : `Note Google Maps faible (${rating}★) avec seulement ${reviews} avis. Besoin d'e-réputation.`;
      score += 15;
      if (type === 'seo') type = 'reviews';
      hasIssue = true;
    }

    if (allNotesText.toLowerCase().includes('non revendiquée')) {
      signal = signal 
        ? `${signal} Fiche GMB non revendiquée.` 
        : "Fiche Google My Business non revendiquée par le propriétaire actuel.";
      score += 20;
      type = 'seo';
      hasIssue = true;
    }

    if (hasIssue) {
      dynamicOpportunities.push({
        id: `dyn-opp-${lead.id}`,
        leadId: lead.id,
        businessName: lead.businessName,
        niche: lead.niche,
        city: lead.city,
        signal: signal.substring(0, 120),
        score: Math.min(score, 98),
        type
      });
    }
  });

  // Fallback default opportunities if no leads with issues exist
  const defaultOpportunities: Opportunity[] = [
    {
      id: 'opp-1',
      leadId: 'lead-1',
      businessName: "Boulangerie L'Épi d'Or",
      niche: 'Boulangerie / Artisanat',
      city: 'Lyon',
      signal: 'Site web obsolète (non responsive, pas de commande mobile) + opportunité Click & Collect.',
      score: 94,
      type: 'website'
    },
    {
      id: 'opp-2',
      leadId: 'lead-2',
      businessName: 'Garage du Centre',
      niche: 'Automobile',
      city: 'Villeurbanne',
      signal: 'Fiche Google My Business non revendiquée et aucun avis client récent (concurrent à 300m très actif).',
      score: 88,
      type: 'seo'
    },
    {
      id: 'opp-3',
      leadId: 'lead-4',
      businessName: 'Restaurant Le Bistrot Gourmand',
      niche: 'Restauration',
      city: 'Lyon',
      signal: 'Pas de menu consultable en ligne, absence de référencement sur les portails de livraison locaux.',
      score: 75,
      type: 'reviews'
    }
  ];

  const opportunitiesToShow = dynamicOpportunities.length > 0 
    ? [...dynamicOpportunities, ...defaultOpportunities].slice(0, 4)
    : defaultOpportunities;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400';
    if (score >= 80) return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
    return 'text-slate-600 bg-slate-50 border-slate-100 dark:bg-slate-900 dark:text-slate-400';
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Opportunités Prioritaires</CardTitle>
            <p className="text-[11px] text-muted-foreground">Comptes à fort potentiel de conversion ciblés par l&apos;IA.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5">
        {opportunitiesToShow.map((opp) => (
          <div 
            key={opp.id} 
            className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/60 bg-card hover:border-border transition-all group/card"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* Top metadata */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground truncate">{opp.businessName}</span>
                <span className="text-[9px] text-muted-foreground">• {opp.city}</span>
              </div>

              {/* Signal details */}
              <div className="flex gap-1.5 text-[10px] text-muted-foreground leading-normal">
                {opp.type === 'website' ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="line-clamp-2">{opp.signal}</span>
              </div>
            </div>

            {/* Score & link */}
            <div className="flex items-center gap-2.5 shrink-0 pl-2">
              <div className={`flex flex-col items-center justify-center h-10 w-12 rounded border text-center ${getScoreColor(opp.score)}`}>
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Score</span>
                <span className="text-xs font-black mt-0.5">{opp.score}</span>
              </div>

              <Button 
                asChild
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-secondary shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
              >
                <Link href={opp.leadId.startsWith('lead-') ? `/leads` : `/leads`}>
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="sr-only">Voir le prospect</span>
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default IntelligenceOpportunitiesPanel;

