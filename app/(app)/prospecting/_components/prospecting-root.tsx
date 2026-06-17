'use client';

import React, { useState, useEffect } from 'react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Map, MapMarker, MarkerContent, MarkerPopup } from '@/components/ui/map';
import {
  Search,
  MapPin,
  Building,
  Loader2,
  Sparkles,
  Check,
  Globe,
  Phone,
  Star,
  AlertCircle,
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
  latitude?: number;
  longitude?: number;
}

function getLeadMarkerColor(item: ScrapedLead): string {
  if (!item.website) return '#f54e00'; // Hot
  if (item.rating < 4.0) return '#10b981'; // Warm
  return '#807d72'; // Cold
}

export function ProspectingRoot() {
  const { addLead, leads } = useReach();
  
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
  const [sources, setSources] = useState<string[]>(['google', 'yelp', 'pagesjaunes']);
  // Filters
  const [minRating, setMinRating] = useState(0);
  const [excludeExisting, setExcludeExisting] = useState(true);

  const handleToggleSource = (source: string, checked: boolean) => {
    if (checked) {
      setSources(prev => [...prev, source]);
    } else {
      setSources(prev => prev.filter(s => s !== source));
    }
  };

  const scrapeSteps = [
    "Initialisation de l'agent de recherche Minerva...",
    "Localisation des commerces locaux sur Google Maps...",
    "Extraction des fiches et statistiques de visibilité...",
    "Recherche des coordonnées de contact et réseaux...",
    "Analyse de l'optimisation SEO locale par l'IA..."
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

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj && electronObj.updateScrapingStatus) {
      electronObj.updateScrapingStatus(
        'running',
        customQuery ? 'Recherche libre' : selectedNiche,
        customQuery ? 'Recherche libre' : selectedCity
      );
    }

    // Dynamic step progression interval
    const stepInterval = setInterval(() => {
      setScrapeStep(prev => {
        if (prev < scrapeSteps.length - 1) return prev + 1;
        return prev;
      });
      setScrapeProgress(prev => {
        if (prev < 90) return prev + 20;
        return prev;
      });
    }, 2500);

    try {
      const nicheQuery = customQuery ? customQuery : `${selectedNiche} ${selectedCity}`;
      const nativeSources = sources.filter(s => s !== 'apify');
      const useApify = sources.includes('apify');

      // Run native and Apify scrapes in parallel when both selected
      const fetches: Promise<Response>[] = [];
      if (nativeSources.length > 0) {
        fetches.push(fetch(getApiUrl('/api/scrape-maps'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche: customQuery ? 'Recherche libre' : selectedNiche,
            city: customQuery ? 'Recherche libre' : selectedCity,
            query: nicheQuery,
            sources: nativeSources,
          }),
        }));
      }
      if (useApify) {
        fetches.push(fetch(getApiUrl('/api/scrape-apify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche: customQuery ? 'Recherche libre' : selectedNiche,
            city: customQuery ? 'Recherche libre' : selectedCity,
            query: nicheQuery,
          }),
        }));
      }

      const responses = await Promise.all(fetches);
      const dataArr = await Promise.all(responses.map(r => r.json()));
      const allLeads: ScrapedLead[] = dataArr.flatMap((d: any) => d.leads ?? []);

      // Apply filters
      const existingMapsUrls = new Set(
        excludeExisting ? leads.map(l => l.mapsUrl).filter(Boolean) : []
      );
      const filtered = allLeads.filter(l => {
        if (minRating > 0 && l.rating < minRating) return false;
        if (excludeExisting && l.mapsUrl && existingMapsUrls.has(l.mapsUrl)) return false;
        return true;
      });

      const data = { leads: filtered };

      clearInterval(stepInterval);
      setScrapeProgress(100);

      // Delay slightly to let the 100% state display
      setTimeout(() => {
        if (data.leads) {
          setScrapedLeads(data.leads);
          // Auto select all scraped leads by default
          setSelectedIds(data.leads.map((l: ScrapedLead) => l.id));

          if (electronObj && electronObj.updateScrapingStatus) {
            electronObj.updateScrapingStatus('idle');
          }
          if (electronObj && electronObj.sendNotification) {
            electronObj.sendNotification(
              "Minerva OS Reach Lite",
              `${data.leads.length} prospects extraits avec succès !`
            );
          }
        }
        setScraping(false);
      }, 800);

    } catch (err) {
      console.error("Scrape failed:", err);
      clearInterval(stepInterval);
      setScraping(false);

      if (electronObj && electronObj.updateScrapingStatus) {
        electronObj.updateScrapingStatus('idle');
      }
      if (electronObj && electronObj.sendNotification) {
        electronObj.sendNotification(
          "Erreur du Scraper",
          "La recherche de prospects a échoué."
        );
      }
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
        // Temperature based on opportunity
        let temp: 'Hot' | 'Warm' | 'Cold' = 'Warm';
        if (item.rating < 4.0 || !item.website) {
          temp = 'Hot';
        }

        // Import using the unified addLead method
        await addLead({
          businessName: item.businessName,
          contactName: 'Gérant',
          contactEmail: item.email || '',
          niche: item.niche,
          city: item.city,
          source: 'Scraper Google Maps',
          status: 'New',
          temperature: temp,
          nextAction: !item.website 
            ? "Proposer la création d'un site web responsive mobile-first"
            : "Créer un audit de référencement local Google Maps gratuit",
          nextActionDate: new Date().toISOString().split('T')[0],
          notes: `Données importées via Google Maps Scraper :\n- Note : ${item.rating}/5 (${item.reviewsCount} avis)\n- Site Internet : ${item.website || 'Aucun détecté'}\n- Téléphone : ${item.phone || 'Non spécifié'}\n- Opportunité : ${item.seoAudit}\n- URL Maps : ${item.mapsUrl}`
        });
      }

      setImportCount(leadsToImport.length);
      // Remove imported leads from results list
      setScrapedLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      alert("Une erreur est survenue lors de l'importation");
    }
    setImporting(false);
  };

  const getOpportunityBadge = (rating: number, website: string) => {
    if (!website) {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold rounded">
          ⚠️ Pas de site web
        </Badge>
      );
    }
    if (rating < 4.0) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold rounded">
          🔥 SEO Faible ({rating}★)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[9px] font-bold rounded">
        ✓ Profil correct
      </Badge>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20" />
      <div className="max-w-6xl mx-auto p-6 space-y-6 relative z-10">
        
        {/* Title Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-foreground flex items-center gap-2">
            <Search className="h-5.5 w-5.5 text-primary" />
            <span>Prospection Google Maps</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Scrape les fiches locales, identifie les opportunités SEO/web et importe-les instantanément dans ton CRM.
          </p>
        </div>

        {/* Configuration panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Settings Shortcuts card */}
          <Card className="border border-border bg-card md:col-span-2">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="h-4 w-4 text-primary" />
                <span>Paramètres de recherche</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleStartScrape} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Niche */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Niche cible</label>
                    <select
                      value={selectedNiche}
                      onChange={(e) => {
                        setSelectedNiche(e.target.value);
                        setCustomQuery('');
                      }}
                      disabled={scraping || loadingPrefs}
                      className="w-full text-xs rounded-md border border-input bg-card h-8.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {niches.length > 0 ? (
                        niches.map(n => <option key={n} value={n}>{n}</option>)
                      ) : (
                        <option value="">Chargement...</option>
                      )}
                    </select>
                  </div>

                  {/* Select City */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ville cible</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setCustomQuery('');
                      }}
                      disabled={scraping || loadingPrefs}
                      className="w-full text-xs rounded-md border border-input bg-card h-8.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {cities.length > 0 ? (
                        cities.map(c => <option key={c} value={c}>{c}</option>)
                      ) : (
                        <option value="">Chargement...</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="h-px bg-border/50 my-2" />

                {/* Free query override */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Recherche libre (écrase les sélecteurs)</span>
                    {customQuery && <span className="text-[9px] text-primary lowercase italic">Actif</span>}
                  </label>
                  <Input
                    placeholder="Ex: Clinique dentaire Lyon, Boulangerie Villeurbanne..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    disabled={scraping}
                    className="text-xs h-8.5 bg-card"
                  />
                </div>

                <div className="h-px bg-border/50 my-2" />

                {/* Sources list selection checklist */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sources & Annuaires à scraper</label>
                  <div className="flex flex-wrap gap-5 py-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <Checkbox
                        checked={sources.includes('google')}
                        onCheckedChange={(checked) => handleToggleSource('google', !!checked)}
                        disabled={scraping}
                      />
                      <span>Google Maps / OSM</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <Checkbox
                        checked={sources.includes('yelp')}
                        onCheckedChange={(checked) => handleToggleSource('yelp', !!checked)}
                        disabled={scraping}
                      />
                      <span>Yelp</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <Checkbox
                        checked={sources.includes('pagesjaunes')}
                        onCheckedChange={(checked) => handleToggleSource('pagesjaunes', !!checked)}
                        disabled={scraping}
                      />
                      <span>PagesJaunes</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <Checkbox
                        checked={sources.includes('apify')}
                        onCheckedChange={(checked) => handleToggleSource('apify', !!checked)}
                        disabled={scraping}
                      />
                      <span className="flex items-center gap-1">
                        Apify
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">+riche</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="h-px bg-border/50 my-2" />

                {/* Filters */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtres de résultats</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                        <span>Note minimum</span>
                        <span className="font-bold text-foreground">{minRating > 0 ? `${minRating}★` : 'Aucune'}</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={0.5}
                        value={minRating}
                        onChange={(e) => setMinRating(parseFloat(e.target.value))}
                        disabled={scraping}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>0</span><span>2.5</span><span>5</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 pt-1">
                      <Checkbox
                        id="excludeExisting"
                        checked={excludeExisting}
                        onCheckedChange={(c) => setExcludeExisting(!!c)}
                        disabled={scraping}
                      />
                      <label htmlFor="excludeExisting" className="text-xs font-medium text-foreground cursor-pointer leading-snug">
                        Exclure les leads déjà dans le CRM
                        <span className="block text-[10px] text-muted-foreground font-normal">Comparaison par URL Google Maps</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button 
                    type="submit" 
                    disabled={scraping || loadingPrefs}
                    className="h-9 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/95"
                  >
                    {scraping ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Recherche en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Lancer la recherche</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quick Info Explanation Card */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>Comment ça marche ?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs text-muted-foreground space-y-3 leading-relaxed">
              <p>
                1. <strong>Sélectionnez vos filtres</strong> ou tapez une recherche personnalisée.
              </p>
              <p>
                2. Minerva va interroger l&apos;API de scraping Google Maps pour extraire les profils d&apos;établissements physiques.
              </p>
              <p>
                3. L&apos;outil analyse les faiblesses des fiches (<strong>mauvaise note</strong>, <strong>pas de site responsive</strong>) pour qualifier le prospect.
              </p>
              <p>
                4. Cochez les opportunités intéressantes pour les insérer directement dans votre pipeline CRM local.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Loading progress visualization */}
        {scraping && (
          <Card className="border border-primary/20 bg-primary/5 shadow-xs animate-pulse">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-xs font-semibold text-foreground">
                  {scrapeSteps[scrapeStep]}
                </span>
              </div>
              <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500 ease-out rounded-full" 
                  style={{ ['--progress' as string]: `${scrapeProgress}%`, width: 'var(--progress)' } as React.CSSProperties}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Phase {scrapeStep + 1} sur {scrapeSteps.length}</span>
                <span>{scrapeProgress}% complété</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scraped Leads list results */}
        {!scraping && scrapedLeads.length > 0 && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-primary" />
                  <span>Résultats du scraping ({scrapedLeads.length} trouvés)</span>
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Sélectionnez les fiches à importer. Les leads avec de fortes opportunités de refonte ou de référencement local sont marqués d&apos;un indicateur.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-muted-foreground font-mono">
                  {selectedIds.length} sélectionné(s)
                </span>
                <Button 
                  onClick={handleImportLeads} 
                  disabled={importing || selectedIds.length === 0}
                  size="sm"
                  className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Importation...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Importer dans le CRM</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px] text-center pl-4">
                      <Checkbox 
                        checked={selectedIds.length === scrapedLeads.length}
                        onCheckedChange={handleToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Établissement</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Secteur / Ville</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Avis Google Maps</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Coordonnées</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider pr-4">Opportunité de vente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scrapedLeads.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-center pl-4">
                        <Checkbox 
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleToggleSelectRow(item.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground truncate max-w-[200px]" title={item.businessName}>
                          {item.businessName}
                        </div>
                        <a 
                          href={item.mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[9px] text-primary hover:underline"
                        >
                          Fiche Google Maps ↗
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{item.niche}</div>
                        <div className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {item.city}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold">{item.rating}</span>
                          <span className="text-[10px] text-muted-foreground">({item.reviewsCount} avis)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        {item.phone ? (
                          <div className="text-[10px] text-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{item.phone}</span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-muted-foreground italic">Pas de téléphone</div>
                        )}
                        {item.website ? (
                          <a 
                            href={item.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 max-w-[150px] truncate"
                          >
                            <Globe className="h-3 w-3 shrink-0" />
                            <span>{item.website.replace(/https?:\/\/(www\.)?/, '')}</span>
                          </a>
                        ) : (
                          <div className="text-[9px] text-rose-500/80 italic font-semibold">Aucun site internet</div>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <div className="space-y-1">
                          <div>{getOpportunityBadge(item.rating, item.website)}</div>
                          <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2 max-w-[220px]" title={item.seoAudit}>
                            {item.seoAudit}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Quebec map of scraped results */}
        {!scraping && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Carte des résultats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {scrapedLeads.length > 0 ? (
                <div className="rounded-b-2xl overflow-hidden" style={{ height: 400 }}>
                  <Map center={[-72.5, 46.8]} zoom={5.5} theme="light">
                    {scrapedLeads.map((item) => (
                      <MapMarker
                        key={item.id}
                        longitude={item.longitude ?? -73.5674}
                        latitude={item.latitude ?? 45.5019}
                      >
                        <MarkerContent>
                          <div
                            className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-lg"
                            style={{ backgroundColor: getLeadMarkerColor(item) }}
                          />
                        </MarkerContent>
                        <MarkerPopup>
                          <div className="text-xs space-y-0.5 p-1">
                            <p className="font-bold text-foreground">{item.businessName}</p>
                            <p className="text-muted-foreground">{item.niche} · {item.city}</p>
                            <p className="text-muted-foreground">{item.rating}★ ({item.reviewsCount} avis)</p>
                          </div>
                        </MarkerPopup>
                      </MapMarker>
                    ))}
                  </Map>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
                  Lance un scrape pour voir les résultats sur la carte
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Success notification */}
        {importCount !== null && (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-4 rounded-lg flex items-center gap-3 animate-in fade-in duration-300">
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Prospects importés avec succès !</h4>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                {importCount} nouveaux prospects locaux ont été ajoutés à votre portefeuille de leads dans le statut <strong>Nouveau (New)</strong>.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProspectingRoot;
