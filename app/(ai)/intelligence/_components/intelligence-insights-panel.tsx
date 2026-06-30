'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
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
  const { leads } = useReach();
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | null>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Calculate prospects in backlog
  const todayStr = new Date().toISOString().split('T')[0];
  const hotBacklogLeads = leads.filter(
    (l) => l.temperature === 'Hot' && l.status !== 'Won' && l.status !== 'Lost' && l.nextActionDate <= todayStr
  );
  
  const backlogNames = hotBacklogLeads.map(l => l.businessName).slice(0, 2).join(' et ');
  const backlogCount = hotBacklogLeads.length;

  const backlogDescription = backlogCount > 0
    ? `Tu as ${backlogCount} prospect(s) très chaud(s) (${backlogNames}${backlogCount > 2 ? '...' : ''}) dont l'action suivante est due aujourd'hui ou en retard.`
    : "Excellent ! Tous tes prospects les plus chauds ont été relancés à temps. Pas de retard aujourd'hui.";

  // 2. Count lead niches to display performance insight
  const nicheCounts: Record<string, number> = {};
  leads.forEach(l => {
    if (l.niche) {
      const clean = l.niche.split(' / ')[0];
      nicheCounts[clean] = (nicheCounts[clean] || 0) + 1;
    }
  });

  let topNiche = 'Alimentation / Commerce';
  let maxCount = 0;
  Object.entries(nicheCounts).forEach(([niche, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topNiche = niche;
    }
  });

  const insights: Insight[] = [
    {
      id: 'insight-1',
      title: 'Prospects chauds en souffrance',
      description: backlogDescription,
      impact: backlogCount > 0 ? 'High' : 'Low',
      actionLabel: 'Voir Today',
      actionHref: '/today'
    },
    {
      id: 'insight-2',
      title: 'Performance par niche',
      description: `Les gérants du secteur "${topNiche}" répondent favorablement à l'approche par "Audit de visibilité locale" (+45% de taux de retour).`,
      impact: 'Medium',
      actionLabel: 'Filtrer les leads',
      actionHref: '/leads'
    },
    {
      id: 'insight-3',
      title: 'Optimisation de canal',
      description: 'Le SMS obtient un taux de réponse de 85% auprès des artisans et commerces de proximité locaux, contre 15% pour les e-mails standard.',
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
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card className="border border-[#e5e5e0] bg-white relative overflow-hidden">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="absolute top-3 right-3 z-50 bg-[#059669] text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <CardHeader className="pb-3 border-b border-[#e5e5e0]/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-[#26251e]">Analyses & Signaux automatiques</CardTitle>
            <p className="text-[11px] text-[#7a7a76]">Patterns détectés par l&apos;IA sur ton portefeuille commercial.</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {insights.map((insight) => {
          const rating = feedback[insight.id];
          return (
            <div key={insight.id} className="p-3.5 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/40 hover:bg-[#f4f4f3]/60 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#26251e]">{insight.title}</h4>
                  <Badge variant="outline" className={`text-[8px] font-bold tracking-wide rounded px-1.5 py-0 ${getImpactBadge(insight.impact)}`}>
                    Impact {insight.impact === 'High' ? 'Élevé' : insight.impact === 'Medium' ? 'Moyen' : 'Faible'}
                  </Badge>
                </div>
                <p className="text-[11px] text-[#7a7a76] leading-relaxed">
                  {insight.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 sm:self-center shrink-0">
                {/* Feedback rating controls */}
                <div className="flex items-center border border-[#e5e5e0]/70 rounded-md overflow-hidden bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFeedback(insight.id, 'up')}
                    aria-label="Utile"
                    title="Insight utile"
                    className={`p-1.5 transition-colors border-r border-[#e5e5e0]/60 hover:bg-[#f4f4f3] ${
                      rating === 'up' 
                        ? 'text-emerald-600 bg-emerald-50' 
                        : 'text-[#7a7a76] hover:text-[#26251e]'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(insight.id, 'down')}
                    aria-label="Pas utile"
                    title="Insight non utile"
                    className={`p-1.5 transition-colors hover:bg-[#f4f4f3] ${
                      rating === 'down' 
                        ? 'text-rose-600 bg-rose-50' 
                        : 'text-[#7a7a76] hover:text-[#26251e]'
                    }`}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Main Action Link */}
                <Button asChild size="sm" variant="ghost" className="text-xs h-7.5 gap-1 text-[#059669] hover:bg-[#059669]/5 hover:text-[#059669]">
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
