import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateStreamCompletion } from '@/lib/ai';

export const runtime = 'nodejs';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

// Helper to encode SSE streaming events
const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, model, activeTool, system, provider: requestProvider } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    // Get user settings to look for API Keys
    const { data: dbSettings } = await supabase
      .from('settings')
      .select('openrouter_key, gemini_key, ai_provider, ai_model')
      .eq('user_id', user.id)
      .maybeSingle();

    const enhancedSystem = [
      system || '',
      `## Instructions Graphiques & Visualisations Recharts
Pour toute question sur les métriques, statistiques, répartition de leads, comparaison de niches, taux de closing ou pipeline commercial, fournis systématiquement un bloc \`\`\`chart\`\`\` au format JSON :
\`\`\`chart
{
  "title": "Titre du Graphique",
  "subtitle": "Sous-titre descriptif",
  "type": "bar", // ou "area", "line", "pie", "donut"
  "data": [{"name": "Catégorie A", "value": 45}, {"name": "Catégorie B", "value": 30}],
  "deepLink": {"label": "Ouvrir dans Analytics", "href": "/analytics"}
}
\`\`\``,
    ].filter(Boolean).join('\n\n');

    try {
      const stream = await generateStreamCompletion({
        system: enhancedSystem,
        messages,
        settings: {
          ai_provider: requestProvider || dbSettings?.ai_provider,
          ai_model: model || dbSettings?.ai_model,
          openrouter_key: dbSettings?.openrouter_key,
          gemini_key: dbSettings?.gemini_key,
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } catch (err) {
      const aiError = err instanceof Error ? err.message : 'AI provider unavailable';
      console.error("AI provider failed:", aiError);
      // Stream a real error message back rather than simulated content
      const errorMsg = `⚠️ **Erreur IA** — ${aiError}\n\nVérifie ta clé API dans **Paramètres → IA** et réessaie.`;
      const errorStream = new ReadableStream({
        start(controller) {
          const chunks = errorMsg.split(/(\s+)/);
          (async () => {
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
              await new Promise(r => setTimeout(r, 8));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          })();
        }
      });
      return new NextResponse(errorStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
      });
    }

  } catch (error) {
    console.error('Error in chat API route:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
