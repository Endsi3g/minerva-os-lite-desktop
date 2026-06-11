'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Insight {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  actionLabel: string;
  actionHref: string;
}

export function IntelligenceInsightsPanel() {
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const insights: Insight[] = [
    {
      id: 'insight-1',
      title: 'Prospects chauds en souffrance',
      description: 'Tu as 2 prospects très chauds (Boulangerie L\'Épi d\'Or et Zen & Co Coiffure) dont l\'action suivante est due aujourd\'hui ou en retard.',
      impact: 'High',
      actionLabel: 'Voir Today',
      actionHref: '/today'
    },
    {
      id: 'insight-2',
      title: 'Performance par niche',
      description: 'Les gérants du secteur "Alimentation / Commerce" et "Restauration" ont un taux de retour 40% plus élevé avec l\'approche "Audit SEO local".',
      impact: 'Medium',
      actionLabel: 'Filtrer les leads',
      actionHref: '/leads'
    },
    {
      id: 'insight-3',
      title: 'Optimisation de canal',
      description: 'Le SMS obtient un taux de réponse de 85% auprès des artisans boulangers et salons de coiffure de la région de Lyon, contre 15% pour les e-mails.',
      impact: 'High',
      actionLabel: 'Ouvrir le pipeline',
      actionHref: '/pipeline'
    }
  ];

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((prev) => {
      const current = prev[id];
      const next = current === type ? null : type;
      
      if (next) {
        setToastMessage('Merci pour ton retour ! L\'algorithme s\'adapte.');
        setTimeout(() => setToastMessage(null), 3000);
      }
      
      return { ...prev, [id]: next };
    });
  };

  const getImpactBadge = (impact: Insight['impact']) => {
    switch (impact) {
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
    }
  };

  return (
    <Card className="border border-border bg-card relative overflow-hidden">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="absolute top-3 right-3 z-50 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Analyses & Signaux automatiques</CardTitle>
            <p className="text-[11px] text-muted-foreground">Patterns détectés par l&apos;IA sur ton portefeuille commercial.</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {insights.map((insight) => {
          const rating = feedback[insight.id];
          return (
            <div key={insight.id} className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-foreground">{insight.title}</h4>
                  <Badge variant="outline" className={`text-[8px] font-bold tracking-wide rounded px-1.5 py-0 ${getImpactBadge(insight.impact)}`}>
                    Impact {insight.impact === 'High' ? 'Élevé' : insight.impact === 'Medium' ? 'Moyen' : 'Faible'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:self-center shrink-0">
                {/* Feedback rating controls */}
                <div className="flex items-center border border-border/60 rounded-md overflow-hidden bg-card shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFeedback(insight.id, 'up')}
                    aria-label="Utile"
                    title="Insight utile"
                    className={`p-1.5 transition-colors border-r border-border/40 hover:bg-muted ${
                      rating === 'up' 
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(insight.id, 'down')}
                    aria-label="Pas utile"
                    title="Insight non utile"
                    className={`p-1.5 transition-colors hover:bg-muted ${
                      rating === 'down' 
                        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Main Action Link */}
                <Button asChild size="sm" variant="ghost" className="text-xs h-7.5 gap-1 text-primary hover:bg-primary/5 hover:text-primary">
                  <Link href={insight.actionHref}>
                    <span>{insight.actionLabel}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default IntelligenceInsightsPanel;
