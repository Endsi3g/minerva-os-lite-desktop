import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateCompletion } from '@/lib/ai';

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

export async function POST(req: NextRequest) {
  try {
    const supabase = await getAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, type = 'page', options } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const bullets = options?.bullets || 5;
    const extractActions = options?.extractActions !== false;
    const language = options?.language || 'fr';

    const systemPrompt = `Tu es un assistant IA de synthèse et d'extraction d'actions (Notion AI dans Minerva OS).
Tu produis une synthèse structurée et exploitable d'un document (${type}).

Format de sortie attendu :
1. ## Résumé Exécutif (${bullets} points clés)
- Bullet 1
- Bullet 2
...

${extractActions ? `2. ## Plan d'Action & Tâches clés (Checklist)
- [ ] Action 1
- [ ] Action 2
...` : ''}

Consignes :
- Sois direct, synthétique et factuel.
- Langue : ${language === 'en' ? 'Anglais' : language === 'de' ? 'Allemand' : 'Français'}.
- Pas de bavardage d'introduction ni de conclusion.`;

    const fullMarkdown = await generateCompletion({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Document à synthétiser :\n"""\n${text}\n"""`,
        },
      ],
      maxTokens: 3500,
      userId: user.id,
    });

    // Extract bullet points and action checklist items if needed
    const summaryLines = fullMarkdown
      .split('\n')
      .filter(l => l.trim().startsWith('- ') && !l.includes('[ ]') && !l.includes('[x]'))
      .map(l => l.replace(/^- \s*/, '').trim());

    const actionLines = fullMarkdown
      .split('\n')
      .filter(l => l.includes('- [ ]') || l.includes('- [x]'))
      .map(l => l.replace(/^- \[[ x]\]\s*/, '').trim());

    return NextResponse.json({
      fullMarkdown: fullMarkdown.trim(),
      summary: summaryLines.join('\n'),
      actions: actionLines,
      success: true,
    });
  } catch (error) {
    console.error('Error in /api/ai/summarize:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
