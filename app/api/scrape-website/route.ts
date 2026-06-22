// POST /api/scrape-website
// Scrapes a lead's website and returns a concise AI-generated business description.
// Uses Firecrawl when FIRECRAWL_API_KEY is set, otherwise falls back to a plain
// fetch + HTML-to-text extraction. The text is summarised by Claude Haiku.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

// Firecrawl scrape (clean markdown of main content)
async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizeUrl(url), formats: ['markdown'], onlyMainContent: true }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const md: string = data?.data?.markdown || data?.markdown || '';
    return md.slice(0, 4000) || null;
  } catch {
    return null;
  }
}

// Fallback: fetch the raw HTML and strip tags to plain text
async function scrapePlain(url: string): Promise<string | null> {
  try {
    const res = await fetch(normalizeUrl(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinervaBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Grab meta description + title for a strong signal, then body text
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const combined = [title, metaDesc, text].filter(Boolean).join('. ');
    return combined.slice(0, 4000) || null;
  } catch {
    return null;
  }
}

function cleanFallbackDescription(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '') // remove markdown images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // replace markdown links with text
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim()
    .slice(0, 400);
}

export async function POST(req: NextRequest) {
  try {
    const { website, businessName, niche } = await req.json();
    if (!website) {
      return NextResponse.json({ error: 'website is required' }, { status: 400 });
    }

    const content = (await scrapeWithFirecrawl(website)) || (await scrapePlain(website));
    if (!content) {
      return NextResponse.json({ error: "Impossible d'accéder au site web." }, { status: 502 });
    }

    let settings = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbSettings } = await supabase
          .from('settings')
          .select('ai_provider, ai_model, openrouter_key, groq_api_key, together_api_key')
          .eq('user_id', user.id)
          .maybeSingle();
        settings = dbSettings;
      }
    } catch (err) {
      console.warn('[scrape-website] Failed loading settings:', err);
    }

    const prompt = `Voici le contenu extrait du site web de l'entreprise "${businessName || 'cette entreprise'}"${niche ? ` (secteur : ${niche})` : ''} :\n\n"""${content}"""\n\nRédige une description commerciale concise (3-4 phrases max) de cette entreprise : ce qu'elle fait, ses services/produits principaux, sa clientèle cible et tout angle d'approche commercial pertinent. Sois factuel et direct, en français. Ne mentionne pas que tu analyses un site web.`;

    try {
      const description = await generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        settings: settings || undefined,
        maxTokens: 400,
      });

      return NextResponse.json({ description: description || cleanFallbackDescription(content) });
    } catch (err) {
      console.warn('[scrape-website] AI generation failed, using clean slice:', err);
      return NextResponse.json({ description: cleanFallbackDescription(content) });
    }
  } catch (err) {
    console.error('[scrape-website]', err);
    return NextResponse.json({ error: 'Erreur lors du scraping du site.' }, { status: 500 });
  }
}
