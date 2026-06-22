import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

const STATIC_SUGGESTIONS = [
  'Bonjour, merci pour votre retour. Je serais ravi d\'échanger avec vous. Seriez-vous disponible pour un appel de 15 minutes cette semaine ?',
  'Merci de votre réponse. Pourriez-vous me donner plus de détails sur vos besoins actuels afin que je puisse vous proposer la meilleure solution ?',
  'Bonjour, je comprends votre position. N\'hésitez pas à me recontacter si votre situation évolue ou si vous avez des questions.',
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { messages } = await req.json() as {
      messages: Array<{ from: string; body: string; date: string }>;
    };

    const { data: settings } = await supabase
      .from('settings')
      .select('ai_provider, ai_model, openrouter_key, groq_api_key, together_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    // Use the last 3 messages for context to keep tokens low
    const recentMessages = messages.slice(-3);
    const threadContext = recentMessages
      .map(m => `[${m.date}] ${m.from}:\n${m.body.slice(0, 500)}`)
      .join('\n\n---\n\n');

    try {
      const text = await generateCompletion({
        system: 'Tu es un assistant commercial expert en prospection B2B. Génère exactement 3 réponses email courtes et professionnelles en français, adaptées au contexte du fil de discussion. Réponds uniquement avec un tableau JSON de 3 chaînes de caractères, sans explications. Format: ["réponse1", "réponse2", "réponse3"]',
        messages: [
          {
            role: 'user',
            content: `Voici le fil de discussion :\n\n${threadContext}\n\nGénère 3 suggestions de réponse.`,
          },
        ],
        settings: settings || undefined,
        jsonMode: true,
        maxTokens: 600,
      });

      // Extract JSON array from response
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return NextResponse.json({ suggestions: STATIC_SUGGESTIONS });

      const suggestions: string[] = JSON.parse(match[0]);
      return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
    } catch (err) {
      console.warn("suggest-reply AI call failed, falling back to static suggestions:", err);
      return NextResponse.json({ suggestions: STATIC_SUGGESTIONS });
    }
  } catch (err) {
    console.error('POST /api/inbox/suggest-reply error:', err);
    return NextResponse.json({ suggestions: STATIC_SUGGESTIONS });
  }
}
