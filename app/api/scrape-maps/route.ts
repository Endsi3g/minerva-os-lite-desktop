import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ScrapedLead {
  id: string;
  businessName: string;
  niche: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  address?: string;
  rating: number;
  reviewsCount: number;
  mapsUrl: string;
  seoAudit: string;
  source?: string;
  latitude?: number;
  longitude?: number;
}

// Extended Quebec city coordinates
const QUEBEC_CITY_COORDS: Record<string, [number, number]> = {
  'montreal': [45.5019, -73.5674],
  'montréal': [45.5019, -73.5674],
  'montreal-nord': [45.5906, -73.6304],
  'montréal-nord': [45.5906, -73.6304],
  'saint-leonard': [45.5842, -73.5730],
  'saint-léonard': [45.5842, -73.5730],
  'anjou': [45.6072, -73.5619],
  'rosemont': [45.5454, -73.5881],
  'hochelaga': [45.5365, -73.5435],
  'plateau': [45.5236, -73.5819],
  'verdun': [45.4619, -73.5716],
  'lasalle': [45.4258, -73.6358],
  'lachine': [45.4253, -73.6924],
  'cote-saint-luc': [45.4739, -73.6631],
  'côte-saint-luc': [45.4739, -73.6631],
  'outremont': [45.5183, -73.6028],
  'westmount': [45.4836, -73.5992],
  'ndg': [45.4773, -73.6295],
  'saint-laurent': [45.5072, -73.6929],
  'dorval': [45.4479, -73.7521],
  'pointe-claire': [45.4542, -73.8276],
  'kirkland': [45.4534, -73.8769],
  'beaconsfield': [45.4318, -73.8686],
  'dollard-des-ormeaux': [45.4953, -73.8176],
  'dollard': [45.4953, -73.8176],
  'pierrefonds': [45.4920, -73.8649],
  'saint-jean-sur-richelieu': [45.3072, -73.2619],
  'saint-jean': [45.3072, -73.2619],
  'brossard': [45.4496, -73.4650],
  'saint-hubert': [45.5023, -73.4175],
  'greenfield-park': [45.4824, -73.4630],
  'boucherville': [45.5975, -73.4476],
  'varennes': [45.6877, -73.4340],
  'sainte-julie': [45.5916, -73.3373],
  'beloeil': [45.5672, -73.2020],
  'saint-hyacinthe': [45.6295, -72.9503],
  'granby': [45.4042, -72.7340],
  'drummondville': [45.8835, -72.4831],
  'saint-jerome': [45.7805, -74.0034],
  'saint-jérôme': [45.7805, -74.0034],
  'blainville': [45.6712, -73.8826],
  'mirabel': [45.6535, -74.0892],
  'saint-eustache': [45.5615, -73.9036],
  'deux-montagnes': [45.5348, -73.8923],
  'boisbriand': [45.6243, -73.8422],
  'repentigny': [45.7423, -73.4513],
  'terrebonne': [45.7000, -73.6334],
  'mascouche': [45.7504, -73.6010],
  'joliette': [46.0179, -73.4486],
  'sorel-tracy': [46.0355, -73.1072],
  'sorel': [46.0355, -73.1072],
  'sherbrooke': [45.4042, -71.8929],
  'magog': [45.2640, -72.1430],
  'coaticook': [45.1380, -71.8043],
  'saguenay': [48.4279, -71.0686],
  'chicoutimi': [48.4279, -71.0686],
  'jonquiere': [48.4197, -71.2485],
  'jonquière': [48.4197, -71.2485],
  'alma': [48.5499, -71.6536],
  'quebec': [46.8139, -71.2080],
  'québec': [46.8139, -71.2080],
  'sainte-foy': [46.7780, -71.2839],
  'charlesbourg': [46.8735, -71.2701],
  'beauport': [46.8708, -71.1867],
  'levis': [46.8033, -71.1778],
  'lévis': [46.8033, -71.1778],
  'saint-romuald': [46.7580, -71.2391],
  'laval': [45.6066, -73.7124],
  'chomedey': [45.5527, -73.7544],
  'vimont': [45.6461, -73.6819],
  'gatineau': [45.4765, -75.7013],
  'hull': [45.4257, -75.7169],
  'aylmer': [45.3902, -75.8412],
  'longueuil': [45.5312, -73.5183],
  'saint-lambert': [45.5023, -73.5011],
  'trois-rivieres': [46.3432, -72.5429],
  'trois-rivières': [46.3432, -72.5429],
  'shawinigan': [46.5725, -72.7499],
  'victoriaville': [46.0531, -71.9660],
  'rimouski': [48.4500, -68.5300],
  'baie-comeau': [49.2134, -68.1504],
  'sept-iles': [50.2141, -66.3765],
  'sept-îles': [50.2141, -66.3765],
  'rouyn-noranda': [48.2329, -79.0168],
  'val-dor': [48.0966, -77.7980],
  'val-d\'or': [48.0966, -77.7980],
  'amos': [48.5675, -78.1196],
  'mont-tremblant': [46.1179, -74.5963],
  'saint-sauveur': [45.9007, -74.1680],
  'bonaventure': [48.0504, -65.4884],
  'riviere-du-loup': [47.8271, -69.5359],
  'rivière-du-loup': [47.8271, -69.5359],
  'thetford-mines': [46.1010, -71.3038],
};

