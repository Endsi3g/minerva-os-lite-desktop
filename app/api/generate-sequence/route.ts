import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const client = new Anthropic();

interface SequenceStep {
  day: number;
  channel: 'Email' | 'Call' | 'LinkedIn' | 'SMS';
  objective: string;
  angle: string;
  tone: string;
  subject_hint?: string;
  body_hint?: string;
}

function buildSystemPrompt(): string {
  return `Tu es un expert en prospection commerciale B2B pour des agences web et marketing au Québec.
Tu génères des cadences de prospection structurées en JSON.
Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON valide (pas de texte avant/après, pas de markdown)
- Les channels valides sont : "Email", "Call", "LinkedIn", "SMS"
- Les jours doivent être croissants, le premier step est toujours jour 0
- Les templates et angles doivent être en FRANÇAIS
- Adapte le ton et l'intensité au type de campagne`;
}

function buildUserPrompt(
  personaDescription: string,
  campaignType: 'cold' | 'relance' | 'upsell',
  durationDays: number,
  intensity: 'light' | 'standard' | 'aggressive',
): string {
  const stepCounts = { light: 3, standard: 5, aggressive: 8 };
  const targetSteps = stepCounts[intensity];

  const campaignTypeDesc = {
    cold: 'prospection à froid (premier contact, pas de relation existante)',
    relance: 'relance de prospects qui n\'ont pas répondu à une première approche',
    upsell: 'montée en gamme pour des clients existants ou semi-qualifiés',
  }[campaignType];

  return `Génère une cadence de ${targetSteps} steps pour ce contexte :

Persona cible : ${personaDescription}
Type de campagne : ${campaignTypeDesc}
Durée totale : ${durationDays} jours
Intensité : ${intensity} (${targetSteps} steps)

Retourne un objet JSON avec cette structure exacte :
{
  "steps": [
    {
      "day": 0,
      "channel": "Email",
      "objective": "Capter l'attention et créer de la curiosité",
      "angle": "Audit SEO gratuit personnalisé",
      "tone": "Direct et percutant",
      "subject_hint": "Un angle d'objet d'email accrocheur",
      "body_hint": "2-3 lignes d'idée pour le corps du message"
    }
  ]
}

Conseils par intensité :
- light (3 steps) : email J0, call J3-5, email J7-10
- standard (5 steps) : email J0, call J3, email J7, LinkedIn J10, email final J14
- aggressive (8 steps) : mixe email/call/LinkedIn/SMS dès J0-J21, maximum de touchpoints`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      persona_description = 'PME locale au Québec cherchant à améliorer sa présence web',
      campaign_type = 'cold',
      duration_days = 21,
      intensity = 'standard',
    } = body;

    // Get user's AI key if available
    const { data: settings } = await supabase
      .from('settings')
      .select('anthropic_api_key')
      .eq('user_id', user.id)
      .single();

    const apiKey = (settings as { anthropic_api_key?: string } | null)?.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Aucune clé Anthropic configurée. Ajoutez votre clé dans les paramètres IA.' }, { status: 400 });
    }

    const anthropicClient = apiKey !== process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey })
      : client;

    const message = await anthropicClient.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(persona_description, campaign_type, duration_days, intensity),
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    let parsed: { steps: SequenceStep[] };
    try {
      // Strip potential markdown fences
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[generate-sequence] JSON parse error:', rawText);
      return NextResponse.json({ error: 'Réponse IA invalide — réessayez.' }, { status: 500 });
    }

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      return NextResponse.json({ error: 'Structure de réponse incorrecte' }, { status: 500 });
    }

    // Validate and normalize steps
    const validChannels = ['Email', 'Call', 'LinkedIn', 'SMS'] as const;
    const steps = parsed.steps.map((s, i) => ({
      day: typeof s.day === 'number' ? s.day : i * 3,
      channel: validChannels.includes(s.channel as (typeof validChannels)[number]) ? s.channel : 'Email',
      objective: s.objective || '',
      angle: s.angle || '',
      tone: s.tone || '',
      subject_hint: s.subject_hint || '',
      body_hint: s.body_hint || '',
    }));

    return NextResponse.json({ steps });
  } catch (err) {
    console.error('[generate-sequence]', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
