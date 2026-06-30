'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { RefreshCw, Sparkles, BookOpen } from 'lucide-react';

export function IntelligenceSummariesPanel() {
  const { leads } = useReach();
  const [scope, setScope] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generateSummary = useCallback(async (selectedScope: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setStreamedText('');

    // Build context from real leads data
    const totalLeads = leads.length;
    const uniqueNiches = Array.from(new Set(leads.map((l) => l.niche?.split(' / ')[0] || 'Général')));
    const cities = Array.from(new Set(leads.map((l) => l.city || 'Inconnue')));
    const hotLeads = leads.filter((l) => l.temperature === 'Hot');
    const warmLeads = leads.filter((l) => l.temperature === 'Warm');
    const coldLeads = leads.filter((l) => l.temperature === 'Cold');
    const meetingLeads = leads.filter((l) => l.status === 'Meeting Booked');
    const wonLeads = leads.filter((l) => l.status === 'Won');

    // Build a filtered subset if scope is specific niche
    const scopeLeads = selectedScope === 'all'
      ? leads
      : leads.filter((l) => l.niche?.toLowerCase().includes(selectedScope));

    const portfolioSummary = JSON.stringify({
      total: totalLeads,
      niches: uniqueNiches.slice(0, 6),
      cities: cities.slice(0, 6),
      temperatures: { hot: hotLeads.length, warm: warmLeads.length, cold: coldLeads.length },
      statuses: { meeting: meetingLeads.length, won: wonLeads.length },
      scopeCount: scopeLeads.length,
    });

    const scopeLabel =
      selectedScope === 'all'
        ? 'global (tous les leads)'
        : `niche "${selectedScope}" (${scopeLeads.length} leads)`;

    const systemPrompt = `Tu es un assistant analyste CRM expert en prospection commerciale locale. Voici le portefeuille de leads de l'utilisateur : ${portfolioSummary}. Génère une synthèse stratégique concise (3-4 phrases) pour le scope sélectionné : ${scopeLabel}. Sois précis, actionnable et utilise les données réelles fournies. Réponds en français.`;

    try {
      const response = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Génère une synthèse stratégique pour mon portefeuille CRM. Scope : ${scopeLabel}.`,
            },
          ],
          system: systemPrompt,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get streaming response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              accumulated += delta;
              setStreamedText(accumulated);
            } catch {
              // Partial JSON — ignore
            }
          }
        }
      }

      setHasGenerated(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to generate summary:', err);
        setStreamedText('Erreur lors de la génération. Vérifiez votre connexion et réessayez.');
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, [leads]);

  const handleScopeChange = (val: string) => {
    setScope(val);
    generateSummary(val);
  };

  const handleRegenerate = () => {
    generateSummary(scope);
  };

  return (
    <Card className="border border-[#e5e5e0] bg-white">
      <CardHeader className="pb-3 border-b border-[#e5e5e0]/70">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669]">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#26251e]">Synthèse IA de Portefeuille</CardTitle>
              <p className="text-[11px] text-[#7a7a76]">Résumés thématiques générés à partir des données terrain.</p>
            </div>
          </div>

          {/* Regenerate action */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={generating}
            onClick={handleRegenerate}
            className="h-7 w-7 text-[#7a7a76] hover:text-[#059669] shrink-0"
            title="Régénérer la synthèse"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Scope Selector dropdown */}
        <div className="flex items-center justify-between gap-3 bg-[#f4f4f3]/60 p-2 rounded-lg border border-[#e5e5e0]/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Périmètre :</span>
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger className="h-7.5 w-[160px] text-xs bg-white">
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
        <div className="relative p-3.5 rounded-lg border border-[#e5e5e0] bg-muted/15 min-h-[110px] flex flex-col justify-between">
          {generating && (
            <div className="absolute inset-0 flex items-start justify-start bg-white/20 z-10 backdrop-blur-[1px] rounded-lg">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#059669] p-3.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Génération en cours...</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-[#7a7a76] leading-relaxed">
            {streamedText ? (
              <>
                {streamedText}
                {generating && (
                  <span className="inline-block w-0.5 h-3 bg-[#059669] ml-0.5 animate-pulse" />
                )}
              </>
            ) : !hasGenerated ? (
              <span className="italic text-[#7a7a76]/60">
                Cliquez sur{' '}
                <button
                  onClick={handleRegenerate}
                  className="text-[#059669] hover:underline font-semibold not-italic"
                >
                  Générer
                </button>{' '}
                pour obtenir une synthèse IA de votre portefeuille.
              </span>
            ) : (
              <span className="italic text-[#7a7a76]/60">Aucune synthèse disponible.</span>
            )}
          </div>

          <div className="flex justify-end gap-1.5 pt-3 border-t border-[#e5e5e0]/60 mt-3 text-[9px] text-[#7a7a76]">
            <Sparkles className="h-3 w-3 text-[#059669] shrink-0" />
            <span>Généré par IA à partir de vos données réelles</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IntelligenceSummariesPanel;
