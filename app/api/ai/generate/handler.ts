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

    const { prompt, context, options } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const tone = options?.tone || 'professional';
    const length = options?.length || 'medium';
    const language = options?.language || 'fr';
    const format = options?.format || 'markdown';

    const systemPrompt = `Tu es le copilote IA de productivité et de rédaction pour une agence moderne (Minerva OS).
Tu rédiges du contenu de qualité supérieure (SOPs, briefs de projet, posts LinkedIn, emails de prospection, plans d'action, spécifications techniques).

Consignes de rédaction :
- Langue : ${language === 'en' ? 'Anglais' : language === 'de' ? 'Allemand' : 'Français'}
- Ton : ${tone === 'friendly' ? 'Amical et engageant' : tone === 'persuasive' ? 'Persuasif et percutant' : tone === 'casual' ? 'Décontracté' : 'Professionnel et structuré'}
- Longueur : ${length === 'short' ? 'Court, concis et direct' : length === 'long' ? 'Détaillé, approfondi et complet' : 'Équilibré et actionnable'}
- Format : ${format}
- Utilise des titres clairs, des listes à puces et des étapes séquencées si pertinent.
- Ne rajoute pas de bavardage introductif inutile ("Voici votre document :"). Produis directement le contenu prêt à l'emploi.`;

    const userMessage = `${context ? `## Contexte & Données de référence :\n${context}\n\n` : ''}## Demande de rédaction :\n${prompt}`;

    const text = await generateCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 3500,
      userId: user.id,
    });

    return NextResponse.json({ text, success: true });
  } catch (error) {
    console.error('Error in /api/ai/generate:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
