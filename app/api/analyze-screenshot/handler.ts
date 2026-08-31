import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

const KIND_PROMPTS: Record<string, string> = {
  website: "Cette capture montre le site web ou la fiche Google d'un prospect. Résume en 3-5 puces courtes ce qui est pertinent pour préparer un appel ou une visite de vente B2B locale : activité, positionnement, points forts/faibles visibles, signaux d'opportunité.",
  social: "Cette capture montre un profil ou une page réseaux sociaux d'un prospect. Résume en 3-5 puces courtes : activité récente, ton, signaux d'engagement, angles de personnalisation utiles pour l'appel.",
  conversation: "Cette capture montre un échange précédent (email, SMS, DM) avec un prospect. Résume en 3-5 puces courtes : ce qui a été dit, le ton, les objections ou intérêts exprimés, ce qu'il faut relancer.",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { imageDataUrl, kind, leadId } = body;

    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl (data URL image) requis' }, { status: 400 });
    }
    const promptKind = KIND_PROMPTS[kind] ? kind : 'website';

    const { data: settings } = await supabase
      .from('settings')
      .select('ai_provider, ai_model, openrouter_key, gemini_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const analysis = await generateCompletion({
      system: "Tu es un assistant de vente B2B qui analyse des captures d'écran pour préparer un appel ou une visite terrain. Réponds en français, en puces courtes et factuelles, sans blabla.",
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: KIND_PROMPTS[promptKind] },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      }],
      settings: settings || undefined,
      maxTokens: 500,
      userId: user.id,
    });

    return NextResponse.json({ analysis, kind: promptKind, leadId: leadId || null });
  } catch (err) {
    console.error('[analyze-screenshot]', err);
    const message = err instanceof Error ? err.message : 'Analyse impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
