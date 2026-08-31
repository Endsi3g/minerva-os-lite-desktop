import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

async function scrapeWebsite(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  try {
    const target = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target, formats: ['markdown'], onlyMainContent: true }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const md: string = data?.data?.markdown || data?.markdown || '';
    return md.slice(0, 3000) || null;
  } catch {
    return null;
  }
}

const FLOWCHART_SCHEMA_INSTRUCTIONS = `Réponds UNIQUEMENT avec un objet JSON (aucun texte hors JSON, pas de markdown) de cette forme :
{
  "nodes": [
    { "id": "hook", "type": "hook", "label": "Accroche", "text": "..." },
    { "id": "value", "type": "value", "label": "Valeur", "text": "..." },
    { "id": "obj1", "type": "objection", "label": "Objection probable", "text": "..." },
    { "id": "resp1", "type": "response", "label": "Réponse", "text": "..." },
    { "id": "closing", "type": "closing", "label": "Clôture", "text": "..." }
  ],
  "edges": [
    { "from": "hook", "to": "value" },
    { "from": "value", "to": "obj1" },
    { "from": "obj1", "to": "resp1" },
    { "from": "resp1", "to": "closing" },
    { "from": "value", "to": "closing" }
  ]
}
- "type" est toujours l'un de: hook, value, objection, response, closing.
- Prévois 2 à 3 branches "objection" → "response" distinctes issues du nœud "value", chacune reliée à "closing".
- "text" contient la phrase ou le point à dire, en français, court (1-2 phrases).`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      businessName, niche, city, website, websiteDescription, phone, rating, reviewsCount,
      temperature, contactName, notes,
      oneOffScript, templateStyle, format, screenshotAnalysis,
    } = body;

    const isFlowchart = format === 'flowchart';

    // Prefer a previously-scraped description; only re-scrape if none was provided
    const siteContent = websiteDescription || (website ? await scrapeWebsite(website) : null);

    const contextParts: string[] = [
      `Prospect: ${businessName}`,
      niche ? `Secteur: ${niche}` : '',
      city ? `Ville: ${city}` : '',
      contactName ? `Contact: ${contactName}` : '',
      rating !== undefined ? `Note Google: ${rating}/5 (${reviewsCount ?? '?'} avis)` : '',
      temperature ? `Température: ${temperature}` : '',
      phone ? `Téléphone: ${phone}` : '',
      website ? `Site web: ${website}` : '',
      notes?.length ? `Notes CRM: ${notes.slice(-2).map((n: { content: string }) => n.content).join(' | ')}` : '',
      screenshotAnalysis ? `\n\nAnalyse d'une capture d'écran fournie par l'utilisateur:\n${String(screenshotAnalysis).slice(0, 2000)}` : '',
      siteContent ? `\n\nContexte entreprise (site web):\n${siteContent}` : '',
    ].filter(Boolean);

    const baseRules = `- Être en français naturel et conversationnel
- Durer max 60-90 secondes à l'oral
- Inclure: accroche personnalisée → valeur proposition → question d'ouverture
- Utiliser les données du prospect pour personnaliser
- Terminer par une question concrète pour prendre un RDV`;

    const styleInstruction = templateStyle
      ? `\n\nStyle de référence à respecter (ton, structure, formulations) — NE PAS le recopier tel quel, t'en inspirer pour ce prospect précis:\n${String(templateStyle).slice(0, 4000)}`
      : '';

    let systemPrompt: string;
    let userPrompt: string;

    if (oneOffScript) {
      // The rep pasted their own script for this call — adapt it to the
      // current prospect rather than generating a new one from scratch.
      systemPrompt = `Tu es un expert en vente B2B locale. On te donne un script déjà écrit par le représentant — ton rôle est de l'ADAPTER et de le PERSONNALISER pour le prospect ci-dessous (remplacer les placeholders, ajuster les détails factuels), en gardant sa structure et son ton d'origine.${styleInstruction}`;
      userPrompt = `Script à adapter:\n${String(oneOffScript).slice(0, 6000)}\n\nProspect à qui l'adapter:\n${contextParts.join('\n')}`;
    } else {
      systemPrompt = `Tu es un expert en vente B2B locale. Tu génères des scripts de pitch courts et percutants pour des visites terrain ou des appels à froid.
Le script doit:
${baseRules}${styleInstruction}

${isFlowchart ? '' : 'Format de sortie: 3 sections distinctes avec titres (🎯 Accroche, 💡 Valeur, ❓ Question de clôture)'}`;
      userPrompt = `Génère un script de pitch pour ce prospect:\n\n${contextParts.join('\n')}`;
    }

    if (isFlowchart) {
      systemPrompt += `\n\n${FLOWCHART_SCHEMA_INSTRUCTIONS}`;
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('ai_provider, ai_model, openrouter_key, gemini_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const raw = await generateCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      settings: settings || undefined,
      jsonMode: isFlowchart,
      userId: user.id,
      // Un modèle de raisonnement (Cloudflare Kimi K2) peut consommer une
      // bonne partie du budget en reasoning_content avant de produire le
      // texte final — un plafond trop bas fait échouer l'appel entier.
      maxTokens: isFlowchart ? 1400 : 1000,
    });

    if (isFlowchart) {
      try {
        const flowchart = JSON.parse(raw);
        return NextResponse.json({
          flowchart,
          scraped: !!siteContent,
          websiteUsed: siteContent ? website : null,
        });
      } catch {
        return NextResponse.json({ error: 'Réponse IA invalide pour le mode graphique — réessaie.' }, { status: 502 });
      }
    }

    return NextResponse.json({
      script: raw,
      scraped: !!siteContent,
      websiteUsed: siteContent ? website : null,
    });
  } catch (err) {
    console.error('[generate-script]', err);
    return NextResponse.json({ error: 'Script generation failed' }, { status: 500 });
  }
}