const DEFAULT_COORDS: [number, number] = [46.8, -72.5];

function getCityCoords(city: string): { latitude: number; longitude: number } {
  const key = city.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
  const [lat, lng] = QUEBEC_CITY_COORDS[key] ?? QUEBEC_CITY_COORDS[city.toLowerCase().trim()] ?? DEFAULT_COORDS;
  const jitter = () => (Math.random() - 0.5) * 0.05;
  return { latitude: lat + jitter(), longitude: lng + jitter() };
}

function getNicheOsmFilters(niche: string): string[] {
  const n = niche.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (n.includes('restaurant') || n.includes('cafe') || n.includes('bistro') || n.includes('brasserie'))
    return ['"amenity"="restaurant"', '"amenity"="cafe"', '"amenity"="bistro"'];
  if (n.includes('fast') || n.includes('pizza') || n.includes('burger') || n.includes('poutine') || n.includes('sandwich'))
    return ['"amenity"="fast_food"'];
  if (n.includes('boulangerie') || n.includes('patisserie') || n.includes('pastry'))
    return ['"shop"="bakery"', '"shop"="pastry"'];
  if (n.includes('bar') || n.includes('lounge') || n.includes('pub') || n.includes('taverne'))
    return ['"amenity"="bar"', '"amenity"="pub"', '"amenity"="nightclub"'];
  if (n.includes('coiffure') || n.includes('coiffeur') || n.includes('salon') || n.includes('barber') || n.includes('barbier'))
    return ['"shop"="hairdresser"', '"shop"="barber"'];
  if (n.includes('esthe') || n.includes('spa') || n.includes('beaute') || n.includes('soins') || n.includes('ongles') || n.includes('massage'))
    return ['"shop"="beauty"', '"leisure"="spa"', '"shop"="massage"'];
  if (n.includes('tatou') || n.includes('perceur') || n.includes('tattoo') || n.includes('piercing'))
    return ['"shop"="tattoo"'];
  if (n.includes('dentaire') || n.includes('dentiste') || n.includes('dental'))
    return ['"amenity"="dentist"'];
  if (n.includes('pharmacie') || n.includes('pharmacy') || n.includes('druggist'))
    return ['"amenity"="pharmacy"'];
  if (n.includes('medecin') || n.includes('clinique') || n.includes('sante') || n.includes('hopital') || n.includes('medical'))
    return ['"amenity"="clinic"', '"amenity"="doctors"', '"healthcare"="clinic"', '"amenity"="hospital"'];
  if (n.includes('optique') || n.includes('opticien') || n.includes('vision') || n.includes('lunette'))
    return ['"shop"="optician"', '"healthcare"="optometrist"'];
  if (n.includes('physio') || n.includes('chiro') || n.includes('kine') || n.includes('osteo') || n.includes('rehab'))
    return ['"healthcare"="physiotherapist"', '"healthcare"="chiropractor"', '"healthcare"="rehabilitation"'];
  if (n.includes('psycho') || n.includes('therapie') || n.includes('psy'))
    return ['"healthcare"="psychologist"', '"healthcare"="therapist"'];
  if (n.includes('veterinaire') || n.includes('veto') || n.includes('animal') || n.includes('pet'))
    return ['"amenity"="veterinary"', '"shop"="pet"'];
  if (n.includes('plombier') || n.includes('plomberie'))
    return ['"craft"="plumber"'];
  if (n.includes('electricien') || n.includes('electricite') || n.includes('electrique'))
    return ['"craft"="electrician"'];
  if (n.includes('peintre') || n.includes('peinture'))
    return ['"craft"="painter"'];
  if (n.includes('menuisier') || n.includes('menuiserie') || n.includes('charpente'))
    return ['"craft"="carpenter"', '"craft"="joiner"'];
  if (n.includes('couvreur') || n.includes('toiture') || n.includes('toit'))
    return ['"craft"="roofer"'];
  if (n.includes('garage') || n.includes('auto') || n.includes('mecano') || n.includes('carrosserie') || n.includes('mecanique'))
    return ['"shop"="car_repair"', '"shop"="car_parts"', '"amenity"="car_wash"', '"craft"="car_repair"'];
  if (n.includes('pneu') || n.includes('tire') || n.includes('roue'))
    return ['"shop"="tyres"'];
  if (n.includes('moto') || n.includes('motocyclette'))
    return ['"shop"="motorcycle"', '"shop"="motorcycle_repair"'];
  if (n.includes('avocat') || n.includes('lawyer') || n.includes('barreau') || n.includes('juridique'))
    return ['"office"="lawyer"'];
  if (n.includes('notaire'))
    return ['"office"="notary"'];
  if (n.includes('comptable') || n.includes('fiscal') || n.includes('impots') || n.includes('cpa') || n.includes('fiduciaire'))
    return ['"office"="accountant"', '"office"="tax_advisor"'];
  if (n.includes('assurance') || n.includes('insurance'))
    return ['"office"="insurance"'];
  if (n.includes('architecte') || n.includes('architecture'))
    return ['"office"="architect"'];
  if (n.includes('immobil') || n.includes('real estate') || n.includes('courtier'))
    return ['"office"="estate_agent"'];
  if (n.includes('gym') || n.includes('fitness') || n.includes('muscu') || n.includes('crossfit'))
    return ['"leisure"="fitness_centre"', '"leisure"="gym"'];
  if (n.includes('yoga') || n.includes('pilates') || n.includes('studio') || n.includes('danse'))
    return ['"sport"="yoga"', '"leisure"="dance"', '"leisure"="sports_centre"'];
  if (n.includes('nettoyage') || n.includes('menage') || n.includes('cleaning') || n.includes('entretien'))
    return ['"shop"="cleaning"', '"craft"="cleaning"'];
  if (n.includes('photo') || n.includes('photographie'))
    return ['"shop"="photographer"'];
  if (n.includes('videaste') || n.includes('video') || n.includes('filmeur'))
    return ['"office"="videographer"'];
  if (n.includes('fleur') || n.includes('florist') || n.includes('fleuri'))
    return ['"shop"="florist"'];
  if (n.includes('demenag') || n.includes('transport') || n.includes('moving'))
    return ['"shop"="mover"', '"office"="moving_company"'];
  if (n.includes('conduite') || n.includes('auto-ecole') || n.includes('driving') || n.includes('permis'))
    return ['"amenity"="driving_school"'];
  if (n.includes('garderie') || n.includes('cpe') || n.includes('childcare') || n.includes('daycare') || n.includes('enfant'))
    return ['"amenity"="kindergarten"', '"amenity"="childcare"'];
  if (n.includes('serrurier') || n.includes('locksmith'))
    return ['"craft"="locksmith"', '"shop"="locksmith"'];
  if (n.includes('traiteur') || n.includes('evenement') || n.includes('catering') || n.includes('banquet'))
    return ['"amenity"="restaurant"', '"shop"="deli"', '"amenity"="events_venue"'];
  if (n.includes('boucher') || n.includes('boucherie') || n.includes('charcuterie'))
    return ['"shop"="butcher"', '"shop"="deli"'];
  if (n.includes('epicerie') || n.includes('alimentation') || n.includes('grocery') || n.includes('supermarche'))
    return ['"shop"="supermarket"', '"shop"="convenience"', '"shop"="grocery"'];
  if (n.includes('informatique') || n.includes('ordinateur') || n.includes('computer') || n.includes('it'))
    return ['"shop"="computer"', '"office"="it"'];
  if (n.includes('imprimerie') || n.includes('print') || n.includes('enseigne'))
    return ['"shop"="printing"'];
  if (n.includes('agence web') || n.includes('site web') || n.includes('marketing') || n.includes('communication'))
    return ['"office"="marketing"', '"office"="advertising"', '"office"="web_design"'];
  if (n.includes('hotel') || n.includes('motel') || n.includes('hebergement') || n.includes('auberge'))
    return ['"tourism"="hotel"', '"tourism"="motel"', '"tourism"="hostel"', '"tourism"="guest_house"'];
  if (n.includes('librairie') || n.includes('livre') || n.includes('book'))
    return ['"shop"="books"'];
  if (n.includes('bijoux') || n.includes('bijouterie') || n.includes('jewel'))
    return ['"shop"="jewelry"'];
  if (n.includes('lunetterie') || n.includes('optique') || n.includes('optical'))
    return ['"shop"="optician"'];
  if (n.includes('teinturerie') || n.includes('laverie') || n.includes('laundry') || n.includes('pressing'))
    return ['"shop"="laundry"', '"shop"="dry_cleaning"'];
  if (n.includes('ecole') || n.includes('cours') || n.includes('tuteur') || n.includes('formation'))
    return ['"amenity"="school"', '"amenity"="college"', '"office"="tutoring"'];
  if (n.includes('piscine') || n.includes('natation') || n.includes('swimming'))
    return ['"leisure"="swimming_pool"', '"leisure"="water_park"'];
  if (n.includes('salle') || n.includes('evenement') || n.includes('venue'))
    return ['"amenity"="events_venue"', '"leisure"="banquet_hall"'];
  if (n.includes('taxi') || n.includes('transport') || n.includes('limousine'))
    return ['"amenity"="taxi"'];

  return ['"amenity"~"restaurant|cafe|bar|shop|office|clinic|pharmacy|school"'];
}

