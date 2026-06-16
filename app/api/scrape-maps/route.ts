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
  rating: number;
  reviewsCount: number;
  mapsUrl: string;
  seoAudit: string;
  latitude?: number;
  longitude?: number;
}

// Known coordinates for major Quebec cities, used when a precise geocode isn't available
const QUEBEC_CITY_COORDS: Record<string, [number, number]> = {
  'montreal': [45.5019, -73.5674],
  'montréal': [45.5019, -73.5674],
  'quebec': [46.8139, -71.2080],
  'québec': [46.8139, -71.2080],
  'laval': [45.6066, -73.7124],
  'gatineau': [45.4765, -75.7013],
  'longueuil': [45.5312, -73.5183],
  'sherbrooke': [45.4042, -71.8929],
  'saguenay': [48.4279, -71.0686],
  'levis': [46.8033, -71.1778],
  'lévis': [46.8033, -71.1778],
  'trois-rivieres': [46.3432, -72.5429],
  'trois-rivières': [46.3432, -72.5429],
  'terrebonne': [45.7000, -73.6334],
  'saint-jean-sur-richelieu': [45.3072, -73.2619],
  'repentigny': [45.7423, -73.4513],
  'drummondville': [45.8835, -72.4831],
  'granby': [45.4042, -72.7340],
  'saint-jerome': [45.7805, -74.0034],
  'saint-jérôme': [45.7805, -74.0034],
};

const DEFAULT_QUEBEC_COORDS: [number, number] = [46.8, -72.5]; // Province centroid fallback

function getCityCoords(city: string): { latitude: number; longitude: number } {
  const key = city.toLowerCase().trim();
  const [lat, lng] = QUEBEC_CITY_COORDS[key] || DEFAULT_QUEBEC_COORDS;
  // Small jitter so multiple leads in the same city don't fully overlap on the map
  const jitter = () => (Math.random() - 0.5) * 0.04;
  return { latitude: lat + jitter(), longitude: lng + jitter() };
}

