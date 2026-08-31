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

    const { text, instruction, options } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const action = options?.action || 'rephrase';
    const tone = options?.tone || 'professional';
    const language = options?.language || 'fr';

    let actionInstruction = instruction || '';
    if (!actionInstruction) {
      switch (action) {
        case 'shorter':
          actionInstruction = 'Raccourcis et condense ce texte pour le rendre plus direct, concis et percutant, sans perdre les informations clés.';
          break;
        case 'longer':
          actionInstruction = 'Développe et enrichis ce texte avec des arguments détaillés, des exemples concrets et des explications claires.';
          break;
        case 'fix_grammar':
          actionInstruction = 'Corrige toutes les fautes d\'orthographe, de grammaire, de ponctuation et de syntaxe en préservant le sens d\'origine.';
          break;
        case 'tone':
          actionInstruction = `Réécris ce texte en adoptant un ton ${
            tone === 'friendly' ? 'amical, chaleureux et engageant' :
            tone === 'persuasive' ? 'hautement persuasif, axé sur la valeur et l\'impact' :
            tone === 'casual' ? 'décontracté et accessible' :
            tone === 'commercial' ? 'commercial, orienté conversion et prise de décision' :
            'professionnel, élégant et soigné'
          }.`;
          break;
        case 'rephrase':
        default:
          actionInstruction = 'Améliore le style, la clarté et la fluidité de ce texte tout en gardant son message principal.';
          break;
      }
    }

    const systemPrompt = `Tu es un outil d'écriture et de réécriture de texte assisté par IA de type Notion AI (Minerva OS).
Tu réécris le texte fourni selon l'instruction reçue.

RÈGLES STRICTES :
- Ne renvoie AUCUNE formule de politesse ("Voici le texte..."), AUCUNE explication, et AUCUN bloc de code (\`\`\`).
- Renvoie UNIQUEMENT le texte réécrit, directement insérable dans un éditeur.
- Conserve le formatage Markdown (gras, listes) si le texte d'origine en possède.
- Langue de réponse : ${language === 'en' ? 'Anglais' : language === 'de' ? 'Allemand' : 'Français'}.`;

    const result = await generateCompletion({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${actionInstruction}\n\nTexte à modifier :\n"""\n${text}\n"""`,
        },
      ],
      maxTokens: 3500,
      userId: user.id,
    });

    return NextResponse.json({ text: result.trim(), success: true });
  } catch (error) {
    console.error('Error in /api/ai/rewrite:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
