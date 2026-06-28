import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { leadId, section, amount } = await req.json();
    if (!leadId || !section) return NextResponse.json({ error: 'leadId and section required' }, { status: 400 });

    const [leadRes, settingsRes] = await Promise.all([
      supabase.from('leads').select('business_name, city, niche, website_description, decision_maker_name, contact_name, contact_email').eq('id', leadId).maybeSingle(),
      supabase.from('settings').select('full_name, company_name, ai_provider, ai_model, openrouter_key, groq_api_key, together_api_key').eq('user_id', user.id).maybeSingle(),
    ]);

    const lead = leadRes.data;
    const settings = settingsRes.data;

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const companyName = settings?.company_name || 'Notre agence';

    const prompts: Record<string, string> = {
      intro: `Rédige une présentation professionnelle en 3-4 phrases pour une proposition commerciale de ${companyName} adressée à ${lead.business_name} (${lead.niche}, ${lead.city}). Présente qui nous sommes et pourquoi nous les contactons. Ton direct, chaleureux, pas de jargon.`,
      problem: `Basé sur cette description du site web de ${lead.business_name}: "${lead.website_description || 'Entreprise ' + lead.niche + ' à ' + lead.city}". Identifie le principal défi ou problème business que cette entreprise pourrait avoir dans son secteur (${lead.niche}) et sa ville (${lead.city}). Sois spécifique et réaliste. 3-4 phrases maximum.`,
      solution: `Pour ${lead.business_name} (${lead.niche} à ${lead.city}), rédige une description de solution proposée en 4-5 phrases. Décris concrètement ce que ${companyName} peut faire pour résoudre leur problème. Mentionne les livrables clés, la méthodologie, et les résultats attendus. Sois concret et professionnel.`,
      terms: `Rédige des conditions générales claires pour une proposition commerciale${amount ? ` de ${Number(amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}` : ''}. Inclure: validité 30 jours, conditions de paiement (acompte 50%, solde à la livraison), délais de réalisation, révisions incluses. Format: liste de points courts et clairs. En français québécois professionnel.`,
    };

    const prompt = prompts[section];
    if (!prompt) return NextResponse.json({ error: 'Invalid section' }, { status: 400 });

    const content = await generateCompletion({
      system: `Tu es un expert en rédaction de propositions commerciales B2B en français québécois. Rédige du contenu professionnel, chaleureux et direct. Pas de markdown, pas de puces sauf si demandé. Écris directement le contenu sans introduction ni conclusion.`,
      messages: [{ role: 'user', content: prompt }],
      settings: settings ? {
        ai_provider: settings.ai_provider,
        ai_model: settings.ai_model,
        openrouter_key: settings.openrouter_key,
        groq_api_key: settings.groq_api_key,
        together_api_key: settings.together_api_key,
      } : undefined,
      maxTokens: 400,
      temperature: 0.7,
    });

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
