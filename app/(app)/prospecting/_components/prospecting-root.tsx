'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Search, MapPin, Building, Loader2, Sparkles, Check, Globe, Phone, Star,
  Database, Plus, X, ChevronDown, WifiOff, CheckCircle2, Settings2, BarChart3,
  ExternalLink, Download, ArrowUpDown, SlidersHorizontal, History, Clock,
} from 'lucide-react';

interface ScrapeJobRecord {
  id: string;
  niches: string[];
  cities: string[];
  sources: string[];
  status: 'running' | 'completed' | 'failed';
  resultsCount: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

const HISTORY_KEY = 'minerva_scrape_history';

const MONTREAL_NICHES = [
  'Restaurant / Café', 'Bar / Pub / Lounge', 'Pizzeria / Fast-food', 'Boulangerie / Pâtisserie',
  'Épicerie / Alimentation', 'Traiteur / Événements', 'Boucher / Charcuterie',
  'Salon de coiffure', 'Barbier', 'Esthéticienne / Spa', 'Tatoueur / Perceur',
  'Clinique dentaire', 'Médecin / Clinique médicale', 'Pharmacie indépendante',
  'Physiothérapie / Chiro', 'Optique / Opticien', 'Psychologue / Thérapeute',
  'Clinique vétérinaire',
  'Plombier', 'Électricien', 'Peintre en bâtiment', 'Couvreur / Toiture',
  'Menuisier / Charpentier',
  'Garage auto / Mécanicien', 'Carrosserie', 'Pneus & Jantes', 'Motocyclette',
  'Avocat', 'Notaire', 'Comptable / CPA', 'Assurance', 'Architecte', 'Agence immobilière',
  'Agence web / Marketing', 'Informatique / IT',
  'Gym / Fitness', 'Studio yoga / Pilates', 'Salle de danse',
  'Nettoyage résidentiel / Commercial',
  'Photographe', 'Vidéaste',
  'Fleuriste', 'Déménageur', 'École de conduite',
  'Garderie / CPE', 'École / Formation',
  'Serrurier', 'Bijouterie', 'Librairie', 'Teinturerie / Laverie',
  'Hôtel / Gîte',
];

const QUEBEC_CITIES = [
  'Montréal', 'Québec', 'Laval', 'Longueuil', 'Gatineau', 'Sherbrooke',
  'Saguenay', 'Lévis', 'Trois-Rivières', 'Terrebonne', 'Saint-Jérôme',
  'Blainville', 'Repentigny', 'Mirabel', 'Brossard', 'Saint-Eustache',
  'Dollard-des-Ormeaux', 'Rouyn-Noranda', 'Sept-Îles', 'Rimouski',
  'Drummondville', 'Saint-Jean-sur-Richelieu', 'Saint-Hyacinthe', 'Granby',
  'Shawinigan', 'Joliette', 'Anjou', 'Pierrefonds', 'Verdun', 'Lasalle',
  'LaSalle', 'Mascouche', 'Boucherville', 'Varennes', 'Mont-Tremblant',
  'Val-d\'Or', 'Amos', 'Chibougamau',
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
  source?: string;
  latitude?: number;
  longitude?: number;
}

type SortKey = 'default' | 'rating_asc' | 'rating_desc' | 'opportunity' | 'reviews_desc';

function getOpportunityScore(l: ScrapedLead): number {
  let score = 0;
  if (!l.website) score += 40;
  if (l.rating < 3.5) score += 30;
  else if (l.rating < 4.0) score += 15;
  if (l.reviewsCount < 10) score += 20;
  if (l.phone) score += 5;
  return score;
}

function getLeadMarkerColor(item: ScrapedLead): string {
  if (!item.website) return '#ef4444';
  if (item.rating < 4.0) return '#f59e0b';
  return '#10b981';
}

function getOpportunityBadge(rating: number, website: string) {
  if (!website) return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold">⚠ Sans site</Badge>;
  if (rating < 4.0) return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">🔥 SEO Faible</Badge>;
  return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[9px] font-bold">✓ Correct</Badge>;
}

function exportCsv(leads: ScrapedLead[]) {
  const headers = ['Établissement', 'Niche', 'Ville', 'Note', 'Avis', 'Téléphone', 'Email', 'Site Web', 'Adresse', 'Google Maps', 'Audit SEO', 'Source'];
  const rows = leads.map(l => [
    l.businessName, l.niche, l.city, l.rating, l.reviewsCount,
    l.phone, l.email, l.website, l.address ?? '', l.mapsUrl, l.seoAudit, l.source ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `minerva-prospects-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SCRAPE_STEPS = [
  'Initialisation de l\'agent de recherche Minerva...',
  'Localisation des commerces locaux (OSM / Overpass)...',
  'Extraction des fiches et statistiques de visibilité...',
  'Fusion des sources et déduplication...',
  'Analyse des opportunités SEO par l\'IA...',
];

export function ProspectingRoot() {
  const { addLead, leads } = useReach();

  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [apifyConfigured, setApifyConfigured] = useState<boolean | 'checking'>('checking');
  const [hereConfigured, setHereConfigured] = useState<boolean | 'checking'>('checking');
  const [yelpConfigured, setYelpConfigured] = useState<boolean | 'checking'>('checking');
  const [firecrawlConfigured, setFirecrawlConfigured] = useState<boolean | 'checking'>('checking');
  const [userCities, setUserCities] = useState<string[]>([]);

  // Niche selector
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [nicheSearchQuery, setNicheSearchQuery] = useState('');
  const [nicheDropdownOpen, setNicheDropdownOpen] = useState(false);

  // City selector (multi)
  const [selectedCities, setSelectedCities] = useState<string[]>(['Montréal']);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  const [customQuery, setCustomQuery] = useState('');

  // Sources
  const [selectedSources, setSelectedSources] = useState<string[]>(['google']);

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [maxResults, setMaxResults] = useState(100);
  const [radius, setRadius] = useState(10000);
  const [excludeExisting, setExcludeExisting] = useState(true);
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);

  // Results
  const [scraping, setScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState(0);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('default');

  // Job history
  const [jobHistory, setJobHistory] = useState<ScrapeJobRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setJobHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [selectedPopupLead, setSelectedPopupLead] = useState<ScrapedLead | null>(null);
  const [sourceSummary, setSourceSummary] = useState('');
  const [apifyFallbackMsg, setApifyFallbackMsg] = useState<string | null>(null);
  const [osmWarningMsg, setOsmWarningMsg] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('settings').select('niches, cities, apify_token, here_api_key, yelp_api_key, firecrawl_api_key').eq('user_id', user.id).maybeSingle();
          if (data) {
            setUserCities((data as any).cities || []);
            if ((data as any).cities?.length > 0) setSelectedCities([(data as any).cities[0]]);
            const token = (data as any).apify_token;
            setApifyConfigured(!!(token && token !== 'native' && token.startsWith('apify_api_')));
            const hereKey = (data as any)?.here_api_key;
            setHereConfigured(!!(hereKey && hereKey.length > 5));
            const yelpKey = (data as any)?.yelp_api_key;
            setYelpConfigured(!!(yelpKey && yelpKey.length > 10));
            const firecrawlKey = (data as any)?.firecrawl_api_key;
            setFirecrawlConfigured(!!(firecrawlKey && firecrawlKey.length > 5));
          } else {
            setApifyConfigured(false);
            setHereConfigured(false);
            setYelpConfigured(false);
            setFirecrawlConfigured(false);
          }
        }
      } catch {
        setApifyConfigured(false);
        setHereConfigured(false);
        setYelpConfigured(false);
        setFirecrawlConfigured(false);
      }
      setLoadingPrefs(false);
    };
    init();
  }, []);

  const allCities = [...new Set([...userCities, ...QUEBEC_CITIES])];
  const filteredNiches = MONTREAL_NICHES.filter(n => n.toLowerCase().includes(nicheSearchQuery.toLowerCase()));
  const filteredCities = allCities.filter(c => c.toLowerCase().includes(citySearchQuery.toLowerCase()));

  const toggleNiche = (n: string) => setSelectedNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  const toggleCity = (c: string) => setSelectedCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const sources = [
    { id: 'google', label: 'Google Maps / OSM', description: 'Données ouvertes — toujours disponible', available: true },
    { id: 'here', label: 'HERE Places', description: hereConfigured === true ? 'Clé configurée — 250k req/mois gratuits' : hereConfigured === false ? 'Clé manquante → Paramètres > Intégrations' : 'Vérification...', available: hereConfigured, needsKey: true },
    { id: 'yelp', label: 'Yelp Fusion', description: yelpConfigured === true ? 'Clé configurée — 500 req/jour gratuits' : yelpConfigured === false ? 'Clé manquante → Paramètres > Intégrations' : 'Vérification...', available: yelpConfigured, needsKey: true },
    { id: 'pagesjaunes', label: 'PagesJaunes / YellowPages', description: firecrawlConfigured === true ? 'Clé Firecrawl configurée — YellowPages.ca' : firecrawlConfigured === false ? 'Clé Firecrawl manquante → Paramètres > Intégrations' : 'Vérification...', available: firecrawlConfigured, needsKey: true },
    { id: '411', label: '411.ca', description: 'Scraping direct gratuit — données variables', available: true },
    {
      id: 'apify', label: 'Apify (Google Places)',
      description: apifyConfigured === true ? 'Clé configurée — données enrichies (photos, email)' : apifyConfigured === false ? 'Clé manquante → Paramètres > Intégrations' : 'Vérification...',
      available: apifyConfigured, needsKey: true,
    },
  ];

  const saveJobHistory = useCallback((jobs: ScrapeJobRecord[]) => {
    const limited = jobs.slice(0, 20);
    setJobHistory(limited);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(limited)); } catch { /* ignore */ }
  }, []);

  const handleStartScrape = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapedLeads([]);
    setSelectedIds([]);
    setImportCount(null);
    setSourceSummary('');
    setApifyFallbackMsg(null);
    setOsmWarningMsg(null);
    setScraping(true);
    setScrapeStep(0);
    setScrapeProgress(10);

    const jobId = crypto.randomUUID();
    const job: ScrapeJobRecord = {
      id: jobId,
      niches: selectedNiches.length > 0 ? selectedNiches : ['commerce local'],
      cities: selectedCities.length > 0 ? selectedCities : ['Montréal'],
      sources: selectedSources,
      status: 'running',
      resultsCount: 0,
      startedAt: new Date().toISOString(),
    };
    setJobHistory(prev => {
      const next = [job, ...prev].slice(0, 20);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj?.updateScrapingStatus) electronObj.updateScrapingStatus('running', selectedNiches[0] ?? customQuery, selectedCities[0]);

    const stepInterval = setInterval(() => {
      setScrapeStep(prev => (prev < SCRAPE_STEPS.length - 1 ? prev + 1 : prev));
      setScrapeProgress(prev => (prev < 88 ? prev + 18 : prev));
    }, 2400);

    try {
      const niches = selectedNiches.length > 0 ? selectedNiches : ['commerce local'];
      const cities = selectedCities.length > 0 ? selectedCities : ['Montréal'];
      const nativeSources = selectedSources.filter(s => s !== 'apify');
      const useApify = selectedSources.includes('apify') && apifyConfigured === true;

      // Always include OSM ('google') as fallback — even when only Apify is selected.
      // This guarantees leads are returned if Apify times out or returns empty results.
      const effectiveNativeSources = nativeSources.length > 0 ? nativeSources : (useApify ? ['google'] : []);

      type FetchResult = { leads: ScrapedLead[]; source: string; errorMsg?: string };

      const checkResponseJson = async (r: Response) => {
        const contentType = r.headers.get('content-type');
        if (!r.ok || !contentType || !contentType.includes('application/json')) {
          const text = await r.text();
          throw new Error(text.slice(0, 80) || `HTTP error ${r.status}`);
        }
        return r.json();
      };

      const osmPromise: Promise<FetchResult> = effectiveNativeSources.length > 0
        ? fetch(getApiUrl('/api/scrape-maps'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ niches, cities, query: customQuery || undefined, sources: effectiveNativeSources, maxResults, radius }),
          })
            .then(checkResponseJson)
            .then((d: any) => ({ leads: d.leads ?? [], source: 'osm' }))
            .catch((err) => { console.warn('[prospecting] OSM fetch error:', err); return { leads: [], source: 'osm', errorMsg: String(err) }; })
        : Promise.resolve({ leads: [], source: 'osm' });

      const apifyPromise: Promise<FetchResult> = useApify
        ? fetch(getApiUrl('/api/scrape-apify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ niches, cities, query: customQuery || undefined, maxResults }),
          })
            .then(checkResponseJson)
            .then((d: any) => d.error
              ? { leads: [], source: 'apify', errorMsg: d.error }
              : { leads: d.leads ?? [], source: 'apify' })
            .catch((err) => { console.warn('[prospecting] Apify fetch error:', err); return { leads: [], source: 'apify', errorMsg: String(err) }; })
        : Promise.resolve({ leads: [], source: 'apify' });

      const [osmResult, apifyResult] = await Promise.all([osmPromise, apifyPromise]);

      // Detect OSM empty result
      if (osmResult.leads.length === 0 && effectiveNativeSources.includes('google')) {
        if (osmResult.errorMsg) {
          setOsmWarningMsg(`OSM indisponible (${osmResult.errorMsg.slice(0, 80)}). Activez Apify pour des résultats Google Maps garantis.`);
        } else {
          setOsmWarningMsg('Aucun résultat OSM pour cette niche — les métiers de service (plombier, électricien…) sont peu référencés dans OpenStreetMap. Activez Apify pour accéder aux données Google Maps.');
        }
      }

      // Detect Apify failure to show informational banner
      if (useApify && (apifyResult.errorMsg || apifyResult.leads.length === 0)) {
        const raw = apifyResult.errorMsg ?? 'aucun résultat retourné';
        // Translate technical JSON/HTML errors into a user-friendly hint
        const reason = raw.includes('SyntaxError') || raw.includes('DOCTYPE') || raw.includes('non-JSON') || raw.includes('HTML')
          ? 'La clé API Apify est peut-être invalide ou expirée — vérifiez-la dans Paramètres → Intégrations.'
          : raw;
        setApifyFallbackMsg(`Apify indisponible : ${reason} Leads obtenus via OpenStreetMap / Overpass.`);
      }

      let allLeads: ScrapedLead[] = [...osmResult.leads, ...apifyResult.leads];

      // Client-side dedup by name+city
      const seen = new Set<string>();
      allLeads = allLeads.filter(l => {
        const k = `${l.businessName?.toLowerCase().replace(/[^a-z0-9]/g, '')}|${l.city?.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // Apply filters
      const existingMapsUrls = new Set(excludeExisting ? leads.map(l => l.mapsUrl).filter(Boolean) : []);
      const existingNames = new Set(excludeExisting ? leads.map(l => l.businessName?.toLowerCase().replace(/[^a-z0-9]/g, '')) : []);
      allLeads = allLeads.filter(l => {
        if (minRating > 0 && l.rating > 0 && l.rating < minRating) return false;
        if (excludeExisting && l.mapsUrl && existingMapsUrls.has(l.mapsUrl)) return false;
        if (excludeExisting && existingNames.has(l.businessName?.toLowerCase().replace(/[^a-z0-9]/g, ''))) return false;
        if (onlyNoWebsite && l.website) return false;
        if (onlyWithPhone && !l.phone) return false;
        return true;
      }).slice(0, maxResults);

      const sourceStr = [...new Set(allLeads.map(l => l.source).filter(Boolean))].join(', ');
      setSourceSummary(sourceStr);

      clearInterval(stepInterval);
      setScrapeProgress(100);

      setTimeout(() => {
        setScrapedLeads(allLeads);
        setSelectedIds(allLeads.map(l => l.id));
        setScraping(false);
        if (electronObj?.updateScrapingStatus) electronObj.updateScrapingStatus('idle');
        if (electronObj?.sendNotification) electronObj.sendNotification('Minerva OS', `${allLeads.length} prospects extraits !`);
        // Mark job completed
        setJobHistory(prev => {
          const next = prev.map(j => j.id === jobId ? { ...j, status: 'completed' as const, resultsCount: allLeads.length, completedAt: new Date().toISOString() } : j);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      }, 500);
    } catch (err) {
      console.error('Scrape failed:', err);
      clearInterval(stepInterval);
      setScraping(false);
      if ((window as any).electron?.updateScrapingStatus) (window as any).electron.updateScrapingStatus('idle');
      // Mark job failed
      setJobHistory(prev => {
        const next = prev.map(j => j.id === jobId ? { ...j, status: 'failed' as const, error: String(err), completedAt: new Date().toISOString() } : j);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }
  }, [selectedNiches, selectedCities, selectedSources, customQuery, maxResults, radius, minRating, excludeExisting, onlyNoWebsite, onlyWithPhone, apifyConfigured, leads, saveJobHistory]);

  const sortedLeads = [...scrapedLeads].sort((a, b) => {
    switch (sortKey) {
      case 'rating_asc': return a.rating - b.rating;
      case 'rating_desc': return b.rating - a.rating;
      case 'opportunity': return getOpportunityScore(b) - getOpportunityScore(a);
      case 'reviews_desc': return b.reviewsCount - a.reviewsCount;
      default: return 0;
    }
  });

  const handleImportLeads = async () => {
    if (selectedIds.length === 0) return;
    setImporting(true);
    const leadsToImport = scrapedLeads.filter(l => selectedIds.includes(l.id));
    try {
      for (const item of leadsToImport) {
        const temp: 'Hot' | 'Warm' | 'Cold' = !item.website || item.rating < 3.5 ? 'Hot' : item.rating < 4.2 ? 'Warm' : 'Cold';
        await addLead({
          businessName: item.businessName,
          contactName: '',
          contactEmail: item.email || '',
          niche: item.niche,
          city: item.city,
          source: `Scraper Minerva (${item.source ?? 'osm'})`,
          status: 'New',
          temperature: temp,
          website: item.website,
          rating: item.rating,
          reviewsCount: item.reviewsCount,
          mapsUrl: item.mapsUrl,
          nextAction: !item.website
            ? 'Proposer la création d\'un site web'
            : item.rating < 4.0
              ? 'Audit SEO local Google Maps gratuit'
              : 'Présenter le pack automatisation Minerva',
          nextActionDate: new Date().toISOString().split('T')[0],
          notes: `Source : ${item.source ?? 'Scraper Minerva'}\nNote : ${item.rating}/5 (${item.reviewsCount} avis)\nSite : ${item.website || 'Aucun'}\nTél : ${item.phone || 'N/A'}\nAdresse : ${item.address || 'N/A'}\nMaps : ${item.mapsUrl}\n\nAudit SEO : ${item.seoAudit}`,
        });
      }
      setImportCount(leadsToImport.length);
      setScrapedLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch (e) { console.error(e); }
    setImporting(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-background relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-30 dark:opacity-15"
        style={{ backgroundImage: 'radial-gradient(circle, #a1a1aa 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative z-10 max-w-6xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Prospection locale
          </h1>
          <p className="text-xs text-muted-foreground">
            Scraping OSM (données ouvertes) + Apify Google Maps (clé requise). Filtrez, triez et importez en un clic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Config card */}
          <Card className="md:col-span-2 border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="h-4 w-4 text-primary" />Paramètres de recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleStartScrape} className="space-y-5">

                {/* Niches multi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Niches cibles <span className="normal-case font-normal">(multi-sélection)</span>
                  </label>
                  <div className="relative">
                    <button type="button" onClick={() => setNicheDropdownOpen(!nicheDropdownOpen)} disabled={scraping}
                      className="w-full flex items-center justify-between text-xs rounded-md border border-input bg-card h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-left">
                      <span className="truncate text-muted-foreground">
                        {selectedNiches.length === 0 ? 'Choisir des niches…' : `${selectedNiches.length} niche${selectedNiches.length > 1 ? 's' : ''} sélectionnée${selectedNiches.length > 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                    {nicheDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                        <div className="p-2 border-b border-border/60 sticky top-0 bg-card">
                          <Input placeholder="Rechercher une niche…" value={nicheSearchQuery} onChange={e => setNicheSearchQuery(e.target.value)} className="h-7 text-xs" />
                        </div>
                        <div className="p-1">
                          {filteredNiches.map(n => (
                            <button type="button" key={n} onClick={() => toggleNiche(n)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs hover:bg-muted/50 rounded transition-colors text-left">
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
                  {selectedNiches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedNiches.map(n => (
                        <span key={n} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {n}<button type="button" onClick={() => toggleNiche(n)}><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cities multi */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Villes cibles <span className="normal-case font-normal">(multi-sélection)</span>
                  </label>
                  <div className="relative">
                    <button type="button" onClick={() => setCityDropdownOpen(!cityDropdownOpen)} disabled={scraping}
                      className="w-full flex items-center justify-between text-xs rounded-md border border-input bg-card h-9 px-3 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 text-left">
                      <span className="truncate text-muted-foreground">
                        {selectedCities.length === 0 ? 'Choisir des villes…' : selectedCities.join(', ')}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                    {cityDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                        <div className="p-2 border-b border-border/60 sticky top-0 bg-card">
                          <Input placeholder="Rechercher une ville…" value={citySearchQuery} onChange={e => setCitySearchQuery(e.target.value)} className="h-7 text-xs" />
                        </div>
                        <div className="p-1">
                          {filteredCities.map(c => (
                            <button type="button" key={c} onClick={() => toggleCity(c)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs hover:bg-muted/50 rounded transition-colors text-left">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedCities.includes(c) ? 'bg-primary border-primary' : 'border-input'}`}>
                                {selectedCities.includes(c) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                              </div>
                              <span className={selectedCities.includes(c) ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{c}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedCities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedCities.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />{c}
                          <button type="button" onClick={() => toggleCity(c)}><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Free query */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                    <span>Recherche libre <span className="normal-case font-normal">(remplace niches+villes)</span></span>
                    {customQuery && <span className="text-primary italic text-[9px]">Actif</span>}
                  </label>
                  <Input placeholder="Ex: Clinique dentaire Laval, plombier urgence Québec…" value={customQuery} onChange={e => setCustomQuery(e.target.value)} disabled={scraping} className="text-xs h-9 bg-card" />
                </div>

                <div className="h-px bg-border/50" />

                {/* Sources */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sources <span className="normal-case font-normal">(combinables)</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sources.map(src => {
                      const available = src.available === true;
                      const checking = src.available === 'checking';
                      return (
                        <label key={src.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${available ? 'border-border bg-card cursor-pointer hover:bg-muted/30' : 'border-border/40 bg-muted/20 cursor-not-allowed opacity-60'}`}>
                          <Checkbox checked={selectedSources.includes(src.id)} onCheckedChange={c => {
                            if (!available) return;
                            setSelectedSources(prev => c ? [...prev, src.id] : prev.filter(s => s !== src.id));
                          }} disabled={scraping || !available} className="mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              {src.label}
                              {available && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                              {!available && !checking && <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />}
                              {checking && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{src.description}</p>
                            {(src as any).needsKey && !available && !checking && (
                              <a href="/settings" className="text-[9px] text-primary underline mt-0.5 inline-block">Configurer dans Paramètres →</a>
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5" />Filtres & Limites
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                        <span>Note minimum</span>
                        <span className="font-bold text-foreground">{minRating > 0 ? `${minRating}★` : 'Aucune'}</span>
                      </label>
                      <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={e => setMinRating(parseFloat(e.target.value))} disabled={scraping} className="w-full accent-primary h-1.5 cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>2.5</span><span>5</span></div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                        <span>Limite résultats</span>
                        <span className="font-bold text-foreground">{maxResults}</span>
                      </label>
                      <input type="range" min={10} max={500} step={10} value={maxResults} onChange={e => setMaxResults(parseInt(e.target.value))} disabled={scraping} className="w-full accent-primary h-1.5 cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-muted-foreground"><span>10</span><span>250</span><span>500</span></div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground flex justify-between">
                        <span>Rayon OSM</span>
                        <span className="font-bold text-foreground">{radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}</span>
                      </label>
                      <input type="range" min={2000} max={50000} step={1000} value={radius} onChange={e => setRadius(parseInt(e.target.value))} disabled={scraping} className="w-full accent-primary h-1.5 cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-muted-foreground"><span>2km</span><span>25km</span><span>50km</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-5 pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                      <Checkbox checked={excludeExisting} onCheckedChange={c => setExcludeExisting(!!c)} disabled={scraping} />
                      <span>Exclure leads déjà en CRM</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                      <Checkbox checked={onlyNoWebsite} onCheckedChange={c => setOnlyNoWebsite(!!c)} disabled={scraping} />
                      <span>Sans site web uniquement</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                      <Checkbox checked={onlyWithPhone} onCheckedChange={c => setOnlyWithPhone(!!c)} disabled={scraping} />
                      <span>Avec téléphone uniquement</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={scraping || loadingPrefs || selectedSources.length === 0} className="h-9 text-xs font-bold gap-1.5">
                    {scraping ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Recherche…</> : <><Sparkles className="h-3.5 w-3.5" />Lancer la recherche</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Legend card */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 text-primary" />Légende & Opportunités
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="space-y-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0" /> Sans site web — offre directe</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" /> Site daté / note &lt; 4★ — refonte SEO</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" /> Profil correct — automatisation</div>
              </div>
              <div className="h-px bg-border/60" />
              <div className="space-y-2 text-[10px]">
                <p><strong>Multi-sources :</strong> cochez plusieurs sources pour fusionner les résultats. Elles tournent en parallèle.</p>
                <p><strong>Multi-villes :</strong> sélectionnez plusieurs villes pour scraper en même temps.</p>
                <p><strong>Multi-niches :</strong> toutes les niches sélectionnées sont envoyées — une requête OSM par niche.</p>
                <p><strong>Rayon OSM :</strong> rayon de recherche autour du centre-ville de chaque ville cible.</p>
                <p><strong>Tri :</strong> « Opportunité » classe les prospects sans site ou à note faible en tête.</p>
                <p><strong>Export CSV :</strong> disponible après scrape, avec BOM UTF-8 pour Excel.</p>
              </div>
              <div className="h-px bg-border/60" />
              <p className="text-[10px]"><strong>Apify</strong> retourne des données plus riches (photos, emails réels). <a href="/settings" className="text-primary underline">Configurer la clé →</a></p>
            </CardContent>
          </Card>
        </div>

        {/* OSM empty-result banner */}
        {osmWarningMsg && !scraping && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 animate-in fade-in duration-200">
            <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">OSM — 0 résultats.</span>{' '}
              {osmWarningMsg}
              {' '}<a href="/settings" className="text-[#f54e00] underline font-semibold">Configurer Apify →</a>
            </p>
            <button onClick={() => setOsmWarningMsg(null)} className="ml-auto shrink-0 hover:opacity-70 text-amber-600 dark:text-amber-400 transition-opacity">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Apify fallback info banner */}
        {apifyFallbackMsg && !scraping && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 animate-in fade-in duration-200">
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Apify indisponible</span>{' '}
              {apifyFallbackMsg}
              {' '}<a href="/settings" className="text-[#059669] underline font-semibold">Vérifier la clé →</a>
            </p>
            <button onClick={() => setApifyFallbackMsg(null)} className="ml-auto shrink-0 hover:text-foreground text-muted-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Progress */}
        {scraping && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-xs font-semibold text-foreground">{SCRAPE_STEPS[scrapeStep]}</span>
              </div>
              <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-500 ease-out rounded-full" style={{ width: `${scrapeProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Phase {scrapeStep + 1}/{SCRAPE_STEPS.length} — {selectedNiches.length} niche{selectedNiches.length > 1 ? 's' : ''} × {selectedCities.length} ville{selectedCities.length > 1 ? 's' : ''} × {selectedSources.length} source{selectedSources.length > 1 ? 's' : ''}</span>
                <span>{scrapeProgress}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!scraping && scrapedLeads.length > 0 && (
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-primary" />
                  Résultats ({scrapedLeads.length} prospects)
                  {sourceSummary && <span className="normal-case font-normal text-[9px] text-muted-foreground ml-1">via {sourceSummary}</span>}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cochez les opportunités à importer. Triez par note ou opportunité.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sort */}
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="text-[10px] h-8 px-2 rounded-md border border-input bg-card text-foreground"
                >
                  <option value="default">Tri par défaut</option>
                  <option value="opportunity">Opportunité ↓</option>
                  <option value="rating_asc">Note ↑ (la plus faible)</option>
                  <option value="rating_desc">Note ↓ (la plus haute)</option>
                  <option value="reviews_desc">Avis ↓</option>
                </select>
                {/* Export CSV */}
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => exportCsv(sortedLeads)}>
                  <Download className="h-3.5 w-3.5" />CSV
                </Button>
                <span className="text-[10px] font-mono text-muted-foreground">{selectedIds.length} sél.</span>
                <Button onClick={handleImportLeads} disabled={importing || selectedIds.length === 0} size="sm" className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  {importing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Import…</> : <><Plus className="h-3.5 w-3.5" />Importer dans le CRM</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center pl-4">
                      <Checkbox checked={selectedIds.length === scrapedLeads.length && scrapedLeads.length > 0}
                        onCheckedChange={c => setSelectedIds(c ? scrapedLeads.map(l => l.id) : [])} />
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Établissement</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Niche / Ville</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Note</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Coordonnées</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Source</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider pr-4">Opportunité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-center pl-4">
                        <Checkbox checked={selectedIds.includes(item.id)}
                          onCheckedChange={c => setSelectedIds(prev => c ? [...prev, item.id] : prev.filter(id => id !== item.id))} />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground truncate max-w-[180px]">{item.businessName}</div>
                        {item.mapsUrl && (
                          <a href={item.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline">
                            Voir Maps ↗
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground truncate max-w-[120px]">{item.niche}</div>
                        <div className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{item.city}</div>
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
                          : <div className="text-[9px] text-muted-foreground italic">Pas de tél.</div>}
                        {item.website
                          ? <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 max-w-[140px] truncate"><Globe className="h-3 w-3 shrink-0" />{item.website.replace(/https?:\/\/(www\.)?/, '')}</a>
                          : <div className="text-[9px] text-rose-500 font-semibold">Aucun site</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0.5 capitalize">
                          {item.source ?? 'osm'}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4">{getOpportunityBadge(item.rating, item.website)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Analysis */}
        {!scraping && scrapedLeads.length > 0 && (() => {
          const noWeb = scrapedLeads.filter(l => !l.website).length;
          const lowRating = scrapedLeads.filter(l => l.website && l.rating < 4.0).length;
          const good = scrapedLeads.filter(l => l.website && l.rating >= 4.0).length;
          const cityMap: Record<string, number> = {};
          scrapedLeads.forEach(l => { const c = l.city || 'Inconnue'; cityMap[c] = (cityMap[c] ?? 0) + 1; });
          const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const srcMap: Record<string, number> = {};
          scrapedLeads.forEach(l => { const s = l.source ?? 'osm'; srcMap[s] = (srcMap[s] ?? 0) + 1; });

          return (
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-primary" />Analyse des résultats
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opportunités</p>
                    <div className="space-y-1.5">
                      {[{ label: 'sans site', count: noWeb, color: 'bg-red-500' }, { label: 'SEO faible', count: lowRating, color: 'bg-amber-400' }, { label: 'correct', count: good, color: 'bg-emerald-500' }].map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(count / scrapedLeads.length) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-foreground w-20 text-right">{count} {label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Par source</p>
                    <div className="space-y-1">
                      {Object.entries(srcMap).map(([src, count]) => (
                        <div key={src} className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground capitalize">{src}</span>
                          <span className="font-mono font-bold text-foreground">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                      {[{ icon: Phone, label: 'Téléphone', count: scrapedLeads.filter(l => l.phone).length },
                        { icon: Globe, label: 'Site web', count: scrapedLeads.filter(l => l.website).length },
                        { icon: Database, label: 'Email', count: scrapedLeads.filter(l => l.email).length }]
                        .map(({ icon: Icon, label, count }) => (
                          <div key={label} className="flex items-center gap-1.5 text-[10px]">
                            <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{label}</span>
                            <span className="ml-auto font-mono font-bold text-foreground">{count}</span>
                          </div>
                        ))}
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
                <MapPin className="h-4 w-4 text-primary" />Carte des résultats
                {selectedPopupLead && (
                  <button type="button" onClick={() => setSelectedPopupLead(null)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <X className="w-3 h-3" />Fermer popup
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {scrapedLeads.length > 0 ? (
                <div className="rounded-b-2xl overflow-hidden" style={{ height: 480 }}>
                  <Map center={[-73.5674, 45.5019]} zoom={scrapedLeads.some(l => l.latitude) ? 11 : 10} theme="light">
                    {scrapedLeads.map(item => (
                      <MapMarker key={item.id}
                        longitude={item.longitude ?? -73.5674 + (Math.random() - 0.5) * 0.2}
                        latitude={item.latitude ?? 45.5019 + (Math.random() - 0.5) * 0.15}>
                        <MarkerContent>
                          <button type="button" onClick={() => setSelectedPopupLead(item)}
                            className="flex items-center justify-center rounded-full border-2 border-white shadow-md text-white font-bold hover:scale-125 transition-transform"
                            style={{ width: 22, height: 22, backgroundColor: getLeadMarkerColor(item), fontSize: 9 }}>
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
                    {selectedPopupLead?.longitude && selectedPopupLead?.latitude && (
                      <MapPopup longitude={selectedPopupLead.longitude} latitude={selectedPopupLead.latitude} onClose={() => setSelectedPopupLead(null)} closeButton>
                        <div className="text-xs p-2 space-y-2 min-w-[220px] max-w-[260px]">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-foreground leading-snug">{selectedPopupLead.businessName}</p>
                            <span className="shrink-0 w-2 h-2 mt-1 rounded-full" style={{ backgroundColor: getLeadMarkerColor(selectedPopupLead) }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground">{selectedPopupLead.niche} — {selectedPopupLead.city}</p>
                          {selectedPopupLead.address && <p className="text-[10px] text-muted-foreground flex items-start gap-1"><MapPin className="w-2.5 h-2.5 shrink-0 mt-0.5" />{selectedPopupLead.address}</p>}
                          {selectedPopupLead.phone && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5 shrink-0" />{selectedPopupLead.phone}</p>}
                          <div className="flex items-center gap-1 text-[10px]">
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                            <span>{selectedPopupLead.rating}★ ({selectedPopupLead.reviewsCount} avis)</span>
                          </div>
                          {selectedPopupLead.website
                            ? <a href={selectedPopupLead.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 truncate"><Globe className="w-2.5 h-2.5 shrink-0" />{selectedPopupLead.website.replace(/https?:\/\/(www\.)?/, '')}<ExternalLink className="w-2.5 h-2.5 shrink-0" /></a>
                            : <span className="text-[10px] text-rose-500 font-semibold">Aucun site web</span>}
                          <p className="text-[9px] text-muted-foreground italic leading-snug border-t pt-1.5 border-border">{selectedPopupLead.seoAudit}</p>
                          <a href={selectedPopupLead.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline font-semibold">Voir sur Google Maps →</a>
                        </div>
                      </MapPopup>
                    )}
                  </Map>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Lance une recherche pour voir les résultats sur la carte</div>
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

        {/* Scrape History */}
        {jobHistory.length > 0 && (
          <Card className="border border-border bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-primary" />
                  Historique des scrapes ({jobHistory.length})
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowHistory(h => !h)}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showHistory ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent className="p-4">
                <div className="space-y-2">
                  {jobHistory.map(job => (
                    <div key={job.id} className="flex items-center gap-3 text-xs p-2 rounded-md border border-border/60 bg-muted/20">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${job.status === 'completed' ? 'bg-emerald-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-foreground">{job.niches.slice(0, 2).join(', ')}{job.niches.length > 2 ? ` +${job.niches.length - 2}` : ''}</p>
                        <p className="text-[10px] text-muted-foreground">{job.cities.join(', ')} · {job.sources.join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {job.status === 'completed' && <span className="text-emerald-600 font-bold">{job.resultsCount} résultats</span>}
                        {job.status === 'failed' && <span className="text-red-500">Échec</span>}
                        {job.status === 'running' && <span className="text-amber-500">En cours…</span>}
                        <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(job.startedAt).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setJobHistory([]); localStorage.removeItem(HISTORY_KEY); }}
                  className="mt-3 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Effacer l'historique
                </button>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default ProspectingRoot;
