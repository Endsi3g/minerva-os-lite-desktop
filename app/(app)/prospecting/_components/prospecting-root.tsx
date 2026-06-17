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
import { Map, MapMarker, MarkerContent, MarkerPopup, MapPopup } from '@/components/ui/map';
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
  Database,
  Plus,
  X,
  ChevronDown,
  WifiOff,
  CheckCircle2,
  Settings2,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

// ── Montreal popular niches ──────────────────────────────────────────────────
const MONTREAL_NICHES = [
  'Restaurant / Café',
  'Salon de coiffure',
  'Clinique dentaire',
  'Plombier',
  'Électricien',
  'Garage auto / Mécanicien',
  'Avocat / Notaire',
  'Comptable / Fiscaliste',
  'Physiothérapie / Chiro',
  'Agence immobilière',
  'Serrurier / Vitrier',
  'Nettoyage résidentiel',
  'Photographe / Vidéaste',
  'Gym / Studio yoga',
  'Pizzeria / Fast-food',
  'Pharmacie indépendante',
  'Fleuriste',
  'Tatoueur / Perceur',
  'Esthéticienne / Spa',
  'Traiteur / Événements',
  'Déménageur',
  'École de conduite',
  'Garderie / CPE',
  'Clinique vétérinaire',
  'Boulangerie / Pâtisserie',
];

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
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface SourceDef {
  id: string;
  label: string;
  description: string;
  available: boolean | 'checking';
  needsKey?: boolean;
  keyLabel?: string;
}

function getLeadMarkerColor(item: ScrapedLead): string {
  if (!item.website) return '#ef4444';
  if (item.rating < 4.0) return '#f59e0b';
  return '#10b981';
}

