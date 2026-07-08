import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reportAppError } from '@/lib/error-notifications';

// Matches the 120s budget declared in vercel.json for this route — was hardcoded to 55
// which silently truncated the Apify run (see APIFY_TIMEOUT_MS below) long before the
// scraper actor had time to produce results, making "0 leads" the default outcome.
export const maxDuration = 115;
export const dynamic = 'force-dynamic';

// The compass~crawler-google-places actor drives a headless browser and routinely
// needs 60-100s to crawl a handful of search terms. 42s (the old budget) was enough
// for a cold-start ping, never enough for real results.
const APIFY_TIMEOUT_MS = 90_000;
// Kept well under (maxDuration * 1000 - APIFY_TIMEOUT_MS) so the OSM fallback always
// has time to finish even in the worst case (Apify used its full budget and failed).
const OSM_MIRROR_TIMEOUT_MS = 15_000;

interface ApifyPlace {
  title?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  totalScore?: number;
  reviewsCount?: number;
  url?: string;
  location?: { lat?: number; lng?: number };
}

function buildSeoAuditApify(place: ApifyPlace): string {
  const issues: string[] = [];
  if (!place.website) issues.push('Aucun site web détecté');
  if ((place.totalScore ?? 5) < 3.5) issues.push(`Note très faible (${place.totalScore ?? 0}/5) — gestion de réputation urgente`);
  else if ((place.totalScore ?? 5) < 4.0) issues.push(`Note faible (${place.totalScore ?? 0}/5)`);
  if ((place.reviewsCount ?? 0) < 5) issues.push('Très peu d\'avis clients');
  else if ((place.reviewsCount ?? 0) < 15) issues.push('Peu d\'avis clients');
  return issues.length > 0 ? issues.join(' · ') : 'Profil local correct — proposer l\'automatisation Minerva';
}

// ── City coordinates (Québec) ─────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  montreal: [45.5019, -73.5674],
  'montreal-nord': [45.5906, -73.6304],
  laval: [45.6066, -73.7124],
  longueuil: [45.5312, -73.5183],
  brossard: [45.4496, -73.4650],
  'saint-hubert': [45.5023, -73.4175],
  boucherville: [45.5975, -73.4476],
  'saint-jean-sur-richelieu': [45.3072, -73.2619],
  'dollard-des-ormeaux': [45.4953, -73.8176],
  'saint-laurent': [45.5072, -73.6929],
  verdun: [45.4619, -73.5716],
  lasalle: [45.4258, -73.6358],
  lachine: [45.4253, -73.6924],
  'cote-saint-luc': [45.4739, -73.6631],
  westmount: [45.4836, -73.5992],
  outremont: [45.5183, -73.6028],
  'pointe-claire': [45.4542, -73.8276],
  kirkland: [45.4534, -73.8769],
  beaconsfield: [45.4318, -73.8686],
  terrebonne: [45.7000, -73.6334],
  repentigny: [45.7423, -73.4513],
  blainville: [45.6712, -73.8826],
  mirabel: [45.6535, -74.0892],
  'saint-eustache': [45.5615, -73.9036],
  'saint-jerome': [45.7805, -74.0034],
  gatineau: [45.4765, -75.7013],
  quebec: [46.8139, -71.2080],
  levis: [46.8033, -71.1778],
  sherbrooke: [45.4042, -71.8929],
  saguenay: [48.4279, -71.0686],
  'trois-rivieres': [46.3432, -72.5429],
  'rouyn-noranda': [48.2329, -79.0168],
  'val-dor': [48.0966, -77.7980],
  granby: [45.4042, -72.7340],
  drummondville: [45.8835, -72.4831],
  'saint-hyacinthe': [45.6295, -72.9503],
  rimouski: [48.4500, -68.5300],
};
const DEFAULT_COORDS: [number, number] = [45.5019, -73.5674]; // Montréal

// ── OSM tag mapping per niche ─────────────────────────────────────────────────

