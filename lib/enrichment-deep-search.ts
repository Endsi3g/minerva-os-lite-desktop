import { generateCompletion } from '@/lib/ai';
import { scrapeWebsite } from '@/lib/website-scraper';

// Recherche web approfondie pour un lead dont l'enrichissement standard n'a
// pas trouvé de site web ni de téléphone. Deux passes :
//   1. Recherche web (Firecrawl `search`) + IA pour identifier le meilleur
//      candidat parmi les résultats et donner un score de confiance
//      (correspondance nom + ville avec le lead).
//   2. Si un site candidat est trouvé, on le scrape et on en extrait
//      téléphone/adresse/réseaux sociaux, avec un ajustement de confiance
//      basé sur ce que la page confirme réellement.
//
// Le score de confiance final détermine si l'appelant doit appliquer les
// données directement au lead (haute confiance) ou les stocker comme
// suggestion à valider manuellement (confiance moyenne/basse) — voir
// app/api/leads/enrich-batch/route.ts.

export interface DeepSearchCandidate {
  website?: string;
  phone?: string;
  address?: string;
  socialLinks?: Record<string, string>;
}

export interface DeepSearchResult {
  confidence: number; // 0-100
  reasoning: string;
  sourceUrl?: string;
  candidate: DeepSearchCandidate;
}

interface DeepSearchParams {
  businessName: string;
  city?: string;
  niche?: string;
  settings?: Record<string, unknown>;
  userId?: string;
}

async function searchWeb(query: string): Promise<Array<{ url?: string; title?: string; description?: string }>> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];
  try {
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    const fc = new FirecrawlApp({ apiKey });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await (fc as any).search(query, { limit: 5 });
    const items = result?.data ?? result?.web ?? result ?? [];
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.warn('[enrichment-deep-search] searchWeb failed:', err);
    return [];
  }
}

export async function deepSearchBusiness(params: DeepSearchParams): Promise<DeepSearchResult | null> {
  const { businessName, city, niche, settings, userId } = params;
  if (!businessName) return null;

  const query = [businessName, city, niche].filter(Boolean).join(' ');
  const results = await searchWeb(query);
  if (results.length === 0) return null;

  const resultsSummary = results
    .slice(0, 5)
    .map((r, i) => `${i + 1}. ${r.title || '(sans titre)'} — ${r.url || ''}\n   ${(r.description || '').slice(0, 200)}`)
    .join('\n');

  const matchPrompt = `Tu identifies la bonne entreprise dans des résultats de recherche web.

Entreprise recherchée : "${businessName}"${city ? ` à ${city}` : ''}${niche ? ` (secteur : ${niche})` : ''}

Résultats de recherche :
${resultsSummary}

Réponds en JSON strict (sans markdown, sans enrobage) :
{
  "bestMatchIndex": <numéro du résultat le plus probable (1-${results.length}), ou 0 si aucun ne correspond>,
  "confidence": <0-100, à quel point tu es certain que ce résultat est la MÊME entreprise que celle recherchée — pas juste une entreprise similaire ou homonyme dans une autre ville>,
  "reasoning": "<une phrase expliquant pourquoi>",
  "phone": "<téléphone trouvé dans la description, sinon vide>",
  "address": "<adresse trouvée dans la description, sinon vide>"
}`;

  let matchParsed: {
    bestMatchIndex?: number;
    confidence?: number;
    reasoning?: string;
    phone?: string;
    address?: string;
  };
  try {
    const text = await generateCompletion({
      messages: [{ role: 'user', content: matchPrompt }],
      settings,
      jsonMode: true,
      maxTokens: 500,
      userId,
    });
    matchParsed = JSON.parse(text);
  } catch (err) {
    console.warn('[enrichment-deep-search] match AI call failed:', err);
    return null;
  }

  const idx = (matchParsed.bestMatchIndex ?? 0) - 1;
  if (idx < 0 || idx >= results.length) return null;
  const best = results[idx];
  let confidence = Math.max(0, Math.min(100, matchParsed.confidence ?? 0));

  const candidate: DeepSearchCandidate = {
    website: best.url,
    phone: matchParsed.phone || undefined,
    address: matchParsed.address || undefined,
  };

  // Seconde passe : scraper le site candidat pour confirmer/compléter
  // téléphone, adresse et réseaux sociaux — seulement si le premier passage
  // donne déjà une confiance minimale (évite de scraper des résultats
  // clairement non pertinents).
  if (best.url && confidence >= 30) {
    const content = await scrapeWebsite(best.url);
    if (content) {
      const extractPrompt = `Voici le contenu du site "${best.url}", supposé être celui de l'entreprise "${businessName}"${city ? ` à ${city}` : ''} :
"""${content.slice(0, 4000)}"""

Réponds en JSON strict (sans markdown, sans enrobage) :
{
  "confirmsIdentity": <true si le contenu confirme clairement qu'il s'agit bien de "${businessName}"${city ? ` à ${city}` : ''}, false sinon>,
  "phone": "<téléphone trouvé, sinon vide>",
  "address": "<adresse complète trouvée, sinon vide>",
  "facebook": "<URL Facebook trouvée, sinon vide>",
  "instagram": "<URL Instagram trouvée, sinon vide>"
}`;
      try {
        const text = await generateCompletion({
          messages: [{ role: 'user', content: extractPrompt }],
          settings,
          jsonMode: true,
          maxTokens: 600,
          userId,
        });
        const extracted = JSON.parse(text) as {
          confirmsIdentity?: boolean;
          phone?: string;
          address?: string;
          facebook?: string;
          instagram?: string;
        };
        if (extracted.phone) candidate.phone = extracted.phone;
        if (extracted.address) candidate.address = extracted.address;
        const socialLinks: Record<string, string> = {};
        if (extracted.facebook) socialLinks.facebook = extracted.facebook;
        if (extracted.instagram) socialLinks.instagram = extracted.instagram;
        if (Object.keys(socialLinks).length > 0) candidate.socialLinks = socialLinks;

        confidence = extracted.confirmsIdentity
          ? Math.min(100, confidence + 25)
          : Math.max(0, confidence - 20);
      } catch (err) {
        console.warn('[enrichment-deep-search] extraction AI call failed:', err);
      }
    }
  }

  return {
    confidence,
    reasoning: matchParsed.reasoning || '',
    sourceUrl: best.url,
    candidate,
  };
}