function buildOverpassQuery(filters: string[], lat: number, lon: number, radius: number, limit: number): string {
  const parts: string[] = [];
  for (const f of filters) {
    parts.push(`node[${f}](around:${radius},${lat},${lon});`);
    parts.push(`way[${f}](around:${radius},${lat},${lon});`);
  }
  return `[out:json][timeout:30];(${parts.join('')});out center tags ${limit};`;
}

function cleanPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1 ${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw.trim();
}

function generateSeoAudit(website: string, rating: number): string {
  if (!website) return 'Aucun site web détecté. Opportunité directe de création / refonte.';
  if (!website.startsWith('https')) return `Site présent (${website}) sans HTTPS. Opportunité SEO + sécurité.`;
  if (rating === 0) return 'Site HTTPS actif. Note non disponible — vérifier sur Google Maps.';
  if (rating < 3.5) return `Note ${rating}/5 très faible. Gestion de réputation urgente recommandée.`;
  if (rating < 4.0) return `Note ${rating}/5 — campagne de récolte d'avis Google recommandée.`;
  if (rating < 4.5) return `Site HTTPS actif. Note de ${rating}/5 améliorable. Proposer l'automatisation Minerva.`;
  return `Site HTTPS actif et excellente note (${rating}/5). Idéal pour un contrat d'onboarding récurrent.`;
}