function getNicheTags(niche: string): string[] {
  const n = niche.toLowerCase().replace(/[^\x00-\x7F]/g, (c) => {
    const map: Record<string, string> = {
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'à': 'a', 'â': 'a', 'ä': 'a', 'ç': 'c',
      'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o',
      'ù': 'u', 'û': 'u', 'ü': 'u',
    };
    return map[c] ?? c;
  });

  if (/restaurant|bistro|brasserie/.test(n)) return ['"amenity"="restaurant"', '"amenity"="bistro"'];
  if (/cafe|coffee|caffe/.test(n)) return ['"amenity"="cafe"'];
  if (/fast.food|pizza|burger|poutine/.test(n)) return ['"amenity"="fast_food"'];
  if (/bar|pub|lounge|taverne/.test(n)) return ['"amenity"="bar"', '"amenity"="pub"'];
  if (/boulangerie|patisserie|bakery|pastry/.test(n)) return ['"shop"="bakery"', '"shop"="pastry"'];
  if (/coiffure|coiffeur|barber|barbier/.test(n)) return ['"shop"="hairdresser"', '"shop"="barber"'];
  if (/esthe|spa|beaute|beauty|ongles|massage/.test(n)) return ['"shop"="beauty"', '"leisure"="spa"'];
  if (/tatou|tattoo|piercing/.test(n)) return ['"shop"="tattoo"'];
  if (/dentaire|dentiste|dental/.test(n)) return ['"amenity"="dentist"'];
  if (/pharmacie|pharmacy/.test(n)) return ['"amenity"="pharmacy"'];
  if (/medecin|clinique|sante|hopital|medical|clinic/.test(n)) return ['"amenity"="clinic"', '"amenity"="doctors"'];
  if (/optique|opticien|vision|lunette/.test(n)) return ['"shop"="optician"', '"healthcare"="optometrist"'];
  if (/physio|chiro|kine|osteo|rehab/.test(n)) return ['"healthcare"="physiotherapist"', '"healthcare"="chiropractor"'];
  if (/vet|veterinaire|animal|pet/.test(n)) return ['"amenity"="veterinary"', '"shop"="pet"'];
  if (/plombier|plomberie|plomb/.test(n)) return ['"craft"="plumber"'];
  if (/electricien|electricite|electrique/.test(n)) return ['"craft"="electrician"'];
  if (/peintre|peinture/.test(n)) return ['"craft"="painter"'];
  if (/menuisier|menuiserie|charpente/.test(n)) return ['"craft"="carpenter"'];
  if (/couvreur|toiture|toit/.test(n)) return ['"craft"="roofer"'];
  if (/garage|auto|mecano|carrosserie|mecanique/.test(n)) return ['"shop"="car_repair"', '"craft"="car_repair"'];
  if (/avocat|lawyer|juridique/.test(n)) return ['"office"="lawyer"'];
  if (/notaire/.test(n)) return ['"office"="notary"'];
  if (/comptable|fiscal|impots|cpa/.test(n)) return ['"office"="accountant"'];
  if (/assurance|insurance/.test(n)) return ['"office"="insurance"'];
  if (/immobil|real.estate|courtier/.test(n)) return ['"office"="estate_agent"'];
  if (/gym|fitness|muscu|crossfit/.test(n)) return ['"leisure"="fitness_centre"', '"leisure"="gym"'];
  if (/yoga|pilates|danse|dance/.test(n)) return ['"leisure"="dance"', '"sport"="yoga"'];
  if (/epicerie|grocery|supermarche/.test(n)) return ['"shop"="supermarket"', '"shop"="convenience"'];
  if (/boucher|boucherie/.test(n)) return ['"shop"="butcher"'];
  if (/fleur|florist/.test(n)) return ['"shop"="florist"'];
  if (/garderie|cpe|childcare|daycare/.test(n)) return ['"amenity"="kindergarten"', '"amenity"="childcare"'];
  if (/serrurier|locksmith/.test(n)) return ['"craft"="locksmith"'];
  if (/informatique|ordinateur|computer|it/.test(n)) return ['"shop"="computer"', '"office"="it"'];
  if (/photo|photographie/.test(n)) return ['"shop"="photographer"'];
  if (/nettoyage|menage|cleaning/.test(n)) return ['"craft"="cleaning"'];
  if (/conduite|auto.ecole|driving/.test(n)) return ['"amenity"="driving_school"'];

  // Generic business fallback
  return ['"office"~"."', '"shop"~"."', '"craft"~"."', '"amenity"~"restaurant|cafe|shop"'];
}

