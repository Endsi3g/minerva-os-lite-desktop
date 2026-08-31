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

    const { text, targetLanguage = 'fr' } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const langNames: Record<string, string> = {
      fr: 'Français',
      en: 'Anglais (US / International)',
      de: 'Allemand',
      es: 'Espagnol',
      it: 'Italien',
    };

    const targetLangName = langNames[targetLanguage] || 'Français';

    const systemPrompt = `Tu es un traducteur professionnel expert B2B et tech (Minerva OS).
Traduis fidèlement le texte fourni vers la langue cible : ${targetLangName}.

RÈGLES STRICTES :
- Traduis avec un style fluide, naturel, idiomatique et professionnel.
- Conserve intégralement la structure Markdown (titres, listes à puces, gras, code, liens).
- Ne rajoute AUCUNE note du traducteur, ni d'explications ("Voici la traduction...").
- Renvoie UNIQUEMENT le texte traduit prêt à être inséré.`;

    const translatedText = await generateCompletion({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Texte à traduire vers ${targetLangName} :\n"""\n${text}\n"""`,
        },
      ],
      maxTokens: 3500,
      userId: user.id,
    });

    return NextResponse.json({
      translatedText: translatedText.trim(),
      targetLanguage,
      success: true,
    });
  } catch (error) {
    console.error('Error in /api/ai/translate:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
