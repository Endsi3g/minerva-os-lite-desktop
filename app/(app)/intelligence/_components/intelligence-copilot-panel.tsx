'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReach } from '@/lib/reach-context';
import { MessageSquare, Send, RefreshCw, Sparkle } from 'lucide-react';

export function IntelligenceCopilotPanel() {
  const { leads } = useReach();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeResponse, setActiveResponse] = useState<string | null>(null);

  // 1. Identify the latest lead
  const sortedLeads = [...leads].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const latestLead = sortedLeads[0] || { id: 'lead-5', businessName: 'Cabinet Dentaire Dr. Laurent', contactName: 'Dr. Laurent', niche: 'Santé / Cabinet médical', city: 'Lyon', status: 'Won', notes: [] };

  // Determine dynamic recommendation based on lead audit notes
  const auditText = (latestLead.notes?.map((n) => n.content).join(' ') || '') + ' ' + (latestLead.nextAction || '');
  let recommendation = "Proposer une optimisation complète de la fiche Google Maps (horaires, photos, mots-clés) et l'intégration du widget Minerva pour capter de nouveaux clients.";
  if (auditText.toLowerCase().includes('aucun site') || auditText.toLowerCase().includes('pas de site')) {
    recommendation = "Proposer la création d'un site web vitrine responsive mobile-first et l'ajout d'un module de prise de rendez-vous Minerva.";
  } else if (auditText.toLowerCase().includes('non sécurisé') || auditText.toLowerCase().includes('pas de https')) {
    recommendation = "Proposer la sécurisation SSL/HTTPS du site existant et l'optimisation des balises méta pour de meilleures performances SEO locales.";
  } else if (auditText.toLowerCase().includes('non optimisé mobiles')) {
    recommendation = "Proposer une refonte responsive mobile-first pour éliminer la perte de clientèle naviguant sur smartphones.";
  }

  const responses: Record<string, string> = {
    weekly: `### 📊 Analyse de votre semaine de prospection\n\nVoici le bilan de vos opportunités actuelles :\n\n- **1. Priorité immédiate** : Jean Dupont (**Boulangerie L'Épi d'Or**) attend votre appel pour planifier sa démonstration. C'est votre opportunité la plus chaude (Score: 94).\n- **2. Action en attente** : Michel Martin (**Garage du Centre**) a besoin de son audit SEO local. Préparez-le et envoyez-le par e-mail aujourd'hui pour relancer l'intérêt.\n- **3. RDV Fixé** : Vous avez rendez-vous avec Sophie Bernard (**Zen & Co Coiffure**) ce vendredi à 14h. Révisez l'argumentaire sur la fidélisation automatisée.\n- **4. Prospection de terrain** : Prévoyez un passage physique au **Bistrot Gourmand** en fin de service d'après-midi. L'objectif est d'identifier le gérant et d'obtenir son e-mail.\n\n*Recommandation globale : Concentrez vos efforts sur la validation de la démo de L'Épi d'Or pour verrouiller le deal.*`,
    campaigns: `### 💡 3 Idées de Campagnes Commerciales Ciblées\n\nVoici 3 angles d'approche rédigés pour vos segments locaux :\n\n#### 1. Campagne "Maps Revendiquée" (Spécifique Artisans)\n- **Cible** : Boulangeries, Boucheries, Artisans sans fiche Google Maps optimisée.\n- **Accroche** : *"Vos clients vous cherchent sur Google Maps, mais c'est votre concurrent qu'ils trouvent."*\n- **Action** : Offrir la revendication et l'optimisation GMB gratuite en échange d'une présentation Minerva.\n\n#### 2. Campagne "Click & Collect Express" (Restauration / Alimentation)\n- **Cible** : Restaurants et points de vente locaux sans commande en ligne.\n- **Accroche** : *"Ne laissez plus la file d'attente décourager vos clients du midi."*\n- **Action** : Proposer le module Click & Collect Minerva sans commission pendant 30 jours.\n\n#### 3. Campagne "Fidélité SMS automatisée" (Beauté / Services)\n- **Cible** : Salons de coiffure, Instituts de beauté.\n- **Accroche** : *"Remplissez vos créneaux vides du mardi matin sans passer des heures sur Instagram."*\n- **Action** : Montrer comment Minerva relance automatiquement les clients inactifs par SMS.`,
    argumentaire: `### 🎯 Argumentaire de Vente - ${latestLead.businessName}\n\n*Statut : ${latestLead.status} - Niche : ${latestLead.niche} à ${latestLead.city}*\n\nVoici les points clés rédigés par Minerva pour convaincre **${latestLead.contactName || 'le gérant'}** :\n\n- **1. Point de contact** : Présenter Minerva Reach en s'adressant directement à **${latestLead.contactName || 'le gérant'}**.\n- **2. Signal fort détecté** : ${latestLead.nextAction || 'Fiche locale à auditer et optimiser.'}\n- **3. Solution et Proposition** : ${recommendation}\n- **4. Prochaine étape recommandée** : Proposer un appel court de 5 minutes pour présenter l'audit local gratuit ou passer sur place présenter les maquettes.\n\n*Angle de closing : Axer le discours sur le retour sur investissement rapide et l'augmentation des demandes locales directes.*`
  };

  const handleSuggestionClick = (key: string) => {
    let queryText = '';
    if (key === 'weekly') queryText = "Analyse ma semaine de prospection";
    if (key === 'campaigns') queryText = "Donne-moi 3 idées de campagnes pour mes niches";
    if (key === 'argumentaire') queryText = `Prépare l'argumentaire pour ${latestLead.businessName}`;
    
    setInput(queryText);
    runQuery(queryText, key);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    let matchingKey = 'weekly';
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('campagne') || lowerInput.includes('idée')) matchingKey = 'campaigns';
    if (lowerInput.includes('argumentaire') || lowerInput.includes(latestLead.businessName.toLowerCase())) matchingKey = 'argumentaire';
    
    runQuery(input, matchingKey);
  };

  const runQuery = (queryText: string, key: string) => {
    setLoading(true);
    setActiveResponse(null);
    
    setTimeout(() => {
      setLoading(false);
      setActiveResponse(responses[key] || responses.weekly);
    }, 1000);
  };

  // Helper to parse markdown-like bold list formatting
  const renderResponseText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xs font-bold text-foreground mt-3 mb-1.5 first:mt-0">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-[11px] font-bold text-foreground mt-2 mb-1">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('- ')) {
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        const lineContent = line.replace('- ', '');
        
        while ((match = boldRegex.exec(lineContent)) !== null) {
          if (match.index > lastIndex) {
            parts.push(lineContent.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="text-foreground font-semibold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < lineContent.length) {
          parts.push(lineContent.substring(lastIndex));
        }

        return (
          <li key={i} className="text-[11px] text-muted-foreground list-disc ml-4 mb-1.5 leading-relaxed">
            {parts.length > 0 ? parts : lineContent}
          </li>
        );
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={i} className="text-[11px] italic text-primary mt-2">{line.replace(/\*/g, '')}</p>;
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      return <p key={i} className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{line}</p>;
    });
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Copilote Minerva</CardTitle>
            <p className="text-[11px] text-muted-foreground">Demande à ton copilote d&apos;analyser ou de rédiger pour toi.</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Quick query actions */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Suggestions de requêtes :</span>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => handleSuggestionClick('weekly')}
              className="text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 border border-border/60 hover:border-primary/20 px-2.5 py-1.5 rounded bg-card transition-colors flex items-center justify-between"
            >
              <span>📊 Analyse ma semaine de prospection</span>
              <Sparkle className="h-3 w-3 text-primary shrink-0 opacity-40" />
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('campaigns')}
              className="text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 border border-border/60 hover:border-primary/20 px-2.5 py-1.5 rounded bg-card transition-colors flex items-center justify-between"
            >
              <span>💡 Idées de campagnes locales (SEO, Click & Collect)</span>
              <Sparkle className="h-3 w-3 text-primary shrink-0 opacity-40" />
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('argumentaire')}
              className="text-left text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 border border-border/60 hover:border-primary/20 px-2.5 py-1.5 rounded bg-card transition-colors flex items-center justify-between"
            >
              <span className="truncate">🎯 Rédiger argumentaire pour {latestLead.businessName}</span>
              <Sparkle className="h-3 w-3 text-primary shrink-0 opacity-40" />
            </button>
          </div>
        </div>

        {/* Input box */}
        <form onSubmit={handleSubmit} className="relative rounded-lg border border-border bg-card p-1 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose une question à ton copilote..."
            rows={2}
            className="w-full text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[50px] shadow-none py-1.5 px-2.5"
          />
          <div className="flex items-center justify-between border-t border-border/40 px-2 py-1.5 bg-muted/10">
            <span className="text-[9px] text-muted-foreground">
              Presse Entrée pour envoyer
            </span>
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              size="icon"
              className="h-6 w-6 rounded bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </form>

        {/* Loading and Results viewport */}
        {loading && (
          <div className="p-4 rounded-lg border border-border bg-muted/10 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary animate-spin shrink-0" />
            <span className="text-xs text-muted-foreground">Le copilote Minerva rédige la réponse...</span>
          </div>
        )}

        {activeResponse && !loading && (
          <div className="p-4 rounded-lg border border-border bg-muted/15 max-h-[300px] overflow-y-auto scrollbar-thin animate-in fade-in duration-300">
            <div className="space-y-1">
              {renderResponseText(activeResponse)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IntelligenceCopilotPanel;

