import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

export interface WebsiteSection {
  id: string;
  type: 'hero' | 'services' | 'testimonials' | 'faq' | 'cta';
  title: string;
  content: WebsiteSectionContent;
}

interface HeroContent {
  headline: string;
  subheadline: string;
  cta: string;
  ctaSecondary?: string;
  badge?: string;
}

interface ServiceCard {
  name: string;
  description: string;
  price?: string;
  icon?: string;
}

interface Testimonial {
  name: string;
  role: string;
  company: string;
  text: string;
  rating: number;
}

interface FAQ {
  question: string;
  answer: string;
}

interface CTAContent {
  headline: string;
  subtext: string;
  buttonText: string;
}

type WebsiteSectionContent = HeroContent | ServiceCard[] | Testimonial[] | FAQ[] | CTAContent;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    businessName,
    niche,
    city,
    description,
    services: existingServices,
    tone = 'professional',
    language = 'fr',
    targetAudience,
  } = await req.json();

  if (!businessName && !niche) {
    return NextResponse.json({ error: 'businessName ou niche requis' }, { status: 400 });
  }

  const toneMap: Record<string, string> = {
    professional: 'professionnel, sérieux et expert',
    casual: 'décontracté, chaleureux et proche',
    modern: 'moderne, dynamique et innovant',
  };
  const toneDesc = toneMap[tone] || 'professionnel';

  const langDesc = language === 'fr' ? 'Rédige en français québécois naturel.' : 'Write in clear Canadian English.';

  const prompt = `Tu es un expert en copywriting et web design. Génère une structure de site web complète pour :

Business : ${businessName || 'une entreprise locale'}
Secteur : ${niche || 'services locaux'}
Ville : ${city || ''}
Description : ${description || ''}
Services existants : ${existingServices || ''}
Audience cible : ${targetAudience || 'clients locaux'}
Ton : ${toneDesc}
${langDesc}

Génère en JSON strict (sans markdown) :
{
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "title": "Section Hero",
      "content": {
        "badge": "Texte du badge optionnel (ex: #1 en Montréal ou Nouveau !)",
        "headline": "Titre principal accrocheur (max 10 mots, impact fort)",
        "subheadline": "Sous-titre explicatif (1-2 phrases, propose la valeur clé)",
        "cta": "Texte du bouton principal",
        "ctaSecondary": "Texte du bouton secondaire"
      }
    },
    {
      "id": "services",
      "type": "services",
      "title": "Nos Services",
      "content": [
        { "name": "Nom du service", "description": "Description 1-2 phrases", "price": "À partir de X$ ou null", "icon": "emoji" },
        { "name": "...", "description": "...", "price": "...", "icon": "emoji" },
        { "name": "...", "description": "...", "price": "...", "icon": "emoji" },
        { "name": "...", "description": "...", "price": "...", "icon": "emoji" },
        { "name": "...", "description": "...", "price": "...", "icon": "emoji" }
      ]
    },
    {
      "id": "testimonials",
      "type": "testimonials",
      "title": "Ce que disent nos clients",
      "content": [
        { "name": "Prénom Nom", "role": "Titre", "company": "Entreprise", "text": "Témoignage 2-3 phrases naturelles et crédibles", "rating": 5 },
        { "name": "...", "role": "...", "company": "...", "text": "...", "rating": 5 },
        { "name": "...", "role": "...", "company": "...", "text": "...", "rating": 5 }
      ]
    },
    {
      "id": "faq",
      "type": "faq",
      "title": "Questions fréquentes",
      "content": [
        { "question": "Question 1 ?", "answer": "Réponse complète et rassurante." },
        { "question": "Question 2 ?", "answer": "..." },
        { "question": "Question 3 ?", "answer": "..." },
        { "question": "Question 4 ?", "answer": "..." },
        { "question": "Question 5 ?", "answer": "..." }
      ]
    },
    {
      "id": "cta",
      "type": "cta",
      "title": "Appel à l'action",
      "content": {
        "headline": "Titre incitatif (urgence ou bénéfice)",
        "subtext": "1 phrase qui lève les dernières objections",
        "buttonText": "Texte du bouton CTA final"
      }
    }
  ]
}`;

  try {
    const aiResponse = await generateCompletion({
      messages: [{ role: 'user', content: prompt }],
      system: 'Tu es un expert en copywriting. Génère uniquement du JSON valide, sans markdown, sans backticks, sans commentaires.',
    });

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Génération échouée — réponse IA invalide' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      ok: true,
      businessName,
      niche,
      sections: parsed.sections || [],
    });
  } catch (e) {
    console.error('[generate-website] error:', e);
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 });
  }
}