export function ProspectingRoot() {
  const { addLead, leads } = useReach();

  const [cities, setCities] = useState<string[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [apifyConfigured, setApifyConfigured] = useState<boolean | 'checking'>('checking');

  // Multi-niche selection
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [nicheSearchQuery, setNicheSearchQuery] = useState('');
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);

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

  // Sources
  const [selectedSources, setSelectedSources] = useState<string[]>(['google']);

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [maxResults, setMaxResults] = useState(50);
  const [excludeExisting, setExcludeExisting] = useState(true);
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);

  // Standalone map popup
  const [selectedPopupLead, setSelectedPopupLead] = useState<ScrapedLead | null>(null);

  const scrapeSteps = [
    "Initialisation de l'agent de recherche Minerva...",
    "Localisation des commerces locaux sur Google Maps / OSM...",
    "Extraction des fiches et statistiques de visibilité...",
    "Recherche des coordonnées de contact...",
    "Analyse de l'optimisation SEO locale par l'IA...",
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('niches, cities, apify_api_key')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) {
            setCities(data.cities || []);
            if (data.cities?.length > 0) setSelectedCity(data.cities[0]);
            setApifyConfigured(!!data.apify_api_key);
          } else {
            setApifyConfigured(false);
          }
        }
      } catch {
        setApifyConfigured(false);
      }
      setLoadingPrefs(false);
    };
    init();
  }, []);

  const sources: SourceDef[] = [
    {
      id: 'google',
      label: 'Google Maps / OSM',
      description: 'Données ouvertes — toujours disponible',
      available: true,
    },
    {
      id: 'yelp',
      label: 'Yelp',
      description: 'Annuaire nord-américain, données limitées',
      available: true,
    },
    {
      id: 'pagesjaunes',
      label: 'PagesJaunes / 411',
      description: 'Annuaire Québec / Canada',
      available: true,
    },
    {
      id: 'apify',
      label: 'Apify Scraper',
      description: apifyConfigured === true
        ? 'Clé API configurée — résultats enrichis'
        : apifyConfigured === false
          ? 'Clé API manquante → configurer dans Paramètres > Intégrations'
          : 'Vérification de la clé API...',
      available: apifyConfigured,
      needsKey: true,
      keyLabel: 'apify_api_key',
    },
  ];

  const filteredNiches = MONTREAL_NICHES.filter(n =>
    n.toLowerCase().includes(nicheSearchQuery.toLowerCase())
  );

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev =>
      prev.includes(niche) ? prev.filter(n => n !== niche) : [...prev, niche]
    );
  };

  const toggleSource = (id: string, checked: boolean) => {
    const src = sources.find(s => s.id === id);
    if (src && src.available !== true) return;
    setSelectedSources(prev =>
      checked ? [...prev, id] : prev.filter(s => s !== id)
    );
  };

  const handleStartScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapedLeads([]);
    setSelectedIds([]);
    setImportCount(null);
    setScraping(true);
    setScrapeStep(0);
    setScrapeProgress(10);

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj?.updateScrapingStatus) {
      electronObj.updateScrapingStatus('running', selectedNiches[0] ?? customQuery, selectedCity);
    }

    const stepInterval = setInterval(() => {
      setScrapeStep(prev => (prev < scrapeSteps.length - 1 ? prev + 1 : prev));
      setScrapeProgress(prev => (prev < 90 ? prev + 20 : prev));
    }, 2500);

    try {
      const nicheQuery = customQuery
        ? customQuery
        : selectedNiches.length > 0
          ? `${selectedNiches.join(' OR ')} ${selectedCity}`
          : selectedCity;

      const nativeSources = selectedSources.filter(s => s !== 'apify');
      const useApify = selectedSources.includes('apify') && apifyConfigured === true;

      const fetches: Promise<Response>[] = [];
      if (nativeSources.length > 0) {
        fetches.push(fetch(getApiUrl('/api/scrape-maps'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche: selectedNiches[0] ?? 'commerce local',
            city: selectedCity || 'Montréal',
            query: nicheQuery,
            sources: nativeSources,
            maxResults,
          }),
        }));
      }
      if (useApify) {
        fetches.push(fetch(getApiUrl('/api/scrape-apify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche: selectedNiches[0] ?? 'commerce local',
            city: selectedCity || 'Montréal',
            query: nicheQuery,
            maxResults,
          }),
        }));
      }

      const responses = await Promise.all(fetches);
      const dataArr = await Promise.all(responses.map(r => r.json()));
      let allLeads: ScrapedLead[] = dataArr.flatMap((d: any) => d.leads ?? []);

      // Deduplicate by businessName+city
      const seen = new Set<string>();
      allLeads = allLeads.filter(l => {
        const key = `${l.businessName}|${l.city}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Apply filters
      const existingMapsUrls = new Set(
        excludeExisting ? leads.map(l => l.mapsUrl).filter(Boolean) : []
      );
      const filtered = allLeads
        .filter(l => {
          if (minRating > 0 && l.rating < minRating) return false;
          if (excludeExisting && l.mapsUrl && existingMapsUrls.has(l.mapsUrl)) return false;
          if (onlyNoWebsite && l.website) return false;
          return true;
        })
        .slice(0, maxResults);

      clearInterval(stepInterval);
      setScrapeProgress(100);

      setTimeout(() => {
        setScrapedLeads(filtered);
        setSelectedIds(filtered.map(l => l.id));
        setScraping(false);
        if (electronObj?.updateScrapingStatus) electronObj.updateScrapingStatus('idle');
        if (electronObj?.sendNotification) {
          electronObj.sendNotification('Minerva OS', `${filtered.length} prospects extraits !`);
        }
      }, 600);
    } catch (err) {
      console.error('Scrape failed:', err);
      clearInterval(stepInterval);
      setScraping(false);
      if (electronObj?.updateScrapingStatus) electronObj.updateScrapingStatus('idle');
    }
  };

  const handleImportLeads = async () => {
    if (selectedIds.length === 0) return;
    setImporting(true);
    const leadsToImport = scrapedLeads.filter(l => selectedIds.includes(l.id));
    try {
      for (const item of leadsToImport) {
        const temp: 'Hot' | 'Warm' | 'Cold' = !item.website || item.rating < 4.0 ? 'Hot' : 'Warm';
        await addLead({
          businessName: item.businessName,
          contactName: 'Gérant',
          contactEmail: item.email || '',
          niche: item.niche,
          city: item.city,
          source: 'Scraper Minerva',
          status: 'New',
          temperature: temp,
          nextAction: !item.website
            ? "Proposer la création d'un site web"
            : "Audit SEO local Google Maps gratuit",
          nextActionDate: new Date().toISOString().split('T')[0],
          notes: `Importé via Minerva Scraper\n- Note : ${item.rating}/5 (${item.reviewsCount} avis)\n- Site : ${item.website || 'Aucun'}\n- Tél : ${item.phone || 'N/A'}\n- Adresse : ${item.address || 'N/A'}\n- Maps : ${item.mapsUrl}`,
        });
      }
      setImportCount(leadsToImport.length);
      setScrapedLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    }
    setImporting(false);
  };

  const getOpportunityBadge = (rating: number, website: string) => {
    if (!website) return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold">⚠️ Sans site</Badge>
    );
    if (rating < 4.0) return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">🔥 SEO Faible</Badge>
    );
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[9px] font-bold">✓ Correct</Badge>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-background relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-30 dark:opacity-15"
        style={{ backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Prospection locale — Montréal
          </h1>
          <p className="text-xs text-muted-foreground">
            Trouvez des entreprises sans site web ou avec un site daté, enrichissez-les et importez-les en un clic dans votre CRM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main config card */}
          <Card className="md:col-span-2 border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="h-4 w-4 text-primary" />
                Paramètres de recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleStartScrape} className="space-y-5">

                {/* Multi-niche selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Niches cibles <span className="normal-case font-normal">(sélection multiple)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNicheDropdownOpen(!nicheDropdownOpen)}
                      disabled={scraping}
                      className="w-full flex items-center justify-between text-xs rounded-md border border-input bg-card h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-left"
                    >
                      <span className="truncate text-muted-foreground">
                        {selectedNiches.length === 0
                          ? 'Choisir des niches…'
                          : `${selectedNiches.length} niche${selectedNiches.length > 1 ? 's' : ''} sélectionnée${selectedNiches.length > 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>

                    {nicheDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                        <div className="p-2 border-b border-border/60 sticky top-0 bg-card">
                          <Input
                            placeholder="Rechercher une niche…"
                            value={nicheSearchQuery}
                            onChange={e => setNicheSearchQuery(e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="p-1">
                          {filteredNiches.map(n => (
                            <button
                              type="button"
                              key={n}
                              onClick={() => toggleNiche(n)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs hover:bg-muted/50 rounded transition-colors text-left"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedNiches.includes(n) ? 'bg-primary border-primary' : 'border-input'}`}>
                                {selectedNiches.includes(n) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                              </div>
                              <span className={selectedNiches.includes(n) ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{n}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected niche tags */}
                  {selectedNiches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedNiches.map(n => (
                        <span key={n} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {n}
                          <button type="button" onClick={() => toggleNiche(n)} className="hover:text-primary/70">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* City + free query */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ville cible</label>
                    <select
                      value={selectedCity}
                      onChange={e => { setSelectedCity(e.target.value); setCustomQuery(''); }}
                      disabled={scraping || loadingPrefs}
                      className="w-full text-xs rounded-md border border-input bg-card h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Montréal">Montréal</option>
                      {cities.filter(c => c !== 'Montréal').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                      <span>Recherche libre</span>
                      {customQuery && <span className="text-primary normal-case italic text-[9px]">Actif</span>}
                    </label>
                    <Input
                      placeholder="Ex: Clinique dentaire Laval..."
                      value={customQuery}
                      onChange={e => setCustomQuery(e.target.value)}
                      disabled={scraping}
                      className="text-xs h-9 bg-card"
                    />
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Sources */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sources</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sources.map(src => {
                      const available = src.available === true;
                      const checking = src.available === 'checking';
                      return (
                        <label
                          key={src.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                            available
                              ? 'border-border bg-card cursor-pointer hover:bg-muted/30'
                              : 'border-border/40 bg-muted/20 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <Checkbox
                            checked={selectedSources.includes(src.id)}
                            onCheckedChange={c => toggleSource(src.id, !!c)}
                            disabled={scraping || !available}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              {src.label}
                              {available && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                              {!available && !checking && <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />}
                              {checking && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                              {src.description}
                            </p>
                            {src.needsKey && !available && !checking && (
                              <a href="/settings" className="text-[9px] text-primary underline mt-0.5 inline-block">
                                Configurer dans Paramètres →
                              </a>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Filters */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filtres & Limites</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Note min */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                        <span>Note minimum</span>
                        <span className="font-bold text-foreground">{minRating > 0 ? `${minRating}★` : 'Aucune'}</span>
                      </label>
                      <input
                        type="range" min={0} max={5} step={0.5} value={minRating}
                        onChange={e => setMinRating(parseFloat(e.target.value))}
                        disabled={scraping}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>2.5</span><span>5</span></div>
                    </div>

                    {/* Max results */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                        <span>Limite de résultats</span>
                        <span className="font-bold text-foreground">{maxResults}</span>
                      </label>
                      <input
                        type="range" min={5} max={200} step={5} value={maxResults}
                        onChange={e => setMaxResults(parseInt(e.target.value))}
                        disabled={scraping}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground"><span>5</span><span>100</span><span>200</span></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                      <Checkbox
                        checked={excludeExisting}
                        onCheckedChange={c => setExcludeExisting(!!c)}
                        disabled={scraping}
                      />
                      <span>Exclure les leads déjà en CRM</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                      <Checkbox
                        checked={onlyNoWebsite}
                        onCheckedChange={c => setOnlyNoWebsite(!!c)}
                        disabled={scraping}
                      />
                      <span>Sans site web uniquement <span className="text-muted-foreground font-normal">(opportunité max)</span></span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={scraping || loadingPrefs || (selectedSources.length === 0)}
                    className="h-9 text-xs font-bold gap-1.5"
                  >
                    {scraping ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Recherche…</>
                    ) : (
                      <><Sparkles className="h-3.5 w-3.5" />Lancer la recherche</>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 text-primary" />
                Légende & Opportunités
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0" /> Sans site web — offre directe</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" /> Site daté / note &lt; 4★ — refonte</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" /> Profil correct — SEO local</div>
              </div>
              <div className="h-px bg-border/60" />
              <p><strong>Résultats de carte :</strong> cliquez sur un marqueur pour voir l'adresse et le téléphone directement.</p>
              <p><strong>Filtre «&nbsp;Sans site web&nbsp;»</strong> : n'affiche que les entreprises sans URL détectée — les meilleures opportunités d'approche directe.</p>
              <p><strong>Apify</strong> retourne des données plus riches (photos, horaires, avis). Configurez votre clé dans <a href="/settings" className="text-primary underline">Paramètres</a>.</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {scraping && (
          <Card className="border border-primary/20 bg-primary/5 animate-pulse">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-xs font-semibold text-foreground">{scrapeSteps[scrapeStep]}</span>
              </div>
              <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-500 ease-out rounded-full" style={{ width: `${scrapeProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Phase {scrapeStep + 1}/{scrapeSteps.length}</span>
                <span>{scrapeProgress}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results table */}
        {!scraping && scrapedLeads.length > 0 && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-primary" />
                  Résultats ({scrapedLeads.length} prospects)
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cochez les opportunités à importer dans votre pipeline.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">{selectedIds.length} sélectionné(s)</span>
                <Button
                  onClick={handleImportLeads}
                  disabled={importing || selectedIds.length === 0}
                  size="sm"
                  className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {importing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Importation…</> : <><Plus className="h-3.5 w-3.5" />Importer dans le CRM</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center pl-4">
                      <Checkbox
                        checked={selectedIds.length === scrapedLeads.length && scrapedLeads.length > 0}
                        onCheckedChange={c => setSelectedIds(c ? scrapedLeads.map(l => l.id) : [])}
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Établissement</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Secteur / Ville</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Note</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Coordonnées</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider pr-4">Opportunité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scrapedLeads.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-center pl-4">
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={c => setSelectedIds(prev => c ? [...prev, item.id] : prev.filter(id => id !== item.id))}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground truncate max-w-[180px]">{item.businessName}</div>
                        {item.mapsUrl && (
                          <a href={item.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline">
                            Fiche Maps ↗
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{item.niche}</div>
                        <div className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />{item.city}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold">{item.rating}</span>
                          <span className="text-[10px] text-muted-foreground">({item.reviewsCount})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs space-y-0.5">
                        {item.phone
                          ? <div className="flex items-center gap-1 text-[10px]"><Phone className="h-3 w-3 text-muted-foreground" />{item.phone}</div>
                          : <div className="text-[9px] text-muted-foreground italic">Pas de tél.</div>
                        }
                        {item.website
                          ? <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 max-w-[140px] truncate"><Globe className="h-3 w-3 shrink-0" />{item.website.replace(/https?:\/\/(www\.)?/, '')}</a>
                          : <div className="text-[9px] text-rose-500 font-semibold">Aucun site</div>
                        }
                      </TableCell>
                      <TableCell className="pr-4">
                        {getOpportunityBadge(item.rating, item.website)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Breakdown stats card */}
        {!scraping && scrapedLeads.length > 0 && (() => {
          const noWeb = scrapedLeads.filter(l => !l.website).length;
          const lowRating = scrapedLeads.filter(l => l.website && l.rating < 4.0).length;
          const good = scrapedLeads.filter(l => l.website && l.rating >= 4.0).length;
          const cityMap: Record<string, number> = {};
          scrapedLeads.forEach(l => { const c = l.city || 'Inconnue'; cityMap[c] = (cityMap[c] ?? 0) + 1; });
          const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const withPhone = scrapedLeads.filter(l => l.phone).length;
          const withEmail = scrapedLeads.filter(l => l.email).length;

          return (
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Analyse des résultats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Opportunity breakdown */}
                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opportunités</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(noWeb / scrapedLeads.length) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-foreground w-16 text-right">{noWeb} sans site</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(lowRating / scrapedLeads.length) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-foreground w-16 text-right">{lowRating} SEO faible</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(good / scrapedLeads.length) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-foreground w-16 text-right">{good} correct</span>
                      </div>
                    </div>
                  </div>

                  {/* City distribution */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Par ville</p>
                    <div className="space-y-1">
                      {topCities.map(([city, count]) => (
                        <div key={city} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground truncate max-w-[80px]">{city}</span>
                          <span className="font-mono font-bold text-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact stats */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contacts</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Téléphone</span>
                        <span className="ml-auto font-mono font-bold text-foreground">{withPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Site web</span>
                        <span className="ml-auto font-mono font-bold text-foreground">{scrapedLeads.filter(l => l.website).length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Database className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Email</span>
                        <span className="ml-auto font-mono font-bold text-foreground">{withEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Map */}
        {!scraping && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                Carte des résultats
                {selectedPopupLead && (
                  <button
                    type="button"
                    onClick={() => setSelectedPopupLead(null)}
                    className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Fermer popup
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {scrapedLeads.length > 0 ? (
                <div className="rounded-b-2xl overflow-hidden" style={{ height: 460 }}>
                  <Map
                    center={[-73.5674, 45.5019]}
                    zoom={scrapedLeads.some(l => l.latitude) ? 11 : 10}
                    theme="light"
                  >
                    {scrapedLeads.map(item => (
                      <MapMarker
                        key={item.id}
                        longitude={item.longitude ?? -73.5674 + (Math.random() - 0.5) * 0.15}
                        latitude={item.latitude ?? 45.5019 + (Math.random() - 0.5) * 0.1}
                      >
                        <MarkerContent>
                          <button
                            type="button"
                            onClick={() => setSelectedPopupLead(item)}
                            className="flex items-center justify-center rounded-full border-2 border-white shadow-md text-white font-bold hover:scale-125 transition-transform"
                            style={{
                              width: 22, height: 22,
                              backgroundColor: getLeadMarkerColor(item),
                              fontSize: 9,
                            }}
                          >
                            {!item.website ? '!' : item.rating < 4 ? '~' : '✓'}
                          </button>
                        </MarkerContent>
                        <MarkerPopup>
                          <div className="text-xs p-1.5 space-y-0.5 min-w-[140px]">
                            <p className="font-bold text-foreground leading-snug">{item.businessName}</p>
                            <p className="text-muted-foreground text-[10px]">{item.niche}</p>
                          </div>
                        </MarkerPopup>
                      </MapMarker>
                    ))}

                    {/* Standalone popup for selected lead */}
                    {selectedPopupLead && selectedPopupLead.longitude && selectedPopupLead.latitude && (
                      <MapPopup
                        longitude={selectedPopupLead.longitude}
                        latitude={selectedPopupLead.latitude}
                        onClose={() => setSelectedPopupLead(null)}
                        closeButton
                      >
                        <div className="text-xs p-2 space-y-2 min-w-[220px] max-w-[260px]">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-foreground leading-snug">{selectedPopupLead.businessName}</p>
                            <span
                              className="shrink-0 w-2 h-2 mt-1 rounded-full"
                              style={{ backgroundColor: getLeadMarkerColor(selectedPopupLead) }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{selectedPopupLead.niche} — {selectedPopupLead.city}</p>
                          {selectedPopupLead.address && (
                            <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                              <MapPin className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                              {selectedPopupLead.address}
                            </p>
                          )}
                          {selectedPopupLead.phone && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 shrink-0" />
                              {selectedPopupLead.phone}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[10px]">
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                            <span>{selectedPopupLead.rating}★ ({selectedPopupLead.reviewsCount} avis)</span>
                          </div>
                          {selectedPopupLead.website ? (
                            <a
                              href={selectedPopupLead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline flex items-center gap-1 truncate"
                            >
                              <Globe className="w-2.5 h-2.5 shrink-0" />
                              {selectedPopupLead.website.replace(/https?:\/\/(www\.)?/, '')}
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-semibold">Aucun site web</span>
                          )}
                          <p className="text-[9px] text-muted-foreground italic leading-snug border-t pt-1.5 border-border">
                            {selectedPopupLead.seoAudit}
                          </p>
                          <a
                            href={selectedPopupLead.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-primary hover:underline font-semibold"
                          >
                            Voir sur Google Maps →
                          </a>
                        </div>
                      </MapPopup>
                    )}
                  </Map>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                  Lance une recherche pour voir les résultats sur la carte
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import success */}
        {importCount !== null && (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-4 flex items-center gap-3 animate-in fade-in">
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{importCount} prospects importés !</h4>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Ajoutés en statut <strong>Nouveau</strong> dans votre pipeline.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProspectingRoot;