// ── Overpass query builder ────────────────────────────────────────────────────

function buildOverpassQuery(tags: string[], lat: number, lon: number, radius: number, limit: number): string {
  const filters = tags.map(t => `node[${t}](around:${radius},${lat},${lon});`).join('\n  ');
  return `[out:json][timeout:25][maxsize:8388608];
(
  ${filters}
);
out ${limit};`;
}

// ── OSM element → lead ────────────────────────────────────────────────────────

interface OsmElement {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

function osmToLead(el: OsmElement, niche: string, city: string) {
  const tags = el.tags ?? {};
  const name = tags.name ?? tags['name:fr'] ?? '';
  if (!name) return null;

  const phone = tags.phone ?? tags['contact:phone'] ?? tags['phone:fr'] ?? '';
  const email = tags.email ?? tags['contact:email'] ?? '';
  const website = tags.website ?? tags['contact:website'] ?? tags['url'] ?? '';
  const street = tags['addr:street'] ?? '';
  const housenumber = tags['addr:housenumber'] ?? '';
  const postcode = tags['addr:postcode'] ?? '';
  const address = [housenumber, street, postcode, city].filter(Boolean).join(' ');

  const hasPhone = phone.length > 3;
  const hasWebsite = website.length > 4;
  const hasAddress = address.length > 3;
  const completenessScore = Math.round((hasPhone ? 33 : 0) + (hasWebsite ? 33 : 0) + (hasAddress ? 34 : 0));
  const qualityScore = Math.round(completenessScore * 0.6 + 40);

  return {
    id: `osm-${el.id}`,
    businessName: name,
    niche,
    city,
    phone,
    email,
    website,
    address,
    rating: 0,
    reviewsCount: 0,
    mapsUrl: `https://www.openstreetmap.org/node/${el.id}`,
    source: 'osm',
    latitude: el.lat,
    longitude: el.lon,
    qualityScore,
    completenessScore,
    localFitScore: 85,
    opportunityScore: completenessScore < 50 ? 90 : 70,
    distanceKm: 0,
    originalTags: tags,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Fetch settings for Apify token
    const { data: settings } = await supabase
      .from('settings')
      .select('apify_token')
      .eq('user_id', user.id)
      .maybeSingle();

    const apifyToken = (settings as any)?.apify_token;
    const hasApify = apifyToken && apifyToken !== 'native' && apifyToken.trim().length > 5;

    const body = await req.json();

    const niches: string[] = (Array.isArray(body.niches) && body.niches.length > 0)
      ? body.niches : body.niche ? [body.niche] : ['commerce local'];
    const cities: string[] = (Array.isArray(body.cities) && body.cities.length > 0)
      ? body.cities : body.city ? [body.city] : ['Montréal'];
    const maxResults = Math.min(Math.max(Number(body.maxResults ?? body.limit) || 50, 5), 200);
    const radius = Math.min(Math.max(Number(body.radius) || 10000, 2000), 40000);

    // Resolve coordinates
    let lat: number, lon: number;
    const uLat = typeof body.userLat === 'number' && isFinite(body.userLat) ? body.userLat : null;
    const uLon = typeof body.userLon === 'number' && isFinite(body.userLon) ? body.userLon : null;
    if (uLat !== null && uLon !== null) {
      lat = uLat; lon = uLon;
    } else {
      const key = cities[0].toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\x00-\x7F]/g, (c) => {
          const m: Record<string, string> = {
            'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a',
            'â': 'a', 'ç': 'c', 'î': 'i', 'ô': 'o',
            'ù': 'u', 'û': 'u',
          };
          return m[c] ?? c;
        });
      [lat, lon] = CITY_COORDS[key] ?? CITY_COORDS[cities[0].toLowerCase().trim().replace(/\s+/g, '-')] ?? DEFAULT_COORDS;
    }

