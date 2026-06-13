'use client';

import React, { useState, useEffect } from 'react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Loader2, 
  Sparkles, 
  Check, 
  Star, 
  Database,
  Plus
} from 'lucide-react';

interface ScrapedLead {
  id: string;
  businessName: string;
  niche: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  rating: number;
  reviewsCount: number;
  mapsUrl: string;
  seoAudit: string;
}

interface IntelligenceScrapeShortcutProps {
  onImportComplete?: () => void;
}

export function IntelligenceScrapeShortcut({ onImportComplete }: IntelligenceScrapeShortcutProps) {
  const { addLead } = useReach();
  
  // Local settings preferences
  const [niches, setNiches] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Search state parameters
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [customQuery, setCustomQuery] = useState('');

  // Scrape states
  const [scraping, setScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState(0);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);

  const scrapeSteps = [
    "Initialisation de l'agent Minerva...",
    "Recherche sur Google Maps...",
    "Extraction des fiches...",
    "Analyse de l'optimisation SEO..."
  ];

  // Load target preferences on mount
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('niches, cities')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) {
            setNiches(data.niches || []);
            setCities(data.cities || []);
            if (data.niches?.length > 0) setSelectedNiche(data.niches[0]);
            if (data.cities?.length > 0) setSelectedCity(data.cities[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load user settings preferences:", e);
      }
      setLoadingPrefs(false);
    };
    fetchPrefs();
  }, []);

  const handleStartScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapedLeads([]);
    setSelectedIds([]);
    setImportCount(null);
    setScraping(true);
    setScrapeStep(0);
    setScrapeProgress(10);

    const stepInterval = setInterval(() => {
      setScrapeStep(prev => {
        if (prev < scrapeSteps.length - 1) return prev + 1;
        return prev;
      });
      setScrapeProgress(prev => {
        if (prev < 90) return prev + 25;
        return prev;
      });
    }, 2000);

    try {
      const nicheQuery = customQuery ? customQuery : `${selectedNiche} ${selectedCity}`;
      
      const res = await fetch('/api/scrape-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: customQuery ? 'Recherche libre' : selectedNiche,
          city: customQuery ? 'Recherche libre' : selectedCity,
          query: nicheQuery,
          sources: ['google']
        })
      });
      
      const data = await res.json();
      
      clearInterval(stepInterval);
      setScrapeProgress(100);
      
      setTimeout(() => {
        if (data.leads) {
          setScrapedLeads(data.leads);
          setSelectedIds(data.leads.map((l: ScrapedLead) => l.id));
        }
        setScraping(false);
      }, 600);

    } catch (err) {
      console.error("Scrape failed:", err);
      clearInterval(stepInterval);
      setScraping(false);
      alert("La prospection a échoué. Veuillez réessayer.");
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(scrapedLeads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const handleImportLeads = async () => {
    if (selectedIds.length === 0) return;
    setImporting(true);
    
    const leadsToImport = scrapedLeads.filter(l => selectedIds.includes(l.id));
    
    try {
      for (const item of leadsToImport) {
        let temp: 'Hot' | 'Warm' | 'Cold' = 'Warm';
        if (item.rating < 4.0 || !item.website) {
          temp = 'Hot';
        }

        await addLead({
          businessName: item.businessName,
          contactName: 'Gérant',
          contactEmail: item.email || '',
          niche: item.niche,
          city: item.city,
          source: `Maps - ${item.rating}★ (${item.reviewsCount} avis)`,
          status: 'New',
          temperature: temp,
          nextAction: item.seoAudit ? item.seoAudit.substring(0, 100) : "Vérifier la fiche Google Maps",
          nextActionDate: new Date().toISOString().split('T')[0],
          notes: `Données importées via Google Maps Scraper :\n- Note : ${item.rating}/5 (${item.reviewsCount} avis)\n- Site Internet : ${item.website || 'Aucun détecté'}\n- Téléphone : ${item.phone || 'Non spécifié'}\n- Opportunité : ${item.seoAudit}\n- URL Maps : ${item.mapsUrl}`
        });
      }

      setImportCount(leadsToImport.length);
      setScrapedLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue lors de l'importation");
    }
    setImporting(false);
  };

  const getOpportunityBadge = (rating: number, website: string) => {
    if (!website) {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[8px] font-bold rounded">
          ⚠️ Pas de site
        </Badge>
      );
    }
    if (rating < 4.0) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-bold rounded">
          🔥 SEO Faible
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[8px] font-bold rounded">
        ✓ Correct
      </Badge>
    );
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Recherche Google Maps Rapide</CardTitle>
            <p className="text-[11px] text-muted-foreground">Scrape et identifie instantanément les anomalies SEO locales.</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <form onSubmit={handleStartScrape} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Niche</label>
              <select
                value={selectedNiche}
                onChange={(e) => {
                  setSelectedNiche(e.target.value);
                  setCustomQuery('');
                }}
                disabled={scraping || loadingPrefs}
                className="w-full text-xs rounded-md border border-input bg-card h-8 px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {niches.length > 0 ? (
                  niches.map(n => <option key={n} value={n}>{n}</option>)
                ) : (
                  <option value="">Niches...</option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Ville</label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setCustomQuery('');
                }}
                disabled={scraping || loadingPrefs}
                className="w-full text-xs rounded-md border border-input bg-card h-8 px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {cities.length > 0 ? (
                  cities.map(c => <option key={c} value={c}>{c}</option>)
                ) : (
                  <option value="">Villes...</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Recherche personnalisée</label>
            <Input
              placeholder="Ex: Restaurant Lyon, Garage Villeurbanne..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              disabled={scraping}
              className="text-xs h-8 bg-card"
            />
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={scraping || loadingPrefs}
              size="sm"
              className="h-8 text-[11px] font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {scraping ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Scan en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Scanner Google Maps</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Loading Progress */}
        {scraping && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex flex-col gap-2.5 animate-pulse">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
              <span className="text-[11px] font-semibold text-foreground">
                {scrapeSteps[scrapeStep] || "Extraction des données..."}
              </span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 rounded-full" 
                style={{ width: `${scrapeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Scraped Results Table */}
        {!scraping && scrapedLeads.length > 0 && (
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span>Résultats ({scrapedLeads.length})</span>
              </span>
              
              <Button 
                onClick={handleImportLeads} 
                disabled={importing || selectedIds.length === 0}
                size="sm"
                className="h-7 text-[10px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {importing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                <span>Importer ({selectedIds.length})</span>
              </Button>
            </div>

            <div className="rounded-md border border-border overflow-hidden bg-card max-h-[220px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[30px] p-2 text-center">
                      <Checkbox 
                        checked={selectedIds.length === scrapedLeads.length}
                        onCheckedChange={handleToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-[9px] font-bold uppercase p-2">Établissement</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase p-2">Avis</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase p-2">Opportunité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scrapedLeads.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="p-2 text-center">
                        <Checkbox 
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleToggleSelectRow(item.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="p-2 font-medium text-xs max-w-[120px] truncate" title={item.businessName}>
                        {item.businessName}
                      </TableCell>
                      <TableCell className="p-2 text-xs">
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                          <span className="font-semibold text-[10px]">{item.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        {getOpportunityBadge(item.rating, item.website)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Import Success banner */}
        {importCount !== null && (
          <div className="p-3 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-lg flex items-start gap-2.5 animate-in fade-in duration-300">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{importCount} prospects importés !</h4>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Retrouve-les dans ton CRM local. Les anomalies SEO ont été ajoutées comme opportunités.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
