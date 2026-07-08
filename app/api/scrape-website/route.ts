// POST /api/scrape-website
// Scrapes a lead's website and returns a concise AI-generated business description.
// Uses Firecrawl when FIRECRAWL_API_KEY is set, otherwise falls back to a plain
// fetch + HTML-to-text extraction. The text is summarised by Claude Haiku.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';
import { scrapeWebsite } from '@/lib/website-scraper';

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

    const content = await scrapeWebsite(website);
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
          .select('ai_provider, ai_model, openrouter_key')
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
        maxTokens: 700,
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