// Run a single Overpass query and return parsed leads
async function runOverpassQuery(filters: string[], lat: number, lon: number, radius: number, limit: number, niche: string, cityFallback: string): Promise<ScrapedLead[]> {
  const query = buildOverpassQuery(filters, lat, lon, radius, limit);
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ];

  let elements: any[] = [];
  for (const url of mirrors) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      elements = json.elements ?? [];
      if (elements.length > 0) break;
    } catch { continue; }
  }

  const cleanNiche = niche.split(' / ')[0].trim();
  const leads: ScrapedLead[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags['name:fr'] ?? tags['name:en'] ?? '';
    if (!name || name.length < 2) continue;

    const elLat: number | undefined = el.type === 'way' ? el.center?.lat : el.lat;
    const elLon: number | undefined = el.type === 'way' ? el.center?.lon : el.lon;
    if (!elLat || !elLon) continue;

    const phone = cleanPhone(tags.phone ?? tags['contact:phone'] ?? tags['phone:mobile'] ?? tags['contact:mobile'] ?? '');
    const website = tags.website ?? tags['contact:website'] ?? tags['contact:url'] ?? tags.url ?? '';
    const email = tags.email ?? tags['contact:email'] ?? '';
    const houseNum = tags['addr:housenumber'] ?? '';
    const street = tags['addr:street'] ?? '';
    const cityTag = tags['addr:city'] ?? tags['addr:place'] ?? '';
    const address = [houseNum, street, cityTag || cityFallback].filter(Boolean).join(' ');
    const openingHours = tags['opening_hours'] ?? '';

    const hasWebsite = !!website;
    const rating = 0;
    const reviewsCount = 0;

    const cuisine = tags.cuisine ? ` (${tags.cuisine.split(';')[0].trim()})` : '';
    const businessName = `${name}${cuisine}`;

    leads.push({
      id: crypto.randomUUID(),
      businessName,
      niche: cleanNiche,
      city: cityTag || cityFallback,
      phone,
      email,
      website,
      address,
      rating,
      reviewsCount,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`,
      seoAudit: generateSeoAudit(website, rating),
      source: 'osm',
      latitude: elLat,
      longitude: elLon,
    });
  }

  return leads;
}

// Multi-niche, multi-city Overpass scraper
async function runOverpassScraper(niches: string[], cities: string[], maxResults: number, radius: number): Promise<ScrapedLead[]> {
  const allLeads: ScrapedLead[] = [];

  const perNichePerCity = Math.max(Math.floor(maxResults / (niches.length * cities.length)), 10);

  const tasks: Promise<ScrapedLead[]>[] = [];
  for (const city of cities) {
    const key = city.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
    const [lat, lon] = QUEBEC_CITY_COORDS[key] ?? QUEBEC_CITY_COORDS[city.toLowerCase().trim()] ?? DEFAULT_COORDS;
    const r = ['montreal', 'montréal', 'laval'].includes(key) ? Math.max(radius, 12000) : radius;

    for (const niche of niches) {
      const filters = getNicheOsmFilters(niche);
      const fetchLimit = Math.min(perNichePerCity * 4, 400);
      tasks.push(runOverpassQuery(filters, lat, lon, r, fetchLimit, niche, city));
    }
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === 'fulfilled') allLeads.push(...r.value);
  }

  return allLeads;
}

// DDG-based directory scraper (Yelp, PagesJaunes, 411)
async function scrapeDirectoryFromDDG(niche: string, city: string, source: 'yelp' | 'pagesjaunes' | '411'): Promise<ScrapedLead[]> {
  let query: string;
  if (source === 'yelp') {
    query = `site:yelp.ca/biz/ "${niche}" "${city}"`;
  } else if (source === 'pagesjaunes') {
    query = `site:pagesjaunes.ca OR site:yellowpages.ca "${niche}" "${city}"`;
  } else {
    query = `site:411.ca "${niche}" "${city}"`;
  }

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const blocks = html.split('<div class="result__body">');
    if (blocks.length <= 1) return [];

    const leads: ScrapedLead[] = [];
    const cleanNiche = niche.split(' / ')[0];

    for (let j = 1; j < Math.min(blocks.length, 8); j++) {
      const block = blocks[j].split('</div>')[0];
      const uddgMatch = block.match(/uddg=([^"&'\s>]+)/);
      if (!uddgMatch) continue;
      const url = decodeURIComponent(uddgMatch[1]);

      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      if (!titleMatch) continue;
      let businessName = titleMatch[1].replace(/<[^>]*>/g, '').trim();

      if (source === 'yelp') businessName = businessName.split(' - ')[0].split(' | ')[0].trim();
      else businessName = businessName.split(',')[0].split(' - ')[0].split(' | ')[0].trim();
      businessName = businessName.replace(/\s*(?:Yelp|PagesJaunes|Pages Jaunes|YellowPages|411\.ca)\s*$/gi, '').trim();
      if (!businessName || businessName.length < 2) continue;

      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';

      const phoneRegex = /(?:\+?1[-. ]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})/;
      const phoneMatch = snippet.match(phoneRegex);
      const phone = phoneMatch ? cleanPhone(phoneMatch[0]) : '';

      const ratingMatch = snippet.match(/([0-9][.,][0-9])\s*(?:\/5|étoiles?|stars?|★)/i);
      const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 0;

      const reviewsMatch = snippet.match(/([0-9]+)\s*(?:avis|commentaires|reviews)/i);
      const reviewsCount = reviewsMatch ? parseInt(reviewsMatch[1]) : 0;

      leads.push({
        id: crypto.randomUUID(),
        businessName,
        niche: cleanNiche,
        city,
        phone,
        email: '',
        website: '',
        rating,
        reviewsCount,
        mapsUrl: url,
        seoAudit: `Fiche ${source === 'yelp' ? 'Yelp' : source === 'pagesjaunes' ? 'PagesJaunes' : '411.ca'} active. Aucun site internet direct référencé.`,
        source,
        ...getCityCoords(city),
      });
    }

    return leads;
  } catch { return []; }
}


function dedup(leads: ScrapedLead[]): ScrapedLead[] {
  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();
  return leads.filter(l => {
    if (!l.businessName) return false;
    const nameKey = `${l.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}|${l.city.toLowerCase()}`;
    const phoneKey = l.phone ? l.phone.replace(/\D/g, '') : null;
    if (seenNames.has(nameKey)) return false;
    if (phoneKey && phoneKey.length >= 9 && seenPhones.has(phoneKey)) return false;
    seenNames.add(nameKey);
    if (phoneKey && phoneKey.length >= 9) seenPhones.add(phoneKey);
    return true;
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    // Support both legacy `niche` (string) and new `niches` (string[])
    const niches: string[] = Array.isArray(body.niches) && body.niches.length > 0
      ? body.niches
      : body.niche ? [body.niche] : ['commerce local'];
    const cities: string[] = Array.isArray(body.cities) && body.cities.length > 0
      ? body.cities
      : body.city ? [body.city] : ['Montréal'];
    const sources: string[] = Array.isArray(body.sources) && body.sources.length > 0 ? body.sources : ['google'];
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 50, 5), 500);
    const radius = Math.min(Math.max(Number(body.radius) || 10000, 2000), 50000);

    const allLeads: ScrapedLead[] = [];
    const usedSources: string[] = [];

    // ── OSM / Overpass — always uses open data, never Apify ──
    if (sources.includes('google')) {
      const osmLeads = await runOverpassScraper(niches, cities, maxResults, radius);
      allLeads.push(...osmLeads);
      usedSources.push('osm');
    }

    // ── Yelp ──
    if (sources.includes('yelp')) {
      const tasks = cities.flatMap(city => niches.map(niche => scrapeDirectoryFromDDG(niche, city, 'yelp')));
      const results = await Promise.allSettled(tasks);
      for (const r of results) {
        if (r.status === 'fulfilled') allLeads.push(...r.value);
      }
      usedSources.push('yelp');
    }

    // ── PagesJaunes ──
    if (sources.includes('pagesjaunes')) {
      const tasks = cities.flatMap(city => niches.map(niche => scrapeDirectoryFromDDG(niche, city, 'pagesjaunes')));
      const results = await Promise.allSettled(tasks);
      for (const r of results) {
        if (r.status === 'fulfilled') allLeads.push(...r.value);
      }
      usedSources.push('pagesjaunes');
    }

    // ── 411.ca ──
    if (sources.includes('411')) {
      const tasks = cities.flatMap(city => niches.map(niche => scrapeDirectoryFromDDG(niche, city, '411')));
      const results = await Promise.allSettled(tasks);
      for (const r of results) {
        if (r.status === 'fulfilled') allLeads.push(...r.value);
      }
      usedSources.push('411');
    }

    const unique = dedup(allLeads);

    if (unique.length > 0) {
      return NextResponse.json({ leads: unique.slice(0, maxResults), source: usedSources.join('+'), total: unique.length });
    }

    // No real results found — return empty, never simulate
    return NextResponse.json({
      leads: [],
      source: usedSources.join('+') || 'none',
      total: 0,
      message: 'Aucun résultat trouvé pour cette combinaison niche/ville. Essayez une autre niche, une autre ville ou activez Apify pour des résultats Google Maps.',
    });

  } catch (err) {
    console.error('[scrape-maps]', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
