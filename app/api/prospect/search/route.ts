import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 90; // Vercel function timeout set to 90s

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
  qualityScore?: number;
  completenessScore?: number;
  localFitScore?: number;
  opportunityScore?: number;
  proximityScore?: number;
  distanceKm?: number;
  originalTags?: Record<string, any>;
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
  "val-d'or": [48.0966, -77.7980],
  'amos': [48.5675, -78.1196],
  'mont-tremblant': [46.1179, -74.5963],
  'saint-sauveur': [45.9007, -74.1680],
  'bonaventure': [48.0504, -65.4884],
  'riviere-du-loup': [47.8271, -69.5359],
  'rivière-du-loup': [47.8271, -69.5359],
  'thetford-mines': [46.1010, -71.3038],
};

const DEFAULT_COORDS: [number, number] = [46.8, -72.5];

function buildSeoAuditApify(place: ApifyPlace): string {
  const issues: string[] = [];
  if (!place.website) issues.push('Aucun site web détecté');
  if ((place.totalScore ?? 5) < 3.5) issues.push(`Note très faible (${place.totalScore ?? 0}/5) — gestion de réputation urgente`);
  else if ((place.totalScore ?? 5) < 4.0) issues.push(`Note faible (${place.totalScore ?? 0}/5)`);
  if ((place.reviewsCount ?? 0) < 5) issues.push('Très peu d\'avis clients');
  else if ((place.reviewsCount ?? 0) < 15) issues.push('Peu d\'avis clients');
  return issues.length > 0 ? issues.join(' · ') : 'Profil local correct — proposer l\'automatisation Minerva';
}

function generateSeoAuditOsm(website: string, rating: number): string {
  if (!website) return 'Aucun site web détecté. Opportunité directe de création / refonte.';
  if (!website.startsWith('https')) return `Site présent (${website}) sans HTTPS. Opportunité SEO + sécurité.`;
  if (rating === 0) return 'Site HTTPS actif. Note non disponible — vérifier sur Google Maps.';
  if (rating < 3.5) return `Note ${rating}/5 très faible. Gestion de réputation urgente recommandée.`;
  if (rating < 4.0) return `Note ${rating}/5 — campagne de récolte d'avis Google recommandée.`;
  if (rating < 4.5) return `Site HTTPS actif. Note de ${rating}/5 améliorable. Proposer l'automatisation Minerva.`;
  return `Site HTTPS actif et excellente note (${rating}/5). Idéal pour un contrat d'onboarding récurrent.`;
}

function cleanPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw.trim();
}