    const searchCenter = { lat, lon, label: cities[0] };
    let apifyErrorMsg: string | null = null;

    if (hasApify) {
      try {
        const searchTerms: string[] = cities.flatMap(city =>
          niches.map(niche => body.query || `${niche} ${city}`)
        ).slice(0, 10);

        const perSearch = Math.ceil(maxResults / searchTerms.length);

        const apifyRes = await fetch(
          // memory=1024 était trop bas pour cet acteur : il pilote un Chromium headless
          // par recherche et se fait tuer par manque de mémoire (OOM) bien avant la fin
          // du run, ce qui remonte comme une erreur générique "run-failed / Actor run did
          // not succeed" sans aucun autre détail exploitable. 4096 MB est la mémoire par
          // défaut recommandée par Apify pour compass~crawler-google-places.
          `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyToken}&timeout=${Math.floor(APIFY_TIMEOUT_MS / 1000) - 5}&memory=4096`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchTerms,
              searchStringsArray: searchTerms,
              maxCrawledPlacesPerSearch: Math.max(perSearch, 10),
              language: 'fr',
              countryCode: 'ca',
              scrapeWebsite: false,
            }),
            signal: AbortSignal.timeout(APIFY_TIMEOUT_MS),
          }
        );

        const rawText = await apifyRes.text();

        if (apifyRes.status === 401 || apifyRes.status === 403) {
          throw new Error(`Clé Apify invalide ou expirée (HTTP ${apifyRes.status})`);
        }
        if (apifyRes.status === 429) {
          throw new Error('Quota Apify dépassé (HTTP 429) — vérifiez votre plan/crédit Apify');
        }
        if (!apifyRes.ok) {
          let detail = rawText.slice(0, 300);
          try {
            const parsed = JSON.parse(rawText);
            if (parsed?.error?.type === 'run-failed') {
              detail = 'Le run Apify a planté en cours d\'exécution (souvent un manque de mémoire allouée à l\'acteur, ou un blocage anti-bot Google Maps) — pas un problème de clé API.';
            } else if (parsed?.error?.message) {
              detail = parsed.error.message;
            }
          } catch { /* rawText wasn't JSON, keep the raw slice */ }
          throw new Error(`Apify server responded with HTTP ${apifyRes.status}: ${detail}`);
        }

        if (rawText.trimStart().startsWith('<')) {
          throw new Error('Apify API key is invalid or returned HTML (e.g. captcha or auth error)');
        }

        const places: ApifyPlace[] = JSON.parse(rawText);
        
        // Deduplicate
        const seen = new Set<string>();
        const leads = places
          .filter(p => p.title)
          .filter(p => {
            const key = `${(p.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${(p.city ?? '').toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, maxResults)
          .map((p, i) => {
            const phone = p.phone ?? '';
            const website = p.website ?? '';
            const completenessScore = Math.round((phone ? 33 : 0) + (website ? 33 : 0) + (p.address ? 34 : 0));
            const qualityScore = Math.round(completenessScore * 0.6 + 40);
            return {
              id: `apify-${i}-${Date.now()}`,
              businessName: p.title ?? 'Inconnu',
              niche: p.categoryName ?? (niches[0] ?? 'Commerce local'),
              city: p.city ?? cities[0],
              phone,
              email: p.email ?? '',
              website,
              address: p.address ?? '',
              rating: p.totalScore ?? 0,
              reviewsCount: p.reviewsCount ?? 0,
              mapsUrl: p.url ?? '',
              seoAudit: buildSeoAuditApify(p),
              source: 'apify',
              latitude: p.location?.lat,
              longitude: p.location?.lng,
              qualityScore,
              completenessScore,
              localFitScore: 85,
              opportunityScore: completenessScore < 50 ? 90 : 70,
              distanceKm: 0,
            };
          });

        if (leads.length > 0) {
          return NextResponse.json({
            leads,
            provider: 'apify',
            searchCenter,
            message: `${leads.length} établissements trouvés via Apify (Google Maps Premium)`,
          });
        }
      } catch (err: any) {
        apifyErrorMsg = err?.message || String(err);
        console.error('[prospect/search] Apify failed, falling back to OSM:', apifyErrorMsg);
      }
    }

    // OSM Fallback
    const tags = getNicheTags(niches[0] ?? 'commerce local');
    const query = buildOverpassQuery(tags, lat, lon, radius, Math.ceil(maxResults * 1.5));

    const MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    // Race all mirrors instead of trying them one at a time — a single slow/blocked
    // mirror (overpass-api.de frequently rate-limits datacenter IPs like Vercel's)
    // used to burn its full 20s timeout before the next mirror even started, which on
    // its own could exceed the old 55s function budget and made "no results from OSM
    // either" the common case. A mirror that responds 200 with zero elements is treated
    // as a failure too, so a slower-but-actually-populated mirror can still win.
    const osmMirrorErrors: string[] = [];
    const fetchMirror = async (mirror: string): Promise<OsmElement[]> => {
      const res = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(OSM_MIRROR_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`${mirror}: HTTP ${res.status}`);
      const json = await res.json();
      const els: OsmElement[] = json.elements ?? [];
      if (els.length === 0) throw new Error(`${mirror}: 0 éléments`);
      return els;
    };

    let elements: OsmElement[] = [];
    try {
      elements = await Promise.any(
        MIRRORS.map(m => fetchMirror(m).catch(e => { osmMirrorErrors.push(String(e?.message ?? e)); throw e; }))
      );
    } catch {
      elements = [];
    }

    const leads = elements
      .map(el => osmToLead(el, niches[0], cities[0]))
      .filter(Boolean)
      .slice(0, maxResults);

    // Both providers failed to produce anything — this is exactly the "aucun client
    // trouvé" scenario reported by users despite a "connected" API key. Surface it as
    // an actionable notification instead of a silent empty list.
    if (leads.length === 0) {
      await reportAppError({
        userId: user.id,
        source: 'prospect/search',
        title: 'Prospection : aucun résultat trouvé',
        message: apifyErrorMsg
          ? `Apify a échoué (${apifyErrorMsg}) et le secours OpenStreetMap n'a rien trouvé non plus.`
          : `Aucun résultat via ${hasApify ? 'Apify ni' : ''} OpenStreetMap pour "${niches[0]}" à "${cities[0]}".`,
        context: {
          niches, cities, radius, maxResults, hasApify,
          apifyError: apifyErrorMsg,
          osmMirrorErrors,
          searchCenter,
        },
      });
    }

    return NextResponse.json({
      leads,
      provider: 'osm',
      searchCenter,
      apifyError: apifyErrorMsg,
      message: apifyErrorMsg
        ? `Échec Apify (${apifyErrorMsg.slice(0, 50)}). ${leads.length} leads trouvés via OpenStreetMap (secours).`
        : `${leads.length} établissements trouvés via OpenStreetMap`,
    });
  } catch (err: any) {
    console.error('[prospect/search]', err);
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await reportAppError({
        userId: user?.id,
        source: 'prospect/search',
        title: 'Erreur de prospection',
        message: err?.message ?? 'Erreur interne',
        stack: err?.stack,
      });
    } catch { /* never let error reporting mask the original failure */ }
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
