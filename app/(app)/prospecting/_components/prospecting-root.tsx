'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Navigation, Map as MapIcon, Edit3, Target, Trash2, Edit2, GitMerge, Info,
  AlertTriangle, Inbox, CheckCircle, RefreshCw, ThumbsDown
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

type SortKey = 'default' | 'rating_asc' | 'rating_desc' | 'opportunity' | 'reviews_desc' | 'distance_asc' | 'quality';
type SearchMode = 'around_me' | 'par_ville' | 'address' | 'libre';
type ValidationStatus = 'to_verify' | 'ready' | 'imported' | 'ignored';

interface SearchCenter {
  lat: number;
  lon: number;
  label: string;
}

/** Haversine distance in kilometres between two lat/lon points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLeadMarkerColor(item: { website?: string; rating?: number }) {
  if (!item.website) return '#ef4444';
  if (item.rating && item.rating < 4.0) return '#f59e0b';
  return '#10b981';
}

function ScoreGauge({ value, label, color = 'stroke-primary' }: { value: number; label: string; color?: string }) {
  const radius = 16;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1 bg-muted/30 p-2 rounded-lg border border-border/40">
      <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
        <svg className="w-full h-full -rotate-90">
          <circle cx="22" cy="22" r={radius} className="stroke-muted/40 fill-none" strokeWidth={strokeWidth} />
          <circle
            cx="22"
            cy="22"
            r={radius}
            className={`fill-none transition-all duration-500 ease-out ${color}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-mono font-bold text-foreground">{value}</span>
      </div>
      <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider text-center">{label}</span>
    </div>
  );
}

export function ProspectingRoot() {
  const {
    addLead,
    leads,
    leadValidations,
    addLeadValidations,
    updateLeadValidation,
    deleteLeadValidation,
    addOsmFeedback,
    updateLead
  } = useReach();

  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [apifyConfigured, setApifyConfigured] = useState<boolean | 'checking'>('checking');
  const [hereConfigured, setHereConfigured] = useState<boolean | 'checking'>('checking');
  const [yelpConfigured, setYelpConfigured] = useState<boolean | 'checking'>('checking');
  const [firecrawlConfigured, setFirecrawlConfigured] = useState<boolean | 'checking'>('checking');
  const [userCities, setUserCities] = useState<string[]>([]);

  // Search mode
  const [searchMode, setSearchMode] = useState<SearchMode>('par_ville');

  // Geolocation state (around_me mode)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Search center returned by the API
  const [searchCenter, setSearchCenter] = useState<SearchCenter | null>(null);

  // Geocoding state (address mode)
  const [geocodeAddress, setGeocodeAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handleGeocode = async () => {
    if (!geocodeAddress.trim()) return;
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geocodeAddress.trim() + ', QC, Canada')}&limit=1`, {
        headers: {
          'User-Agent': 'Minerva OS CRM (Kaél Belceus)'
        }
      });
      if (!res.ok) throw new Error('Erreur de service');
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const cleanLabel = data[0].display_name.split(',').slice(0, 3).join(',');
        
        setGeocodeResult({ lat, lon, label: cleanLabel });
        setUserLat(lat);
        setUserLon(lon);
      } else {
        setGeocodeError('Adresse introuvable. Spécifiez un numéro de rue et une ville.');
      }
    } catch (err) {
      setGeocodeError('Erreur de connexion au serveur de géocodage.');
    }
    setGeocoding(false);
  };

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

  // Results & UI State
  const [scraping, setScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState(0);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  
  // Validation Inbox Active Tab
  const [activeTab, setActiveTab] = useState<ValidationStatus>('to_verify');
  const [selectedValidationIds, setSelectedValidationIds] = useState<string[]>([]);
  const [expandedValidationId, setExpandedValidationId] = useState<string | null>(null);
  
  // Inline edit state
  const [editingValidationId, setEditingValidationId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({
    businessName: '',
    phone: '',
    website: '',
    address: '',
    email: '',
  });

  const [sortKey, setSortKey] = useState<SortKey>('default');

  // Job history
  const [jobHistory, setJobHistory] = useState<ScrapeJobRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Notifications
  const [importCount, setImportCount] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState<string | null>(null);
  const [selectedPopupLead, setSelectedPopupLead] = useState<any | null>(null);
  const [apifyFallbackMsg, setApifyFallbackMsg] = useState<string | null>(null);
  const [osmWarningMsg, setOsmWarningMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setJobHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

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

  const allCities = useMemo(() => [...new Set([...userCities, ...QUEBEC_CITIES])], [userCities]);
  const filteredNiches = useMemo(() => MONTREAL_NICHES.filter(n => n.toLowerCase().includes(nicheSearchQuery.toLowerCase())), [nicheSearchQuery]);
  const filteredCities = useMemo(() => allCities.filter(c => c.toLowerCase().includes(citySearchQuery.toLowerCase())), [allCities, citySearchQuery]);

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
    setSelectedValidationIds([]);
    setImportCount(null);
    setMergeSuccessMsg(null);
    setApifyFallbackMsg(null);
    setOsmWarningMsg(null);
    setSearchCenter(null);
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
      setScrapeStep(prev => (prev < 4 ? prev + 1 : prev));
      setScrapeProgress(prev => (prev < 88 ? prev + 18 : prev));
    }, 2400);

    try {
      const niches = selectedNiches.length > 0 ? selectedNiches : ['commerce local'];
      const cities = selectedCities.length > 0 ? selectedCities : ['Montréal'];
      const nativeSources = selectedSources.filter(s => s !== 'apify');
      const useApify = selectedSources.includes('apify') && apifyConfigured === true;
      const effectiveNativeSources = nativeSources.length > 0 ? nativeSources : (useApify ? ['google'] : []);

      type FetchResult = { leads: any[]; source: string; errorMsg?: string };

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
            body: JSON.stringify({
              niches,
              cities,
              query: customQuery || undefined,
              sources: effectiveNativeSources,
              maxResults,
              radius,
              ...((searchMode === 'around_me' || searchMode === 'address') && userLat !== null && userLon !== null ? { userLat, userLon } : {}),
            }),
          })
            .then(checkResponseJson)
            .then((d: any) => {
              if (d.searchCenter) setSearchCenter(d.searchCenter);
              return { leads: d.leads ?? [], source: 'osm' };
            })
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

      if (osmResult.leads.length === 0 && effectiveNativeSources.includes('google')) {
        if (osmResult.errorMsg) {
          setOsmWarningMsg(`OSM indisponible (${osmResult.errorMsg.slice(0, 80)}). Activez Apify pour des résultats Google Maps garantis.`);
        } else {
          setOsmWarningMsg('Aucun résultat OSM pour cette niche. Activez Apify pour accéder aux données Google Maps.');
        }
      }

      if (useApify && (apifyResult.errorMsg || apifyResult.leads.length === 0)) {
        const raw = apifyResult.errorMsg ?? 'aucun résultat retourné';
        const reason = raw.includes('SyntaxError') || raw.includes('DOCTYPE') || raw.includes('non-JSON') || raw.includes('HTML')
          ? 'La clé API Apify est peut-être invalide ou expirée — vérifiez-la dans Paramètres → Intégrations.'
          : raw;
        setApifyFallbackMsg(`Apify indisponible : ${reason} Leads obtenus via OpenStreetMap / Overpass.`);
      }

      let allLeads: any[] = [...osmResult.leads, ...apifyResult.leads];

      // Dedup by name+city
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

      clearInterval(stepInterval);
      setScrapeProgress(100);

      // Save leads as validations in database (Layer 1 + Layer 3)
      const validationsToInsert = allLeads.map(l => ({
        businessName: l.businessName,
        niche: l.niche,
        city: l.city,
        phone: l.phone || '',
        email: l.email || '',
        website: l.website || '',
        address: l.address || '',
        rating: l.rating ?? 0,
        reviewsCount: l.reviewsCount ?? 0,
        latitude: l.latitude,
        longitude: l.longitude,
        source: l.source || 'osm',
        status: 'to_verify' as const,
        originalTags: l.originalTags || {},
        qualityScore: l.qualityScore ?? 50,
        completenessScore: l.completenessScore ?? 50,
        localFitScore: l.localFitScore ?? 50,
        opportunityScore: l.opportunityScore ?? 50,
      }));

      if (validationsToInsert.length > 0) {
        await addLeadValidations(validationsToInsert);
      }

      setTimeout(() => {
        setScraping(false);
        setActiveTab('to_verify');
        if (electronObj?.updateScrapingStatus) electronObj.updateScrapingStatus('idle');
        if (electronObj?.sendNotification) electronObj.sendNotification('Minerva OS', `${allLeads.length} prospects extraits et ajoutés à la boîte de validation !`);
        
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
  }, [selectedNiches, selectedCities, selectedSources, customQuery, maxResults, radius, minRating, excludeExisting, onlyNoWebsite, onlyWithPhone, apifyConfigured, leads, saveJobHistory, searchMode, userLat, userLon, addLeadValidations]);

  // Duplicate Check logic
  const getDuplicate = useCallback((val: any) => {
    // Find in CRM leads
    const crmDup = leads.find(l => 
      (l.phone && val.phone && l.phone.replace(/\D/g, '') === val.phone.replace(/\D/g, '')) ||
      (l.website && val.website && l.website.toLowerCase().replace(/https?:\/\/(www\.)?/, '') === val.website.toLowerCase().replace(/https?:\/\/(www\.)?/, '')) ||
      (l.businessName.toLowerCase().trim() === val.businessName.toLowerCase().trim())
    );
    if (crmDup) return { type: 'crm' as const, name: crmDup.businessName, id: crmDup.id };

    // Find in other validations
    const valDup = leadValidations.find(v => 
      v.id !== val.id && v.status !== 'ignored' && (
        (v.phone && val.phone && v.phone.replace(/\D/g, '') === val.phone.replace(/\D/g, '')) ||
        (v.website && val.website && v.website.toLowerCase().replace(/https?:\/\/(www\.)?/, '') === val.website.toLowerCase().replace(/https?:\/\/(www\.)?/, '')) ||
        (v.businessName.toLowerCase().trim() === val.businessName.toLowerCase().trim())
      )
    );
    if (valDup) return { type: 'validation' as const, name: valDup.businessName, id: valDup.id };

    return null;
  }, [leads, leadValidations]);

  // Tab stats
  const stats = useMemo(() => {
    const result = { to_verify: 0, ready: 0, imported: 0, ignored: 0 };
    leadValidations.forEach(val => {
      if (val.status in result) {
        result[val.status as ValidationStatus]++;
      }
    });
    return result;
  }, [leadValidations]);

  // Filtered validations for current tab
  const filteredValidations = useMemo(() => {
    return leadValidations.filter(val => val.status === activeTab);
  }, [leadValidations, activeTab]);

  // Sort validations
  const sortedValidations = useMemo(() => {
    return [...filteredValidations].sort((a, b) => {
      switch (sortKey) {
        case 'rating_asc': return a.rating - b.rating;
        case 'rating_desc': return b.rating - a.rating;
        case 'opportunity': return b.opportunityScore - a.opportunityScore;
        case 'quality': return b.qualityScore - a.qualityScore;
        case 'reviews_desc': return b.reviewsCount - a.reviewsCount;
        case 'distance_asc': {
          if (!searchCenter) return 0;
          const dA = (a.latitude && a.longitude) ? haversineKm(searchCenter.lat, searchCenter.lon, a.latitude, a.longitude) : 99999;
          const dB = (b.latitude && b.longitude) ? haversineKm(searchCenter.lat, searchCenter.lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        }
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest first
      }
    });
  }, [filteredValidations, sortKey, searchCenter]);

  // Inline Actions
  const handleValidateLead = async (id: string) => {
    await updateLeadValidation(id, { status: 'ready' });
  };

  const handleIgnoreLead = async (item: any) => {
    await updateLeadValidation(item.id, { status: 'ignored' });
    await addOsmFeedback({
      niche: item.niche,
      city: item.city,
      actionType: 'ignore',
      originalValue: item.businessName
    });
  };

  const handleStartEdit = (item: any) => {
    setEditingValidationId(item.id);
    setEditFields({
      businessName: item.businessName,
      phone: item.phone,
      website: item.website,
      address: item.address,
      email: item.email,
    });
  };

  const handleSaveEdit = async (id: string) => {
    const original = leadValidations.find(v => v.id === id);
    if (original && original.businessName !== editFields.businessName) {
      await addOsmFeedback({
        niche: original.niche,
        city: original.city,
        actionType: 'correct',
        originalValue: original.businessName,
        correctedValue: editFields.businessName
      });
    }

    await updateLeadValidation(id, {
      businessName: editFields.businessName,
      phone: editFields.phone,
      website: editFields.website,
      address: editFields.address,
      email: editFields.email,
    });
    setEditingValidationId(null);
  };

  const handleMergeDuplicate = async (leadVal: any, dupInfo: { type: 'crm' | 'validation'; name: string; id: string }) => {
    if (dupInfo.type === 'validation') {
      const otherVal = leadValidations.find(v => v.id === dupInfo.id);
      if (otherVal) {
        // Merge missing properties
        await updateLeadValidation(leadVal.id, {
          phone: leadVal.phone || otherVal.phone,
          website: leadVal.website || otherVal.website,
          address: leadVal.address || otherVal.address,
          email: leadVal.email || otherVal.email,
        });
        await deleteLeadValidation(otherVal.id);
        await addOsmFeedback({
          niche: leadVal.niche,
          city: leadVal.city,
          actionType: 'merge',
          originalValue: otherVal.businessName,
          correctedValue: leadVal.businessName
        });
        setMergeSuccessMsg(`Fusionné ${otherVal.businessName} avec ${leadVal.businessName}`);
      }
    } else {
      // CRM Lead merge
      const crmLead = leads.find(l => l.id === dupInfo.id);
      if (crmLead) {
        // Update CRM lead fields
        await updateLead(crmLead.id, {
          phone: crmLead.phone || leadVal.phone || undefined,
          website: crmLead.website || leadVal.website || undefined,
        });
        // Mark as imported
        await updateLeadValidation(leadVal.id, { status: 'imported' });
        setMergeSuccessMsg(`CRM mis à jour avec les coordonnées OSM pour ${leadVal.businessName}`);
      }
    }
  };

  const handleImportToCrm = async (item: any) => {
    setImporting(true);
    try {
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
        latitude: item.latitude,
        longitude: item.longitude,
        phone: item.phone,
        nextAction: !item.website
          ? "Proposer la création d'un site web"
          : item.rating < 4.0
            ? 'Audit SEO local Google Maps gratuit'
            : 'Présenter le pack automatisation Minerva',
        nextActionDate: new Date().toISOString().split('T')[0],
        notes: `Source : ${item.source ?? 'Scraper Minerva'}\nNote : ${item.rating}/5 (${item.reviewsCount} avis)\nSite : ${item.website || 'Aucun'}\nTél : ${item.phone || 'N/A'}\nAdresse : ${item.address || 'N/A'}\nMaps : https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.businessName + ' ' + item.city)}\n\nOpportunités détectées : ${!item.website ? 'Pas de site web' : 'Faible note Google Maps'}`,
      });
      await updateLeadValidation(item.id, { status: 'imported' });
      setImportCount(1);
    } catch (e) {
      console.error(e);
    }
    setImporting(false);
  };

  // Bulk Actions
  const handleBulkValidate = async () => {
    for (const id of selectedValidationIds) {
      await handleValidateLead(id);
    }
    setSelectedValidationIds([]);
  };

  const handleBulkIgnore = async () => {
    for (const id of selectedValidationIds) {
      const item = leadValidations.find(v => v.id === id);
      if (item) await handleIgnoreLead(item);
    }
    setSelectedValidationIds([]);
  };

  const handleBulkImport = async () => {
    setImporting(true);
    let count = 0;
    for (const id of selectedValidationIds) {
      const item = leadValidations.find(v => v.id === id);
      if (item) {
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
          latitude: item.latitude,
          longitude: item.longitude,
          phone: item.phone,
          nextAction: !item.website
            ? "Proposer la création d'un site web"
            : item.rating < 4.0
              ? 'Audit SEO local Google Maps gratuit'
              : 'Présenter le pack automatisation Minerva',
          nextActionDate: new Date().toISOString().split('T')[0],
          notes: `Source : ${item.source ?? 'Scraper'}\nNote : ${item.rating}/5 (${item.reviewsCount} avis)\nTél : ${item.phone || 'N/A'}`,
        });
        await updateLeadValidation(item.id, { status: 'imported' });
        count++;
      }
    }
    setImportCount(count);
    setSelectedValidationIds([]);
    setImporting(false);
  };

  const handleBulkRestore = async () => {
    for (const id of selectedValidationIds) {
      await updateLeadValidation(id, { status: 'to_verify' });
    }
    setSelectedValidationIds([]);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedValidationIds) {
      await deleteLeadValidation(id);
    }
    setSelectedValidationIds([]);
  };

  const handleExportCsv = () => {
    const headers = ['Établissement', 'Niche', 'Ville', 'Note', 'Avis', 'Téléphone', 'Email', 'Site Web', 'Adresse', 'Quality Score', 'Opportunity Score', 'Source'];
    const rows = sortedValidations.map(l => [
      l.businessName, l.niche, l.city, l.rating, l.reviewsCount,
      l.phone, l.email, l.website, l.address ?? '', l.qualityScore, l.opportunityScore, l.source ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minerva-prospects-inbox-${activeTab}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto bg-background relative pb-12">
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
            Scraping OSM (données ouvertes) + Apify Google Maps (clé requise). Validez vos prospects dans l'inbox CRM.
          </p>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 border border-border rounded-lg w-full sm:w-auto self-start">
          {([
            { id: 'around_me', label: 'Autour de moi', icon: Navigation },
            { id: 'par_ville', label: 'Par ville', icon: MapIcon },
            { id: 'address', label: 'Par adresse', icon: MapPin },
            { id: 'libre', label: 'Libre', icon: Edit3 },
          ] as { id: SearchMode; label: string; icon: any }[]).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSearchMode(tab.id);
                // Clear geo/address state on tab switch
                if (tab.id !== 'around_me' && tab.id !== 'address') {
                  setUserLat(null);
                  setUserLon(null);
                }
              }}
              disabled={scraping}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                searchMode === tab.id
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
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

                {/* === MODE: PAR ADRESSE === */}
                {searchMode === 'address' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />Adresse de recherche
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: 123 Rue Sherbrooke, Montréal..."
                        value={geocodeAddress}
                        onChange={e => setGeocodeAddress(e.target.value)}
                        disabled={scraping}
                        className="text-xs h-9 bg-card flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleGeocode}
                        disabled={scraping || geocoding || !geocodeAddress.trim()}
                        className="h-9 text-xs font-semibold px-3"
                      >
                        {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Géocoder'}
                      </Button>
                    </div>

                    {geocodeResult && (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-semibold block">Adresse validée</span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono leading-tight block">{geocodeResult.label}</span>
                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">Coords: {geocodeResult.lat.toFixed(5)}, {geocodeResult.lon.toFixed(5)}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => { setGeocodeResult(null); setUserLat(null); setUserLon(null); }} className="text-emerald-600 hover:text-emerald-800">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {geocodeError && (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{geocodeError}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      La recherche s'effectuera dans le rayon configuré autour de cette adresse validée.
                    </p>
                  </div>
                )}

                {/* === MODE: AUTOUR DE MOI === */}
                {searchMode === 'around_me' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5" />Géolocalisation
                    </label>
                    {geoStatus === 'idle' && (
                      <button
                        type="button"
                        disabled={scraping}
                        onClick={() => {
                          if (!navigator.geolocation) {
                            setGeoError('La géolocalisation n\'est pas supportée par ce navigateur.');
                            setGeoStatus('error');
                            return;
                          }
                          setGeoStatus('requesting');
                          setGeoError(null);
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setUserLat(pos.coords.latitude);
                              setUserLon(pos.coords.longitude);
                              setGeoStatus('granted');
                            },
                            (err) => {
                              setGeoError(err.code === 1 ? 'Permission refusée. Activez la localisation dans les paramètres de votre navigateur.' : 'Impossible d\'obtenir votre position.');
                              setGeoStatus('denied');
                            },
                            { enableHighAccuracy: true, timeout: 10000 }
                          );
                        }}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Utiliser ma position GPS
                      </button>
                    )}
                    {geoStatus === 'requesting' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        Demande de position en cours…
                      </div>
                    )}
                    {geoStatus === 'granted' && userLat !== null && userLon !== null && (
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                           <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="font-semibold">Position détectée</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                            {userLat.toFixed(5)}, {userLon.toFixed(5)}
                          </span>
                        </div>
                        <button type="button" onClick={() => { setGeoStatus('idle'); setUserLat(null); setUserLon(null); }} className="text-emerald-600 hover:text-emerald-800">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {(geoStatus === 'denied' || geoStatus === 'error') && (
                      <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                        <WifiOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{geoError}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Les résultats seront centrés sur votre position exacte (GPS) dans un rayon configurable ci-dessous.
                    </p>
                  </div>
                )}

                {/* Niches multi */}
                {searchMode !== 'libre' && (
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
                )}

                {/* Cities multi — visible only in par_ville mode */}
                {searchMode === 'par_ville' && (
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
                )}

                {/* Free query — visible only in libre mode */}
                {searchMode === 'libre' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                    <span>Recherche libre</span>
                    {customQuery && <span className="text-primary italic text-[9px]">Actif</span>}
                  </label>
                  <Input placeholder="Ex: Clinique dentaire Laval, plombier urgence Québec…" value={customQuery} onChange={e => setCustomQuery(e.target.value)} disabled={scraping} className="text-xs h-9 bg-card" />
                  <p className="text-[10px] text-muted-foreground">Saisie libre — la niche et la ville sont extraites du texte brut.</p>
                </div>
                )}

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

                <div className="flex items-center justify-between">
                  {searchMode === 'around_me' && geoStatus !== 'granted' && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      Activez votre position GPS pour lancer la recherche.
                    </p>
                  )}
                  {searchMode === 'address' && !geocodeResult && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Saisissez et validez une adresse pour activer la recherche.
                    </p>
                  )}
                  <div className="ml-auto">
                    <Button
                      type="submit"
                      disabled={
                        scraping || loadingPrefs || selectedSources.length === 0 ||
                        (searchMode === 'around_me' && geoStatus !== 'granted') ||
                        (searchMode === 'address' && !geocodeResult)
                      }
                      className="h-9 text-xs font-bold gap-1.5"
                    >
                      {scraping ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Recherche…</> : <><Sparkles className="h-3.5 w-3.5" />Lancer la recherche</>}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Legend card */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings2 className="h-4 w-4 text-primary" />Validation & Scoring
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="space-y-2">
                <p>Chaque prospect détecté passe dans un pipeline de qualification et de notation :</p>
                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-emerald-500 text-[9px] text-white flex items-center justify-center font-bold">Q</span> <strong>Score de Qualité :</strong> Pondération globale (complétude, fit, note).</div>
                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-orange-500 text-[9px] text-white flex items-center justify-center font-bold">O</span> <strong>Opportunité :</strong> Haute priorité commerciale (ex. sans site web).</div>
                <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded bg-indigo-500 text-[9px] text-white flex items-center justify-center font-bold">P</span> <strong>Proximité GPS :</strong> Indice de distance locale.</div>
              </div>
              <div className="h-px bg-border/60" />
              <div className="space-y-1.5 text-[10px]">
                <p><strong>À vérifier :</strong> Nouveaux prospects importés.</p>
                <p><strong>Prêts :</strong> Validés manuellement par vos soins.</p>
                <p><strong>Importés :</strong> CRM actif.</p>
                <p><strong>Ignorés :</strong> Faux-positifs exclus (alimentent le feedback loop).</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OSM Empty Warning */}
        {osmWarningMsg && !scraping && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 animate-in fade-in">
            <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold text-foreground">OSM - 0 résultats.</span> {osmWarningMsg}
            </p>
            <button onClick={() => setOsmWarningMsg(null)} className="ml-auto text-amber-600"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Apify fallback warning */}
        {apifyFallbackMsg && !scraping && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Apify indisponible :</span> {apifyFallbackMsg}
            </p>
            <button onClick={() => setApifyFallbackMsg(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Scrape success / merge alerts */}
        {mergeSuccessMsg && (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-3.5 flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{mergeSuccessMsg}</span>
            <button onClick={() => setMergeSuccessMsg(null)} className="ml-auto text-emerald-600"><X className="h-3.5 w-3.5" /></button>
          </Card>
        )}

        {/* Scrape Progress indicator */}
        {scraping && (
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-xs font-semibold text-foreground">
                  {scrapeStep === 0 && 'Initialisation de l\'agent de recherche Minerva...'}
                  {scrapeStep === 1 && 'Localisation des commerces locaux (OSM / Overpass)...'}
                  {scrapeStep === 2 && 'Extraction des fiches et statistiques de visibilité...'}
                  {scrapeStep === 3 && 'Fusion des sources et déduplication...'}
                  {scrapeStep === 4 && 'Calcul des scores d\'opportunité et de qualité...'}
                </span>
              </div>
              <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-500 ease-out rounded-full" style={{ width: `${scrapeProgress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Phase {scrapeStep + 1}/5 — {selectedNiches.length} niche(s) × {selectedCities.length} ville(s)</span>
                <span>{scrapeProgress}%</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search center indicator banner */}
        {searchCenter && !scraping && filteredValidations.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
            <Target className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[11px] text-muted-foreground flex-1">
              <span className="font-semibold text-foreground">Centre de recherche : </span>
              {searchCenter.label} · <span className="font-mono">{searchCenter.lat.toFixed(4)}, {searchCenter.lon.toFixed(4)}</span>
              {' — rayon '}
              <span className="font-semibold text-foreground">{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</span>
            </p>
            <button type="button" onClick={() => setSortKey('distance_asc')} className="text-[10px] text-primary font-semibold hover:underline shrink-0">
              Trier par distance →
            </button>
          </div>
        )}

        {/* Validation Inbox UI Layer */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Inbox className="h-4 w-4 text-primary" />
                  Boîte de Validation de Prospects
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">Qualifiez et enrichissez les données brutes avant l'import final.</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="text-[10px] h-8 px-2 rounded-md border border-input bg-card text-foreground"
                >
                  <option value="default">Plus récents d'abord</option>
                  <option value="quality">Score de qualité ↓</option>
                  <option value="opportunity">Opportunité ↓</option>
                  <option value="rating_asc">Note ↑</option>
                  <option value="rating_desc">Note ↓</option>
                  <option value="reviews_desc">Avis ↓</option>
                  {searchCenter && (
                    <option value="distance_asc">Distance ↑</option>
                  )}
                </select>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCsv} disabled={filteredValidations.length === 0}>
                  <Download className="h-3.5 w-3.5" />Exporter CSV
                </Button>
              </div>
            </div>

            {/* Validation Inbox Tabs & Counts */}
            <div className="flex gap-2 border-b border-border/50 pt-4 flex-wrap">
              {([
                { id: 'to_verify', label: 'À vérifier', count: stats.to_verify, activeColor: 'border-primary text-primary' },
                { id: 'ready', label: 'Prêts à importer', count: stats.ready, activeColor: 'border-emerald-600 text-emerald-600' },
                { id: 'imported', label: 'Importés', count: stats.imported, activeColor: 'border-blue-600 text-blue-600' },
                { id: 'ignored', label: 'Ignorés / Faux-positifs', count: stats.ignored, activeColor: 'border-slate-500 text-slate-500' }
              ] as { id: ValidationStatus; label: string; count: number; activeColor: string }[]).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedValidationIds([]);
                    setExpandedValidationId(null);
                  }}
                  className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? tab.activeColor
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <Badge variant="secondary" className="px-1 py-0.5 text-[9px] font-mono shrink-0">
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Bulk actions block */}
            {selectedValidationIds.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/40 mt-3 animate-in slide-in-from-top-1">
                <span className="text-[10px] font-mono text-muted-foreground pl-1">{selectedValidationIds.length} sélectionné(s) :</span>
                {activeTab === 'to_verify' && (
                  <>
                    <Button size="sm" onClick={handleBulkValidate} className="h-7 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"><Check className="w-3 h-3" />Valider</Button>
                    <Button size="sm" onClick={handleBulkIgnore} variant="outline" className="h-7 text-[10px] font-semibold border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 gap-1"><ThumbsDown className="w-3 h-3" />Ignorer</Button>
                  </>
                )}
                {activeTab === 'ready' && (
                  <>
                    <Button size="sm" onClick={handleBulkImport} className="h-7 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"><Plus className="w-3 h-3" />Importer dans le CRM</Button>
                    <Button size="sm" onClick={handleBulkIgnore} variant="outline" className="h-7 text-[10px] font-semibold border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 gap-1"><ThumbsDown className="w-3 h-3" />Ignorer</Button>
                  </>
                )}
                {activeTab === 'ignored' && (
                  <>
                    <Button size="sm" onClick={handleBulkRestore} className="h-7 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"><RefreshCw className="w-3 h-3" />Restaurer</Button>
                    <Button size="sm" onClick={handleBulkDelete} variant="destructive" className="h-7 text-[10px] font-semibold gap-1"><Trash2 className="w-3 h-3" />Supprimer</Button>
                  </>
                )}
                {activeTab === 'imported' && (
                  <Button size="sm" onClick={handleBulkDelete} variant="destructive" className="h-7 text-[10px] font-semibold gap-1"><Trash2 className="w-3 h-3" />Supprimer l'historique</Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {sortedValidations.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-muted rounded-full text-muted-foreground/60">
                  <Inbox className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Inbox vide</h4>
                  <p className="text-[10px] text-muted-foreground max-w-sm">Aucun prospect dans cet onglet. Utilisez le formulaire de recherche ci-dessus pour récolter et qualifier de nouvelles données.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center pl-4">
                      <Checkbox
                        checked={selectedValidationIds.length === sortedValidations.length && sortedValidations.length > 0}
                        onCheckedChange={c => setSelectedValidationIds(c ? sortedValidations.map(l => l.id) : [])}
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Établissement</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Niche / Ville</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Coordonnées</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Score Qualité</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedValidations.map(item => {
                    const isExpanded = expandedValidationId === item.id;
                    const isEditing = editingValidationId === item.id;
                    const duplicate = getDuplicate(item);
                    
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className={`hover:bg-muted/30 ${isExpanded ? 'bg-muted/10 border-b-transparent' : ''}`}>
                          <TableCell className="text-center pl-4">
                            <Checkbox
                              checked={selectedValidationIds.includes(item.id)}
                              onCheckedChange={c => setSelectedValidationIds(prev => c ? [...prev, item.id] : prev.filter(id => id !== item.id))}
                            />
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editFields.businessName}
                                onChange={e => setEditFields(prev => ({ ...prev, businessName: e.target.value }))}
                                className="h-7 text-xs font-semibold py-0"
                              />
                            ) : (
                              <div>
                                <div className="font-semibold text-xs text-foreground truncate max-w-[200px] flex items-center gap-1.5">
                                  {item.businessName}
                                  {duplicate && (
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[8px] font-extrabold flex items-center gap-0.5">
                                      <AlertTriangle className="w-2 h-2 shrink-0" />
                                      Doublon {duplicate.type === 'crm' ? 'CRM' : 'Inbox'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                                  <Badge variant="outline" className="text-[8px] font-mono uppercase px-1 py-0 scale-90 -translate-x-0.5">{item.source}</Badge>
                                  {item.rating > 0 ? `${item.rating}★ (${item.reviewsCount} avis)` : 'Pas d\'avis'}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground truncate max-w-[120px]">{item.niche}</div>
                            <div className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{item.city}</div>
                          </TableCell>
                          <TableCell className="text-xs space-y-0.5">
                            {isEditing ? (
                              <div className="space-y-1">
                                <Input placeholder="Téléphone" value={editFields.phone} onChange={e => setEditFields(prev => ({ ...prev, phone: e.target.value }))} className="h-6 text-[10px] py-0" />
                                <Input placeholder="Site Web" value={editFields.website} onChange={e => setEditFields(prev => ({ ...prev, website: e.target.value }))} className="h-6 text-[10px] py-0" />
                              </div>
                            ) : (
                              <>
                                {item.phone ? (
                                  <div className="flex items-center gap-1 text-[10px] text-foreground"><Phone className="h-3 w-3 text-muted-foreground shrink-0" />{item.phone}</div>
                                ) : (
                                  <div className="text-[9px] text-muted-foreground italic">Pas de téléphone</div>
                                )}
                                {item.website ? (
                                  <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 max-w-[140px] truncate">
                                    <Globe className="h-3 w-3 shrink-0" />
                                    {item.website.replace(/https?:\/\/(www\.)?/, '')}
                                  </a>
                                ) : (
                                  <div className="text-[9px] text-rose-500 font-semibold flex items-center gap-0.5">Aucun site web</div>
                                )}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-1.5 py-0.5 ${
                                  item.qualityScore >= 75
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : item.qualityScore >= 50
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {item.qualityScore} / 100
                              </Badge>
                              {item.opportunityScore >= 70 && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[8px] font-bold animate-pulse">
                                  Haut Potentiel
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={() => setEditingValidationId(null)}>Annuler</Button>
                                  <Button size="sm" className="h-7 text-[10px] px-2 bg-emerald-600 text-white" onClick={() => handleSaveEdit(item.id)}><Check className="w-3 h-3" /></Button>
                                </>
                              ) : (
                                <>
                                  {activeTab === 'to_verify' && (
                                    <Button size="sm" variant="outline" className="h-7 px-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200" onClick={() => handleValidateLead(item.id)}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {activeTab === 'ready' && (
                                    <Button size="sm" className="h-7 text-[10px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2" onClick={() => handleImportToCrm(item)}>
                                      <Plus className="h-3 w-3" /> CRM
                                    </Button>
                                  )}
                                  {(activeTab === 'to_verify' || activeTab === 'ready') && (
                                    <Button size="sm" variant="outline" className="h-7 px-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" onClick={() => handleIgnoreLead(item)}>
                                      <ThumbsDown className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleStartEdit(item)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`h-7 px-2 text-[10px] font-semibold ${isExpanded ? 'bg-muted' : ''}`}
                                    onClick={() => setExpandedValidationId(isExpanded ? null : item.id)}
                                  >
                                    Détails
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Detailed expansion card */}
                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-muted/10 border-b border-border/60">
                            <TableCell colSpan={6} className="p-4 pl-12 pr-4">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                
                                {/* Score Indicators (4 circular gauges) */}
                                <div className="md:col-span-4 space-y-3 border-r border-border/50 pr-4">
                                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-primary" />Métriques & Scoring</h5>
                                  <div className="grid grid-cols-2 gap-2">
                                    <ScoreGauge value={item.completenessScore} label="Complétude" color="stroke-emerald-500" />
                                    <ScoreGauge value={item.localFitScore} label="Alignement" color="stroke-sky-500" />
                                    <ScoreGauge value={item.opportunityScore} label="Opportunité" color="stroke-orange-500" />
                                    <ScoreGauge value={item.qualityScore} label="Qualité Globale" color="stroke-primary" />
                                  </div>
                                </div>

                                {/* SEO Audit & Duplicates check */}
                                <div className="md:col-span-5 space-y-3 border-r border-border/50 pr-4">
                                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-primary" />Opportunités Commerciales</h5>
                                  <div className="p-3 bg-muted/40 rounded-lg border border-border/40 text-[11px] text-muted-foreground space-y-2">
                                    <div className="flex items-start gap-1.5">
                                      <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-semibold text-foreground">Évaluation en ligne :</p>
                                        <p>{item.rating > 0 ? `${item.rating}/5 étoiles basées sur ${item.reviewsCount} avis.` : 'Aucune note disponible sur les profils publics.'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-1.5 border-t border-border/30 pt-2">
                                      <Globe className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-semibold text-foreground">Audit de présence web :</p>
                                        <p>{!item.website ? 'Aucun site web détecté dans la base OSM / Google Maps. Opportunité directe de création.' : `Site actif: ${item.website}`}</p>
                                      </div>
                                    </div>
                                    {item.address && (
                                      <div className="flex items-start gap-1.5 border-t border-border/30 pt-2">
                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="font-semibold text-foreground">Adresse complète :</p>
                                          <p className="font-mono text-[10px]">{item.address}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Merge duplicates section & metadata */}
                                <div className="md:col-span-3 space-y-3 flex flex-col justify-between">
                                  <div>
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><GitMerge className="w-3.5 h-3.5 text-primary" />Dédoublonnement</h5>
                                    {duplicate ? (
                                      <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/20 text-[10px] text-muted-foreground space-y-2 mt-1.5">
                                        <p className="leading-snug">
                                          Un prospect similaire a été détecté dans {duplicate.type === 'crm' ? 'votre CRM' : 'votre boîte de validation'}{' '}
                                          (<span className="font-semibold text-foreground">{duplicate.name}</span>).
                                        </p>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleMergeDuplicate(item, duplicate)}
                                          className="w-full h-7 text-[10px] font-bold gap-1 border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100"
                                        >
                                          <GitMerge className="w-3 h-3" />
                                          Fusionner les données
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground italic mt-2">Aucun doublon détecté pour ce prospect.</p>
                                    )}
                                  </div>

                                  <div>
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MapIcon className="w-3.5 h-3.5 text-primary" />Contribution OSM</h5>
                                    <div className="space-y-1.5 mt-1.5">
                                      {item.originalTags?.osm_id && item.originalTags?.osm_type ? (
                                        <a
                                          href={`https://www.openstreetmap.org/edit?editor=id&${item.originalTags.osm_type}=${item.originalTags.osm_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-full inline-flex items-center justify-center h-8 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold gap-1 transition-colors"
                                        >
                                          <Edit2 className="w-3 h-3 shrink-0" />
                                          Améliorer sur OSM (iD)
                                        </a>
                                      ) : item.latitude && item.longitude ? (
                                        <a
                                          href={`https://www.openstreetmap.org/note/new?lat=${item.latitude}&lon=${item.longitude}#map=17/${item.latitude}/${item.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-full inline-flex items-center justify-center h-8 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-700 text-[10px] font-bold gap-1 transition-colors"
                                        >
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                          Signaler fiche incomplète
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="text-[9px] text-muted-foreground font-mono space-y-0.5 text-right mt-auto">
                                    <p>Créé le: {new Date(item.createdAt).toLocaleString('fr-CA')}</p>
                                    {item.originalTags && Object.keys(item.originalTags).length > 0 && (
                                      <p className="text-[9px] text-primary truncate max-w-full">Tags: {Object.keys(item.originalTags).slice(0, 5).join(', ')}</p>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Map view section */}
        <Card className="border border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapIcon className="h-4 w-4 text-primary" />Carte des validation prospects ({filteredValidations.length} affichés)
              {selectedPopupLead && (
                <button type="button" onClick={() => setSelectedPopupLead(null)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" />Fermer popup
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredValidations.length > 0 ? (
              <div className="rounded-b-2xl overflow-hidden" style={{ height: 440 }}>
                <Map center={[-73.5674, 45.5019]} zoom={filteredValidations.some(l => l.latitude) ? 11 : 10} theme="light">
                  {filteredValidations.map(item => (
                    <MapMarker key={item.id}
                      longitude={item.longitude ?? -73.5674 + (Math.random() - 0.5) * 0.1}
                      latitude={item.latitude ?? 45.5019 + (Math.random() - 0.5) * 0.08}>
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
                        {selectedPopupLead.status === 'to_verify' && (
                          <div className="pt-2 flex gap-1">
                            <Button size="sm" className="h-6 text-[9px] bg-emerald-600 text-white font-bold" onClick={() => { handleValidateLead(selectedPopupLead.id); setSelectedPopupLead(null); }}>Valider</Button>
                            <Button size="sm" variant="outline" className="h-6 text-[9px] font-bold" onClick={() => { handleIgnoreLead(selectedPopupLead); setSelectedPopupLead(null); }}>Ignorer</Button>
                          </div>
                        )}
                      </div>
                    </MapPopup>
                  )}
                </Map>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Aucun prospect actif à positionner sur la carte.</div>
            )}
          </CardContent>
        </Card>

        {/* Import success success badge */}
        {importCount !== null && (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-4 flex items-center gap-3 animate-in fade-in">
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{importCount} prospect(s) importé(s) dans le CRM !</h4>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">Visibles dans l'onglet CRM principal.</p>
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
                  Historique de prospection ({jobHistory.length})
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {jobHistory.map(job => (
                    <div key={job.id} className="flex items-center gap-3 text-xs p-2 rounded-md border border-border/60 bg-muted/20">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${job.status === 'completed' ? 'bg-emerald-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-foreground">{job.niches.join(', ')}</p>
                        <p className="text-[10px] text-muted-foreground">{job.cities.join(', ')} · {job.sources.join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {job.status === 'completed' && <span className="text-emerald-600 font-bold">{job.resultsCount}</span>}
                        {job.status === 'failed' && <span className="text-red-500">Échec</span>}
                        {job.status === 'running' && <span className="text-amber-500">Scrape...</span>}
                        <p className="text-[8px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(job.startedAt).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
