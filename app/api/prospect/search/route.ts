import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 55;
export const dynamic = 'force-dynamic';

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
    const tags = getNicheTags(niches[0] ?? 'commerce local');
    const query = buildOverpassQuery(tags, lat, lon, radius, Math.ceil(maxResults * 1.5));

    const MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    let elements: OsmElement[] = [];
    for (const mirror of MIRRORS) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) continue;
        const json = await res.json();
        elements = json.elements ?? [];
        if (elements.length > 0) break;
      } catch { continue; }
    }

    const leads = elements
      .map(el => osmToLead(el, niches[0], cities[0]))
      .filter(Boolean)
      .slice(0, maxResults);

    return NextResponse.json({
      leads,
      provider: 'osm',
      searchCenter,
      message: leads.length > 0
        ? `${leads.length} établissements trouvés via OpenStreetMap`
        : 'Aucun résultat OSM — essayez une autre niche ou ville',
    });
  } catch (err: any) {
    console.error('[prospect/search]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