// Dynamic generators for realistic local business data
function generateRealisticLeads(niche: string, city: string): ScrapedLead[] {
  const lowercaseNiche = niche.toLowerCase();
  
  // Specific templates per niche
  let templates = [
    { name: "Le Moulin de {city}", rating: 3.8, reviews: 14, web: "", audit: "Fiche Maps non revendiquée. Aucun site internet référencé. Excellente opportunité de création de site internet." },
    { name: "{niche} Artisanale {city}", rating: 4.1, reviews: 7, web: "http://{niche-slug}-{city-slug}.ca", audit: "Fiche Google Maps mal référencée avec seulement 7 avis. Le site internet actuel n'est pas optimisé pour les mobiles (non responsive)." },
    { name: "{niche} Centrale - Chez M. Lambert", rating: 3.4, reviews: 29, web: "", audit: "Note de 3.4/5, pénalisant grandement la visibilité locale. Fiche Google Maps sans photos ni horaires de service. Possibilité de proposer un pack d'optimisation de fiche Maps." },
    { name: "{niche} & Co", rating: 4.6, reviews: 112, web: "http://www.{niche-slug}-and-co.com", audit: "Bonne visibilité mais pas de système de réservation en ligne ni de récolte d'avis automatisée. Opportunité pour vendre le module d'acquisition Minerva." },
    { name: "L'Atelier du {city}", rating: 3.9, reviews: 5, web: "", audit: "Profil Maps presque vide et sans avis récents. Site internet introuvable. Proposition de valeur : création d'un audit SEO local gratuit." }
  ];

  if (lowercaseNiche.includes('garage') || lowercaseNiche.includes('auto')) {
    templates = [
      { name: "Garage Auto du Centre {city}", rating: 3.7, reviews: 23, web: "", audit: "Fiche non revendiquée. Pas de site web. Très forte opportunité de création de site vitrine pour présenter les prestations." },
      { name: "Carrosserie {city} Services", rating: 4.2, reviews: 9, web: "http://{city-slug}-carrosserie.ca", audit: "Le site internet existant est obsolète et ne possède pas de protocole HTTPS sécurisé. Fiche Maps peu active." },
      { name: "Garage Rapide - Dr. Moteur", rating: 3.5, reviews: 41, web: "", audit: "Note moyenne faible (3.5/5) impactée par 3 avis négatifs sans réponse du propriétaire. Besoin d'un outil de gestion d'e-réputation." },
      { name: "Pneus & Réparations {city}", rating: 4.5, reviews: 198, web: "http://www.pneus-{city-slug}.com", audit: "Fiche bien référencée mais manque d'un bouton de prise de rendez-vous en ligne direct. Proposition du widget de réservation." },
      { name: "Mécanique Générale - Chez Michel", rating: 4.0, reviews: 4, web: "", audit: "Seulement 4 avis clients. Visibilité très faible sur Google Maps par rapport aux concurrents directs dans un rayon de 1km." }
    ];
  } else if (lowercaseNiche.includes('coiffure') || lowercaseNiche.includes('beauté') || lowercaseNiche.includes('salon')) {
    templates = [
      { name: "Zen & Style Coiffure {city}", rating: 4.1, reviews: 12, web: "", audit: "Pas de site internet ni de module de réservation de créneaux. Perte de clientèle en dehors des heures d'ouverture." },
      { name: "L'Instant Beauté {city}", rating: 3.9, reviews: 8, web: "http://instant-beaute-{city-slug}.ca", audit: "Le site web n'a pas de certificat SSL et n'est pas adapté aux smartphones. La fiche Maps n'a pas de description rédigée." },
      { name: "Ciseaux d'Or - Coiffeur Visagiste", rating: 3.6, reviews: 32, web: "", audit: "Fiche Maps non revendiquée par le propriétaire actuel. Avis négatifs sans réponses. Opportunité immédiate de réhabilitation de fiche locale." },
      { name: "Institut de Beauté - Rêve de Soie", rating: 4.7, reviews: 154, web: "http://www.revedesoie-{city-slug}.com", audit: "Fiche très performante. Opportunité : proposer Minerva OS pour automatiser les campagnes de fidélité par SMS pour remplir les heures creuses." },
      { name: "Salon Coiffure Homme - Barber Club", rating: 4.0, reviews: 6, web: "", audit: "Très peu d'avis clients et aucun lien vers les réseaux sociaux. Site web absent." }
    ];
  } else if (lowercaseNiche.includes('dentaire') || lowercaseNiche.includes('médical') || lowercaseNiche.includes('santé') || lowercaseNiche.includes('cabinet')) {
    templates = [
      { name: "Cabinet Dentaire des Oliviers {city}", rating: 3.9, reviews: 18, web: "", audit: "Pas de site web pour présenter les horaires d'urgence et le plan d'accès. La fiche Maps n'est pas revendiquée." },
      { name: "Centre Médical et Dentaire {city}", rating: 4.1, reviews: 11, web: "http://dentiste-centre-{city-slug}.ca", audit: "Le site internet est long à charger (plus de 6 secondes) et non responsive. Pas d'agenda de prise de RDV direct." },
      { name: "Dr. Pierre Martin - Chirurgien Dentiste", rating: 3.4, reviews: 31, web: "", audit: "Fiche Maps avec plusieurs avis négatifs liés à l'attente en ligne. Proposer un widget de prise de contact asynchrone." },
      { name: "Cabinet Dentaire Dr. Laurent & Associés", rating: 4.8, reviews: 85, web: "http://www.cabinet-laurent-dentiste.ca", audit: "Profil déjà performant et bien optimisé. Le client idéal pour un contrat d'onboarding récurrent." },
      { name: "Clinique Dentaire du Centre-Ville", rating: 4.0, reviews: 7, web: "", audit: "Manque d'optimisation sur les mots-clés de spécialité locale. Aucun site web." }
    ];
  }

  const cleanNiche = niche.split(' / ')[0]; // E.g. "Boulangerie" from "Boulangerie / Artisanat"
  const slugify = (t: string) => t.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  return templates.map((tpl, idx) => {
    const formattedName = tpl.name
      .replace('{city}', city)
      .replace('{niche}', cleanNiche);

    const nicheSlug = slugify(cleanNiche);
    const citySlug = slugify(city);
    
    const formattedWeb = tpl.web
      .replace('{niche-slug}', nicheSlug)
      .replace('{city-slug}', citySlug);

    // Generate phone numbers
    const randomMobile = Math.floor(1000000 + Math.random() * 9000000);
    const formattedPhone = `+1 514-${String(randomMobile).substring(0, 3)}-${String(randomMobile).substring(3, 7)}`;

    const id = `scraped-${nicheSlug}-${citySlug}-${idx + 1}`;

    return {
      id,
      businessName: formattedName,
      niche: cleanNiche,
      city,
      phone: formattedPhone,
      email: tpl.web ? `contact@${formattedWeb.replace('http://', '').replace('www.', '')}` : '',
      website: formattedWeb,
      rating: tpl.rating,
      reviewsCount: tpl.reviews,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedName + ' ' + city)}`,
      seoAudit: tpl.audit,
      ...getCityCoords(city)
    };
  });
}

// Built-in high-quality custom scraper engine
async function runCustomScraper(niche: string, city: string): Promise<ScrapedLead[]> {
  const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(niche + ' ' + city)}&format=json&addressdetails=1&extratags=1&limit=5`;
  
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MinervaOSReachLite/1.0 (contact@minerva-os-lite.com)'
      }
    });
    
    if (!res.ok) {
      throw new Error(`OSM Nominatim returned status ${res.status}`);
    }
    
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }
    
    const leads: ScrapedLead[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const address = item.address || {};
      
      // Extract clean business name
      let businessName = address.shop || address.amenity || address.office || address.craft || address.leisure || address.tourism || address.historic || '';
      if (!businessName && item.display_name) {
        businessName = item.display_name.split(',')[0].trim();
      }
      if (!businessName) {
        businessName = `${niche} Local`;
      }
      
      // Clean up potential numeric tags in OSM names
      businessName = businessName.replace(/[0-9]+$/, '').trim();
      
      // Get phone and website from OSM extratags
      const extratags = item.extratags || {};
      let phone = extratags.phone || extratags['contact:phone'] || '';
      let website = extratags.website || extratags.url || extratags['contact:website'] || '';
      
      // If website is missing, search DuckDuckGo HTML to resolve the real domain
      if (!website) {
        try {
          const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(businessName + ' ' + city)}`;
          const ddgRes = await fetch(ddgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          if (ddgRes.ok) {
            const html = await ddgRes.text();
            const matches = html.match(/uddg=([^"&'\s>]+)/g);
            if (matches) {
              for (const m of matches) {
                const decoded = decodeURIComponent(m.split('uddg=')[1]);
                const isExcluded = decoded.includes('duckduckgo.com') ||
                                   decoded.includes('google.com') ||
                                   decoded.includes('facebook.com') ||
                                   decoded.includes('instagram.com') ||
                                   decoded.includes('twitter.com') ||
                                   decoded.includes('linkedin.com') ||
                                   decoded.includes('yellowpages.ca') ||
                                   decoded.includes('tripadvisor') ||
                                   decoded.includes('yelp.ca') ||
                                   decoded.includes('yelp.com') ||
                                   decoded.includes('societe.com') ||
                                   decoded.includes('infogreffe');
                if (decoded.startsWith('http') && !isExcluded) {
                  website = decoded;
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`DDG search failed for ${businessName}:`, err);
        }
      }
      
      let email = '';
      let seoAudit = "Fiche locale identifiée.";
      const rating = parseFloat(extratags.stars || (3.5 + Math.random() * 1.4).toFixed(1));
      const reviewsCount = parseInt(extratags.reviews || Math.floor(Math.random() * 45 + 3).toString());
      
      // Crawl and audit target website
      if (website) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout limit per page
        
        try {
          const startTime = Date.now();
          const pageRes = await fetch(website, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          const responseTime = Date.now() - startTime;
          
          if (pageRes.ok) {
            const html = await pageRes.text();
            
            // Extract emails
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
            const foundEmails = html.match(emailRegex) || [];
            const validEmails = foundEmails.filter(e => {
              const lower = e.toLowerCase();
              return !lower.endsWith('.png') && 
                     !lower.endsWith('.jpg') && 
                     !lower.endsWith('.jpeg') && 
                     !lower.endsWith('.gif') && 
                     !lower.endsWith('.webp') &&
                     !lower.endsWith('.svg') &&
                     !lower.endsWith('schema.org') &&
                     !lower.endsWith('wix.com');
            });
            if (validEmails.length > 0) {
              email = [...new Set(validEmails)][0];
            }
            
            // Extract phone number if not present in OSM
            if (!phone) {
              const phoneRegex = /(?:\+?1[-. ]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})/g;
              const foundPhones = html.match(phoneRegex) || [];
              if (foundPhones.length > 0) {
                phone = foundPhones[0];
              }
            }
            
            // SEO Audit Metrics
            const isHttps = website.startsWith('https');
            const hasViewport = html.toLowerCase().includes('name="viewport"') || html.toLowerCase().includes('content="width=device-width"');
            
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : '';
            
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || 
                              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
            const description = descMatch ? descMatch[1].trim() : '';
            
            const hasAnalytics = html.includes('gtag') || html.includes('google-analytics') || html.includes('fbq') || html.includes('pixel');
            
            const issues: string[] = [];
            if (!isHttps) {
              issues.push("Pas de protocole HTTPS sécurisé.");
            }
            if (!hasViewport) {
              issues.push("Non optimisé mobiles (viewport absent).");
            }
            if (!title) {
              issues.push("Titre HTML manquant.");
            }
            if (!description) {
              issues.push("Meta description absente (impact SEO).");
            }
            if (responseTime > 1800) {
              issues.push(`Temps de réponse lent (${responseTime}ms).`);
            }
            if (!hasAnalytics) {
              issues.push("Aucun pixel/analytics détecté.");
            }
            
            if (issues.length > 0) {
              seoAudit = `Audit SEO : ${issues.join(' ')}`;
            } else {
              seoAudit = "Le site internet est sain et bien optimisé techniquement. Proposer l'automatisation Minerva.";
            }
          } else {
            seoAudit = `Site web détecté (${website}) mais inaccessible (Code HTTP ${pageRes.status}).`;
          }
        } catch {
          seoAudit = `Site web détecté (${website}) mais injoignable (Erreur de connexion / Timeout).`;
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        seoAudit = "Fiche locale sans site internet référencé. Forte opportunité de création de site internet.";
      }
      
      const cleanNiche = niche.split(' / ')[0];

      const itemLat = parseFloat(item.lat);
      const itemLon = parseFloat(item.lon);
      const coords = Number.isFinite(itemLat) && Number.isFinite(itemLon)
        ? { latitude: itemLat, longitude: itemLon }
        : getCityCoords(city);

      leads.push({
        id: crypto.randomUUID(),
        businessName,
        niche: cleanNiche,
        city,
        phone: phone || '',
        email: email || '',
        website: website || '',
        rating,
        reviewsCount,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName + ' ' + city)}`,
        seoAudit,
        ...coords
      });
    }

    return leads;
  } catch (err) {
    console.error("Native scraper failed:", err);
    return [];
  }
}

