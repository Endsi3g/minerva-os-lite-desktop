import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const maxDuration = 55;
export const dynamic = 'force-dynamic';

// ── Firecrawl tool definitions ─────────────────────────────────────────────

function buildFirecrawlTools(app: FirecrawlApp) {
  return {
    scrapeUrl: async (url: string, formats: string[] = ['markdown']) => {
      const result = await app.scrapeUrl(url, { formats: formats as any });
      return result;
    },
    searchWeb: async (query: string, limit = 5) => {
      const result = await (app as any).search(query, { limit });
      return result;
    },
    crawlWebsite: async (url: string, maxPages = 5) => {
      const result = await (app as any).crawlUrl(url, {
        limit: maxPages,
        scrapeOptions: { formats: ['markdown'] },
      });
      return result;
    },
  };
}

// ── System prompt for the web research assistant ───────────────────────────

const SYSTEM_PROMPT = `Tu es un Assistant de Recherche Web expert, propulsé par Firecrawl. Tu aides les utilisateurs à trouver des informations précises et structurées sur le web.

Tes capacités :
1. **Extraction de contenu** : Extraire le contenu Markdown propre d'une URL
2. **Recherche web** : Trouver des pages pertinentes selon des requêtes
3. **Crawl de sites** : Explorer plusieurs pages d'un site systématiquement

Quand tu reçois une requête de l'utilisateur :
1. Identifie la meilleure approche (scrape URL directe, recherche, crawl)
2. Utilise les outils disponibles pour récupérer l'information
3. Synthétise les résultats de façon claire et structurée
4. Cite tes sources (URLs)

Réponds toujours en français sauf si l'utilisateur écrit en anglais.`;

// ── Main route handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FIRECRAWL_API_KEY non configuré' }, { status: 400 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuré' }, { status: 400 });
  }

  const { query, mode = 'search' } = await req.json() as {
    query?: string;
    mode?: 'search' | 'scrape' | 'crawl';
    url?: string;
  };

  const body = await req.json().catch(() => ({}));
  const { url } = body as { url?: string };

  if (!query && !url) {
    return NextResponse.json({ error: 'query ou url requis' }, { status: 400 });
  }

  const fc = new FirecrawlApp({ apiKey });
  const tools = buildFirecrawlTools(fc);

  try {
    let rawResult: any;

    if (mode === 'scrape' && url) {
      rawResult = await tools.scrapeUrl(url);
    } else if (mode === 'crawl' && url) {
      rawResult = await tools.crawlWebsite(url, 5);
    } else {
      rawResult = await tools.searchWeb(query || '', 5);
    }

    // Now use Anthropic to synthesize the result
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const rawJson = JSON.stringify(rawResult, null, 2).slice(0, 12000);
    const userMessage = query
      ? `Requête: "${query}"\n\nRésultats bruts Firecrawl:\n${rawJson}\n\nSynthétise ces résultats de façon claire et utile.`
      : `URL crawlée: ${url}\n\nContenu extrait:\n${rawJson}\n\nRésume et structure ce contenu.`;

    const stream = await anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Return as SSE stream compatible with the existing frontend format
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const data = JSON.stringify({
              choices: [{ delta: { content: chunk.delta.text } }],
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('[firecrawl-search]', err);
    return NextResponse.json({ error: err.message || 'Erreur Firecrawl' }, { status: 500 });
  }
}
