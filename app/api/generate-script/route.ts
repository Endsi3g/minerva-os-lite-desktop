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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { businessName, niche, city, website, websiteDescription, phone, rating, reviewsCount, temperature, contactName, notes } = body;

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
      siteContent ? `\n\nContexte entreprise (site web):\n${siteContent}` : '',
    ].filter(Boolean);

    const systemPrompt = `Tu es un expert en vente B2B locale. Tu génères des scripts de pitch courts et percutants pour des visites terrain ou des appels à froid.
Le script doit:
- Être en français naturel et conversationnel
- Durer max 60-90 secondes à l'oral
- Inclure: accroche personnalisée → valeur proposition → question d'ouverture
- Utiliser les données du prospect pour personnaliser
- Terminer par une question concrète pour prendre un RDV

Format de sortie: 3 sections distinctes avec titres (🎯 Accroche, 💡 Valeur, ❓ Question de clôture)`;

    const { data: settings } = await supabase
      .from('settings')
      .select('ai_provider, ai_model, openrouter_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const script = await generateCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Génère un script de pitch pour ce prospect:\n\n${contextParts.join('\n')}` }],
      settings: settings || undefined,
      maxTokens: 600,
    });

    return NextResponse.json({
      script,
      scraped: !!siteContent,
      websiteUsed: !!siteContent ? website : null,
    });
  } catch (err) {
    console.error('[generate-script]', err);
    return NextResponse.json({ error: 'Script generation failed' }, { status: 500 });
  }
}