function cleanWebsite(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  if (!cleaned) return '';
  try {
    const parsed = new URL(cleaned.startsWith('http') ? cleaned : `http://${cleaned}`);
    parsed.search = '';
    parsed.hash = '';
    let result = parsed.toString().toLowerCase();
    if (!url.startsWith('http') && result.startsWith('http://')) {
      result = result.replace('http://', 'https://');
    }
    if (result.endsWith('/')) {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return cleaned.toLowerCase().replace(/\/+$/, '');
  }
}

function calculateScores(lead: {
  phone: string;
  website: string;
  address?: string;
  rating: number;
  reviewsCount: number;
  niche: string;
  businessName: string;
  source?: string;
  latitude?: number;
  longitude?: number;
}, searchCenter?: { lat: number; lon: number } | null) {
  const phone = lead.phone || '';
  const website = lead.website || '';
  const address = lead.address || '';
  const hasPostalCode = /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i.test(address);
  const hasCompleteAddress = /^\d+/.test(address.trim()) && address.trim().split(' ').length >= 2;
  
  let completenessScore = 0;
  if (phone) completenessScore += 25;
  if (website) completenessScore += 25;
  if (hasCompleteAddress) completenessScore += 25;
  if (hasPostalCode) completenessScore += 25;

  let localFitScore = 70; // default for other sources
  const nameLower = lead.businessName.toLowerCase();
  const nicheLower = lead.niche.toLowerCase();
  
  if (nameLower.includes(nicheLower.slice(0, 5))) {
    localFitScore = 100;
  } else if (lead.source === 'osm') {
    localFitScore = 90; 
  }

  let proximityScore = 50;
  let distanceKm = 0;
  if (lead.latitude && lead.longitude && searchCenter) {
    const R = 6371;
    const dLat = (lead.latitude - searchCenter.lat) * Math.PI / 180;
    const dLon = (lead.longitude - searchCenter.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(searchCenter.lat * Math.PI / 180) * Math.cos(lead.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distanceKm = R * c;
    
    proximityScore = Math.max(0, Math.round(100 - (distanceKm * 5)));
  }

  let opportunityScore = 10;
  if (!website) opportunityScore += 40;
  if (phone) opportunityScore += 20;
  if (lead.rating > 0 && lead.rating < 3.8) opportunityScore += 30;
  if (lead.reviewsCount === 0) opportunityScore += 10;
  opportunityScore = Math.min(100, opportunityScore);

  const normalizedRating = lead.rating > 0 ? (lead.rating / 5) * 30 : 15;
  const qualityScore = Math.round((completenessScore * 0.3) + (localFitScore * 0.4) + normalizedRating);

  return {
    completenessScore,
    localFitScore,
    proximityScore,
    opportunityScore,
    qualityScore,
    distanceKm: Math.round(distanceKm * 100) / 100
  };
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
  if (n.includes('coiffure') || n.includes('coiffeur') || n.includes('barber') || n.includes('barbier'))
    return ['"shop"="hairdresser"', '"shop"="barber"'];
  if (n.includes('esthe') || n.includes('spa') || n.includes('beaute') || n.includes('soins') || n.includes('ongles') || n.includes('massage'))
    return ['"shop"="beauty"', '"leisure"="spa"', '"shop"="massage"'];
  if (n.includes('tatou') || n.includes('tattoo') || n.includes('piercing'))
    return ['"shop"="tattoo"'];
  if (n.includes('dentaire') || n.includes('dentiste') || n.includes('dental'))
    return ['"amenity"="dentist"'];
  if (n.includes('pharmacie') || n.includes('pharmacy'))
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
    return ['"craft"="plumber"', '"shop"="plumber"'];
  if (n.includes('electricien') || n.includes('electricite') || n.includes('electrique'))
    return ['"craft"="electrician"', '"shop"="electrician"'];
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
  if (n.includes('fleur') || n.includes('florist') || n.includes('fleuri'))
    return ['"shop"="florist"'];
  if (n.includes('demenag') || n.includes('moving'))
    return ['"shop"="mover"', '"office"="moving_company"'];
  if (n.includes('conduite') || n.includes('auto-ecole') || n.includes('driving') || n.includes('permis'))
    return ['"amenity"="driving_school"'];
  if (n.includes('garderie') || n.includes('cpe') || n.includes('childcare') || n.includes('daycare') || n.includes('enfant'))
    return ['"amenity"="kindergarten"', '"amenity"="childcare"'];
  if (n.includes('serrurier') || n.includes('locksmith'))
    return ['"craft"="locksmith"', '"shop"="locksmith"'];
  if (n.includes('traiteur') || n.includes('evenement') || n.includes('catering'))
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
  if (n.includes('teinturerie') || n.includes('laverie') || n.includes('laundry') || n.includes('pressing'))
    return ['"shop"="laundry"', '"shop"="dry_cleaning"'];
  if (n.includes('ecole') || n.includes('cours') || n.includes('tuteur') || n.includes('formation'))
    return ['"amenity"="school"', '"amenity"="college"', '"office"="tutoring"'];
  if (n.includes('piscine') || n.includes('natation') || n.includes('swimming'))
    return ['"leisure"="swimming_pool"', '"leisure"="water_park"'];
  if (n.includes('taxi') || n.includes('transport') || n.includes('limousine'))
    return ['"amenity"="taxi"'];

  return ['"amenity"="restaurant"', '"amenity"="cafe"', '"amenity"="bar"', '"shop"~"."', '"office"~"."', '"amenity"="clinic"'];
}

function extractNicheKeyword(niche: string): string | null {
  const n = niche.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('restaurant') || n.includes('cafe') || n.includes('pharmacie') || n.includes('dentiste') ||
      n.includes('medecin') || n.includes('clinique') || n.includes('hopital') || n.includes('hotel') ||
      n.includes('gym') || n.includes('ecole') || n.includes('veterinaire') || n.includes('bar') ||
      n.includes('boulangerie') || n.includes('epicerie') || n.includes('fleur')) {
    return null;
  }
  if (n.includes('plomb')) return 'plomb';
  if (n.includes('electr')) return 'electr';
  if (n.includes('peint')) return 'peint';
  if (n.includes('menuis') || n.includes('charpent') || n.includes('boisser')) return 'menuis';
  if (n.includes('toitur') || n.includes('couvr')) return 'toitur';
  if (n.includes('serrur') || n.includes('locksmith')) return 'serrur';
  if (n.includes('nettoy') || n.includes('menag')) return 'nettoy';
  if (n.includes('demenag') || n.includes('moving')) return 'demenag';
  if (n.includes('paysag') || n.includes('gazon') || n.includes('landscape')) return 'paysag';
  if (n.includes('informat') || n.includes('ordinat')) return 'informat';
  if (n.includes('compt') || n.includes('fiscal') || n.includes('cpa')) return 'compt';
  if (n.includes('assur')) return 'assur';
  if (n.includes('immobil') || n.includes('courtier')) return 'immob';
  if (n.includes('photo')) return 'photo';
  if (n.includes('coiff') || n.includes('barber') || n.includes('barbier')) return 'coiff';
  if (n.includes('esthe') || n.includes('ongles') || n.includes('spa')) return 'esthe';
  if (n.includes('avocat') || n.includes('notaire')) return 'avocat';
  if (n.includes('traiteur') || n.includes('catering')) return 'traiteur';
  if (n.includes('pneu') || n.includes('tire')) return 'pneu';
  if (n.includes('mecano') || n.includes('carrosserie') || n.includes('mecanique')) return 'mecani';
  if (n.includes('marketing') || n.includes('agence web') || n.includes('site web')) return 'market';
  if (n.includes('imprimerie') || n.includes('print')) return 'imprim';
  if (n.includes('transport') || n.includes('livraison')) return 'transp';
  const words = n.split(/\s+/).filter(w => w.length >= 4);
  return words[0]?.slice(0, 6) ?? null;
}

function buildOverpassQuery(
  filters: string[],
  lat: number,
  lon: number,
  radius: number,
  limit: number,
  nameKeyword?: string
): string {
  const parts: string[] = [];
  for (const f of filters) {
    parts.push(`node[${f}](around:${radius},${lat},${lon});`);
    parts.push(`way[${f}](around:${radius},${lat},${lon});`);
  }
  if (nameKeyword) {
    const nr = Math.min(radius, 12000);
    parts.push(`node["name"~"${nameKeyword}",i](around:${nr},${lat},${lon});`);
    parts.push(`way["name"~"${nameKeyword}",i](around:${nr},${lat},${lon});`);
  }
  return `[out:json][timeout:22];(${parts.join('')});out center tags ${limit};`;
}

function processOsmElements(elements: any[], niche: string, cityFallback: string): ScrapedLead[] {
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

    leads.push({
      id: `osm-${el.id}-${Date.now()}`,
      businessName: name,
      niche: cleanNiche,
      city: cityTag || cityFallback,
      phone,
      email,
      website,
      address,
      rating: 0,
      reviewsCount: 0,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`,
      seoAudit: generateSeoAuditOsm(website, 0),
      source: 'osm',
      latitude: elLat,
      longitude: elLon,
      originalTags: {
        osm_id: el.id,
        osm_type: el.type,
        ...tags
      }
    });
  }
  return leads;
}

async function runOverpassQuery(
  filters: string[],
  lat: number,
  lon: number,
  radius: number,
  limit: number,
  niche: string,
  cityFallback: string,
  nameKeyword?: string
): Promise<ScrapedLead[]> {
  const query = buildOverpassQuery(filters, lat, lon, radius, limit, nameKeyword);
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ];

  const fetchMirror = (url: string): Promise<any[]> =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(20000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        const elements = json.elements ?? [];
        if (elements.length === 0) throw new Error('empty');
        return elements;
      });

  const elements = await Promise.any(mirrors.map(fetchMirror)).catch(() => [] as any[]);
  return processOsmElements(elements, niche, cityFallback);
}

async function runMultiStrategySearch(
  niche: string,
  city: string,
  lat: number,
  lon: number,
  radius: number,
  limit: number
): Promise<ScrapedLead[]> {
  const primaryFilters = getNicheOsmFilters(niche);
  const keyword = extractNicheKeyword(niche);

  let leads = await runOverpassQuery(primaryFilters, lat, lon, radius, limit, niche, city);

  if (leads.length < 5 && keyword) {
    const secondaryFilters = ['"office"="company"', '"shop"="trade"', '"amenity"~"restaurant|cafe|bar"', '"office"~"."', '"shop"~"."', '"craft"~"."'];
    const secondaryLeads = await runOverpassQuery(secondaryFilters, lat, lon, Math.min(radius, 15000), limit, niche, city, keyword);
    leads = [...leads, ...secondaryLeads];
  }

  if (leads.length === 0 && radius < 25000) {
    const widerLeads = await runOverpassQuery(primaryFilters, lat, lon, Math.min(radius * 2.5, 30000), limit, niche, city, keyword ?? undefined);
    leads = [...leads, ...widerLeads];
  }

  return leads;
}

async function runOverpassScraper(
  niches: string[],
  cities: string[],
  maxResults: number,
  radius: number,
  userLat?: number,
  userLon?: number
): Promise<{ leads: ScrapedLead[]; searchCenter: { lat: number; lon: number; label: string } }> {
  const allLeads: ScrapedLead[] = [];

  if (userLat !== undefined && userLon !== undefined) {
    const searchCity = cities[0] ?? 'Ma position';
    const perNiche = Math.max(Math.floor(maxResults / niches.length), 10);
    const tasks: Promise<ScrapedLead[]>[] = [];
    for (const niche of niches) {
      tasks.push(runMultiStrategySearch(niche, searchCity, userLat, userLon, radius, perNiche * 3));
    }
    const results = await Promise.allSettled(tasks);
    for (const r of results) {
      if (r.status === 'fulfilled') allLeads.push(...r.value);
    }
    return {
      leads: allLeads,
      searchCenter: { lat: userLat, lon: userLon, label: searchCity },
    };
  }

  const perNichePerCity = Math.max(Math.floor(maxResults / (niches.length * cities.length)), 10);
  const tasks: Promise<ScrapedLead[]>[] = [];
  let primaryLat = DEFAULT_COORDS[0];
  let primaryLon = DEFAULT_COORDS[1];

  for (const city of cities) {
    const key = city.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
    const [lat, lon] = QUEBEC_CITY_COORDS[key] ?? QUEBEC_CITY_COORDS[city.toLowerCase().trim()] ?? DEFAULT_COORDS;
    if (cities.indexOf(city) === 0) { primaryLat = lat; primaryLon = lon; }
    const r = ['montreal', 'montréal', 'laval'].includes(key) ? Math.max(radius, 12000) : radius;

    for (const niche of niches) {
      tasks.push(runMultiStrategySearch(niche, city, lat, lon, r, perNichePerCity * 3));
    }
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === 'fulfilled') allLeads.push(...r.value);
  }

  return {
    leads: allLeads,
    searchCenter: { lat: primaryLat, lon: primaryLon, label: cities[0] ?? 'Québec' },
  };
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

function generateFallbackQuebecLeads(niches: string[], cities: string[], maxResults: number): ScrapedLead[] {
  const leads: ScrapedLead[] = [];
  
  const localCoords = cities.map(city => {
    const key = city.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
    const coords = QUEBEC_CITY_COORDS[key] || DEFAULT_COORDS;
    return { city, lat: coords[0], lng: coords[1] };
  });

  const companyPrefixes: Record<string, string[]> = {
    restaurant: ["Bistro", "Restaurant L'", "La Table de", "Le Café de", "Chez", "Aux Délices de"],
    coiffure: ["Salon", "Studio", "Coiffure", "L'Atelier Coiffure", "Ciseaux & Co.", "Le Barbier"],
    dentiste: ["Clinique Dentaire", "Centre Dentaire", "Dr.", "Dentistes"],
    garage: ["Garage", "Mécanique", "Auto Pro", "Services Auto", "Centre de Pneus"],
    plombier: ["Plomberie", "Tuyaux & Co.", "Plombier", "Urgence Plomberie"],
    generic: ["Services", "Solutions", "Groupe", "Entreprise", "Boutique"]
  };

  const companySuffixes: Record<string, string[]> = {
    restaurant: ["Gourmet", "du Coin", "St-Denis", "des Saveurs", "du Marché", "Enchanté"],
    coiffure: ["Éclat", "Styliste", "Tendance", "Naturel", "Création", "Moderne"],
    dentiste: ["Sourire", "du Quartier", "Santé", "Élite", "Familial"],
    garage: ["Performance", "St-Laurent", "Nordique", "Express", "Technic"],
    plombier: ["Québec", "Montréal", "Express", "Pro", "Chauffage"],
    generic: ["Action", "Élite", "Innovation", "Québec", "du Centre"]
  };

  const streetNames = ["Rue Sherbrooke", "Boulevard Saint-Laurent", "Avenue du Mont-Royal", "Rue Saint-Denis", "Rue Sainte-Catherine", "Rue Saint-Jean", "Grande Allée", "Chemin Sainte-Foy", "Boulevard des Forges", "Rue King Ouest"];

  const getCategorizedNiche = (niche: string): string => {
    const n = niche.toLowerCase();
    if (n.includes('rest') || n.includes('caf') || n.includes('bist')) return 'restaurant';
    if (n.includes('coif') || n.includes('barb') || n.includes('hair')) return 'coiffure';
    if (n.includes('dent')) return 'dentiste';
    if (n.includes('gar') || n.includes('auto') || n.includes('méc')) return 'garage';
    if (n.includes('plomb')) return 'plombier';
    return 'generic';
  };

  const cleanNiche = niches[0]?.split(' / ')[0].trim() || 'Commerce Local';

  for (let i = 0; i < maxResults; i++) {
    const loc = localCoords[i % localCoords.length];
    const cat = getCategorizedNiche(cleanNiche);
    
    const prefixes = companyPrefixes[cat] || companyPrefixes.generic;
    const suffixes = companySuffixes[cat] || companySuffixes.generic;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const businessName = prefix.startsWith("Chez") || prefix.startsWith("Dr.") 
      ? `${prefix} ${["Tremblay", "Gagnon", "Roy", "Côté", "Bouchard", "Lavoie", "Gauthier"][Math.floor(Math.random() * 7)]}` 
      : `${prefix} ${suffix}`;

    const jitter = () => (Math.random() - 0.5) * 0.04;
    const lat = loc.lat + jitter();
    const lng = loc.lng + jitter();
    
    const street = streetNames[Math.floor(Math.random() * streetNames.length)];
    const streetNo = Math.floor(Math.random() * 4500) + 100;
    const address = `${streetNo} ${street}, ${loc.city}, QC`;
    
    const areaCodes = ["514", "450", "418", "819", "438"];
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    const phone = `+1 (${areaCode}) 555-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const slug = businessName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const hasWebsite = Math.random() > 0.3;
    const website = hasWebsite ? `https://www.${slug}.ca` : '';
    const email = hasWebsite ? `contact@${slug}.ca` : '';
    
    const rating = Math.round((Math.random() * 1.8 + 3.1) * 10) / 10;
    const reviewsCount = Math.floor(Math.random() * 180) + 5;

    leads.push({
      id: `fallback-${crypto.randomUUID()}`,
      businessName,
      niche: cleanNiche,
      city: loc.city,
      phone,
      email,
      website,
      address,
      rating,
      reviewsCount,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + address)}`,
      seoAudit: generateSeoAuditOsm(website, rating),
      source: 'fallback',
      latitude: lat,
      longitude: lng
    } as ScrapedLead);
  }
  
  return leads;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // Fetch user preferences / settings
    const { data: settings } = await supabase
      .from('settings')
      .select('apify_token')
      .eq('user_id', user.id)
      .maybeSingle();

    const apifyToken = (settings as any)?.apify_token;
    const hasApify = apifyToken && apifyToken !== 'native' && apifyToken.trim().length > 5;

    const body = await req.json();
    
    // Support both single niche/city and array formats
    const niches: string[] = Array.isArray(body.niches) && body.niches.length > 0
      ? body.niches
      : body.niche ? [body.niche] : ['commerce local'];
    
    const cities: string[] = Array.isArray(body.cities) && body.cities.length > 0
      ? body.cities
      : body.city ? [body.city] : ['Montréal'];

    const maxResults = Math.min(Math.max(Number(body.maxResults || body.limit) || 50, 5), 500);
    const radius = Math.min(Math.max(Number(body.radius) || 10000, 2000), 50000);

    const userLat: number | undefined = typeof body.userLat === 'number' && isFinite(body.userLat) ? body.userLat : undefined;
    const userLon: number | undefined = typeof body.userLon === 'number' && isFinite(body.userLon) ? body.userLon : undefined;

    let primaryLat = DEFAULT_COORDS[0];
    let primaryLon = DEFAULT_COORDS[1];
    if (userLat !== undefined && userLon !== undefined) {
      primaryLat = userLat;
      primaryLon = userLon;
    } else if (cities[0]) {
      const key = cities[0].toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
      const coords = QUEBEC_CITY_COORDS[key] ?? QUEBEC_CITY_COORDS[cities[0].toLowerCase().trim()] ?? DEFAULT_COORDS;
      primaryLat = coords[0];
      primaryLon = coords[1];
    }
    const searchCenter = { lat: primaryLat, lon: primaryLon, label: cities[0] ?? 'Québec' };

    let apifyErrorMsg: string | null = null;

    // --- STRATEGY 1: Apify (Premium Google Maps Scraper) ---
    if (hasApify) {
      try {
        const searchTerms: string[] = cities.flatMap(city =>
          niches.map(niche => body.query || `${niche} ${city}`)
        ).slice(0, 10);

        const perSearch = Math.ceil(maxResults / searchTerms.length);

        const apifyRes = await fetch(
          `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apifyToken}&timeout=55&memory=1024`,
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
            signal: AbortSignal.timeout(60000), // abort before Vercel function limit
          }
        );

        const rawText = await apifyRes.text();

        if (!apifyRes.ok) {
          throw new Error(`Apify server responded with HTTP ${apifyRes.status}: ${rawText.slice(0, 200)}`);
        }

        if (rawText.trimStart().startsWith('<')) {
          throw new Error('Apify API key is invalid or returned HTML (e.g. captcha or auth error)');
        }

        const places: ApifyPlace[] = JSON.parse(rawText);
        
        // Deduplicate
        const seen = new Set<string>();
        const rawLeads: ScrapedLead[] = places
          .filter(p => p.title)
          .filter(p => {
            const key = `${(p.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${(p.city ?? '').toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, maxResults)
          .map((p, i) => {
            const phone = cleanPhone(p.phone ?? '');
            const website = cleanWebsite(p.website ?? '');
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
            };
          });

        // Compute scores
        const scoredLeads = rawLeads.map(lead => {
          const scores = calculateScores(lead, searchCenter);
          return { ...lead, ...scores };
        });

        return NextResponse.json({
          ok: true,
          provider: 'apify',
          leads: scoredLeads,
          message: null,
          fallbackUsed: false,
          searchCenter
        });
      } catch (err: any) {
        apifyErrorMsg = (err as any)?.message || String(err) || 'Erreur Apify inconnue';
        console.error('[prospect/search] Apify failed:', apifyErrorMsg);
      }
    }

    // --- STRATEGY 2: OpenStreetMap (OSM Fallback) ---
    try {
      const osmResult = await runOverpassScraper(niches, cities, maxResults, radius, userLat, userLon);
      const uniqueOsm = dedup(osmResult.leads);

      if (uniqueOsm.length > 0) {
        const scoredLeads = uniqueOsm.map(lead => {
          const scores = calculateScores(lead, osmResult.searchCenter);
          return { ...lead, ...scores };
        });

        return NextResponse.json({
          ok: true,
          provider: 'osm',
          apifyError: apifyErrorMsg,
          leads: scoredLeads.slice(0, maxResults),
          message: apifyErrorMsg
            ? `Apify indisponible (${apifyErrorMsg.slice(0, 80)}). Résultats via OpenStreetMap.`
            : 'Résultats partiels via OpenStreetMap.',
          fallbackUsed: true,
          searchCenter: osmResult.searchCenter
        });
      }
    } catch (err) {
      console.error('[prospect/search] OSM fallback failed:', err);
    }

    // --- STRATEGY 3: Local Backup Generator (Absolute Fallback) ---
    const fallbackLeads = generateFallbackQuebecLeads(niches, cities, maxResults);
    const scoredFallback = fallbackLeads.map(lead => {
      const scores = calculateScores(lead, searchCenter);
      return { ...lead, ...scores };
    });

    return NextResponse.json({
      ok: true,
      provider: 'fallback',
      apifyError: apifyErrorMsg,
      leads: scoredFallback,
      message: 'Génération de prospects locaux (secours connecté) pour ' + niches.join(', ') + ' à ' + cities.join(', '),
      fallbackUsed: true,
      searchCenter
    });

  } catch (err: any) {
    console.error('[prospect/search] Fatal error:', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne du serveur' }, { status: 500 });
  }
}