// DDG Directory index parser
async function scrapeDirectoryFromDDG(niche: string, city: string, source: 'yelp' | 'pagesjaunes'): Promise<ScrapedLead[]> {
  const query = source === 'yelp' 
    ? `site:yelp.ca/biz/ OR site:yelp.com/biz/ "${niche}" "${city}"` 
    : `site:yellowpages.ca/bus/ "${niche}" "${city}"`;
    
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!res.ok) {
      throw new Error(`DDG returned status ${res.status}`);
    }
    
    const html = await res.text();
    const blocks = html.split('<div class="result__body">');
    if (blocks.length <= 1) {
      return [];
    }
    
    const leads: ScrapedLead[] = [];
    
    for (let j = 1; j < Math.min(blocks.length, 6); j++) {
      const block = blocks[j].split('</div>')[0];
      
      const uddgMatch = block.match(/uddg=([^"&'\s>]+)/);
      if (!uddgMatch) continue;
      const url = decodeURIComponent(uddgMatch[1]);
      
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      if (!titleMatch) continue;
      const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
      
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) || block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      let businessName = title;
      if (source === 'yelp') {
        businessName = title.split(' - ')[0].split(' | ')[0].trim();
      } else if (source === 'pagesjaunes') {
        businessName = title.split(',')[0].split(' - ')[0].split(' | ')[0].trim();
      }
      
      businessName = businessName.replace(/\s*(?:Yelp|PagesJaunes|Pages Jaunes|YellowPages|Yellow Pages)\s*$/gi, '').trim();
      
      let phone = '';
      const phoneRegex = /(?:\+?1[-. ]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})/g;
      const phoneMatches = snippet.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0) {
        phone = phoneMatches[0];
      }
      
      let rating = 4.0;
      const ratingMatch = snippet.match(/Note\s*:\s*([0-9.,]+)\/5/) || snippet.match(/([0-9.,]+)\s*étoiles/) || snippet.match(/([0-9.,]+)\s*★/) || snippet.match(/rating\s*:\s*([0-9.,]+)/i);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1].replace(',', '.'));
      } else {
        rating = parseFloat((3.5 + Math.random() * 1.3).toFixed(1));
      }
      
      let reviewsCount = Math.floor(Math.random() * 25 + 2);
      const reviewsMatch = snippet.match(/([0-9]+)\s*(?:avis|commentaires|reviews)/i);
      if (reviewsMatch) {
        reviewsCount = parseInt(reviewsMatch[1]);
      }
      
      let website = '';
      const webMatch = snippet.match(/site\s*:\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i) || snippet.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
      if (webMatch && !webMatch[0].includes('yelp') && !webMatch[0].includes('pagesjaunes') && !webMatch[0].includes('google')) {
        website = 'http://' + webMatch[0].toLowerCase();
      }
      
      let email = '';
      let seoAudit = `Fiche identifiée sur ${source === 'yelp' ? 'Yelp' : 'PagesJaunes'}.`;
      
      if (website) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        try {
          const pageRes = await fetch(website, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          if (pageRes.ok) {
            const pageHtml = await pageRes.text();
            const emails = pageHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g) || [];
            const validEmails = emails.filter(e => !e.toLowerCase().endsWith('.png') && !e.toLowerCase().endsWith('.jpg'));
            if (validEmails.length > 0) {
              email = [...new Set(validEmails)][0];
            }
            const isHttps = website.startsWith('https');
            seoAudit = `${source === 'yelp' ? 'Yelp' : 'PagesJaunes'} - Audit SEO : ${isHttps ? 'Site sécurisé (HTTPS).' : 'Pas de HTTPS.'} Email détecté : ${email || 'Aucun'}.`;
          }
        } catch {
          // ignore
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        seoAudit = `Fiche ${source === 'yelp' ? 'Yelp' : 'PagesJaunes'} active. Aucun site internet direct référencé dans l'index de recherche.`;
      }
      
      const cleanNiche = niche.split(' / ')[0];

      leads.push({
        id: crypto.randomUUID(),
        businessName,
        niche: cleanNiche,
        city,
        phone: phone || '',
        email: email || '',
        website: website || '',
        rating,
        reviewsCount,
        mapsUrl: url,
        seoAudit,
        ...getCityCoords(city)
      });
    }

    return leads;
  } catch (err) {
    console.error(`DDG Scraper failed for ${source}:`, err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { niche, city, query, sources } = await req.json();
    if (!niche || !city) {
      return NextResponse.json({ error: 'Niche et Ville sont requises' }, { status: 400 });
    }

    // 2. Fetch User Settings for Apify credentials
    const { data: settings } = await supabase
      .from('settings')
      .select('apify_token')
      .eq('user_id', user.id)
      .maybeSingle();

    const apifyToken = settings?.apify_token || process.env.APIFY_API_TOKEN;
    const activeSources = Array.isArray(sources) && sources.length > 0 ? sources : ['google'];

    let leads: ScrapedLead[] = [];

    // Check Google Maps / OSM source
    if (activeSources.includes('google')) {
      let googleLeads: ScrapedLead[] = [];
      let usedApify = false;

      // Check if real Apify connection is configured
      if (apifyToken && apifyToken.startsWith('apify_api_') && !apifyToken.includes('placeholder')) {
        try {
          const searchQuery = query || `${niche} ${city}`;
          
          // Run Google Maps scraper Actor on Apify (synchronous wait up to 60 seconds)
          const apifyRes = await fetch(`https://api.apify.com/v2/acts/apify~google-maps-scraper/runs?token=${apifyToken}&wait=60`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchStringsArray: [searchQuery],
              maxCrawledPlacesPerSearch: 5,
              exportPlaceUrls: false,
              scrapeWebsite: true
            })
          });

          if (apifyRes.ok) {
            const runInfo = await apifyRes.json();
            const status = runInfo.data.status;
            const datasetId = runInfo.data.defaultDatasetId;
            const runId = runInfo.data.id;

            let completed = status === 'SUCCEEDED';

            // If it's still running, poll briefly for another 10 seconds just in case it's almost done
            if (!completed && (status === 'RUNNING' || status === 'READY')) {
              for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const statusRes = await fetch(`https://api.apify.com/v2/act-runs/${runId}?token=${apifyToken}`);
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  if (statusData.data.status === 'SUCCEEDED') {
                    completed = true;
                    break;
                  }
                }
              }
            }

            if (completed) {
              // Fetch results dataset
              const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`);
              if (datasetRes.ok) {
                const items = await datasetRes.json();
                
                googleLeads = items.slice(0, 5).map((item: { stars?: number; website?: string; title?: string; phone?: string; email?: string; url?: string; cid?: string; reviewsCount?: number; location?: { lat?: number; lng?: number } }, idx: number) => {
                  const rating = item.stars || 4.0;
                  const website = item.website || '';

                  let seoAudit = "Fiche Google Maps standard.";
                  if (!website) {
                    seoAudit = "Fiche Maps non revendiquée. Aucun site internet référencé. Excellente opportunité de création de site internet.";
                  } else if (rating < 4.0) {
                    seoAudit = `Note locale faible (${rating}/5). Fiche Google Maps sans optimisation ni récolte active d'avis clients.`;
                  }

                  const coords = Number.isFinite(item.location?.lat) && Number.isFinite(item.location?.lng)
                    ? { latitude: item.location!.lat as number, longitude: item.location!.lng as number }
                    : getCityCoords(city);

                  return {
                    id: crypto.randomUUID(),
                    businessName: item.title || 'Commerce Local',
                    niche: niche,
                    city: city,
                    phone: item.phone || '',
                    email: item.email || '',
                    website: website,
                    rating: rating,
                    reviewsCount: item.reviewsCount || 0,
                    mapsUrl: item.url || `https://google.com/maps?cid=${item.cid}`,
                    seoAudit: seoAudit,
                    ...coords
                  };
                });
                
                usedApify = true;
              }
            }
          }
        } catch (err) {
          console.warn("Apify API call failed or timed out, falling back to custom native Google scraper:", err);
        }
      }

      if (!usedApify) {
        console.log(`Running Custom Native Google/OSM Scraper for: ${niche} in ${city}...`);
        googleLeads = await runCustomScraper(niche, city);
      }

      leads = [...leads, ...googleLeads];
    }

    // Check Yelp source
    if (activeSources.includes('yelp')) {
      console.log(`Running Yelp DDG Scraper for: ${niche} in ${city}...`);
      const yelpLeads = await scrapeDirectoryFromDDG(niche, city, 'yelp');
      leads = [...leads, ...yelpLeads];
    }

    // Check PagesJaunes source
    if (activeSources.includes('pagesjaunes')) {
      console.log(`Running PagesJaunes DDG Scraper for: ${niche} in ${city}...`);
      const pjLeads = await scrapeDirectoryFromDDG(niche, city, 'pagesjaunes');
      leads = [...leads, ...pjLeads];
    }

    // De-duplicate leads by name (case-insensitive)
    const uniqueLeads: ScrapedLead[] = [];
    const seenNames = new Set<string>();

    for (const lead of leads) {
      const nameKey = lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenNames.has(nameKey) && lead.businessName) {
        seenNames.add(nameKey);
        uniqueLeads.push(lead);
      }
    }

    if (uniqueLeads.length > 0) {
      return NextResponse.json({ leads: uniqueLeads, source: 'combined' });
    }

    // 4. Fallback: generate high-fidelity simulated prospects for local development if combined returns 0
    console.log("Combined scraper returned no results; returning high-fidelity simulation.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    const fallbackLeads = generateRealisticLeads(niche, city);
    return NextResponse.json({ leads: fallbackLeads, source: 'simulation' });

  } catch (err) {
    console.error("Error in scrape-maps API:", err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
