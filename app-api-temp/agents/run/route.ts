import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

interface LeadContext {
  businessName: string;
  contactName?: string | null;
  city?: string | null;
  niche?: string | null;
  website?: string | null;
}

function buildPrompt(agentId: string, lead: LeadContext, params: Record<string, string>): { system: string; user: string } {
  const city = lead.city || 'Montréal';
  const niche = lead.niche || 'commerce local';

  if (agentId === 'audit-gmb') {
    const mode = params.auditMode === 'deep' ? 'analyse complète (tous les facteurs)' : 'scan rapide (facteurs principaux)';
    return {
      system: `Tu es un expert SEO local spécialisé dans les fiches Google My Business pour les commerces québécois.
Tu génères des rapports d'audit précis, actionables et localisés pour le marché de ${city}.
Le rapport doit être structuré en Markdown, avec un score GMB sur 100, et des recommandations prioritaires concrètes.
Utilise des données réalistes basées sur le secteur « ${niche} » à ${city}.
Ne dis jamais que tu n'as pas accès aux données — génère un rapport simulé basé sur les patterns typiques du secteur.`,
      user: `Génère un rapport d'audit GMB en mode « ${mode} » pour :

**Entreprise :** ${lead.businessName}
**Secteur :** ${niche}
**Ville :** ${city}
**Contact :** ${lead.contactName || 'N/A'}
**Site web :** ${lead.website || 'N/A'}

Structure ton rapport ainsi :
# Audit GMB — ${lead.businessName}
**Score GMB :** X/100
**Mode :** ${mode}
**Date :** ${new Date().toLocaleDateString('fr-CA')}

## État de la fiche
(5-7 points avec ✅ ⚠️ ❌)

## Avis clients
(note estimée, taux de réponse, tendances)

## Recommandations prioritaires
(3-5 actions classées par impact)

## 💡 Opportunité terrain
(1 insight spécifique à exploiter pour la prospection)`,
    };
  }

  if (agentId === 'radar-reputation') {
    const source = params.reviewSource === 'google' ? 'Google Maps' : params.reviewSource === 'yelp' ? 'Yelp' : 'Facebook';
    return {
      system: `Tu es un spécialiste de l'e-réputation pour les commerces québécois.
Tu analyses la présence en ligne et génères des rapports de réputation détaillés avec des templates de réponse aux avis adaptés au marché francophone québécois.
Utilise des données réalistes pour le secteur « ${niche} » à ${city}.`,
      user: `Génère un rapport de réputation pour :

**Entreprise :** ${lead.businessName}
**Secteur :** ${niche}
**Ville :** ${city}
**Plateforme analysée :** ${source}

Structure ton rapport ainsi :
# Radar Réputation — ${lead.businessName}
**Source :** ${source}
**Note estimée :** X.X/5 étoiles (N avis)
**Sentiment :** (positif/mitigé/négatif avec emoji)

## Points critiques identifiés
(3-4 points avec ⚠️ ✅)

## 💬 Template réponse avis positif (5 ⭐)
(réponse adaptée au commerce)

## ⚠️ Template réponse avis négatif (1-2 ⭐)
(réponse professionnelle et empathique)

## 🤝 Template réponse avis mitigé (3 ⭐)
(réponse constructive)

## 📈 Plan d'action 30 jours
(3 actions concrètes)`,
    };
  }

  // Generic user-created agent
  const agentName = params.agentName || 'Agent personnalisé';
  const agentPrompt = params.agentPrompt || 'Tu es un assistant commercial utile.';
  return {
    system: agentPrompt,
    user: `Analyse le profil de ce prospect et génère un résultat utile pour la prospection :

**Entreprise :** ${lead.businessName}
**Secteur :** ${niche}
**Ville :** ${city}
**Contact :** ${lead.contactName || 'N/A'}

Agent : ${agentName}`,
  };
}

async function callAI(system: string, userPrompt: string, settings: Record<string, string>): Promise<string> {
  return generateCompletion({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    settings: {
      ai_provider: settings.ai_provider,
      ai_model: settings.ai_model,
      openrouter_key: settings.openrouter_key,
    },
    maxTokens: 1500,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { agentId, lead, params = {} } = body as {
      agentId: string;
      lead: LeadContext;
      params?: Record<string, string>;
    };

    if (!agentId || !lead?.businessName) {
      return NextResponse.json({ error: 'agentId and lead.businessName required' }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('ai_provider, ai_model, openrouter_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const { system, user: userPrompt } = buildPrompt(agentId, lead, params);
    const report = await callAI(system, userPrompt, (settings as Record<string, string>) || {});

    // Extract score from GMB report (# Audit GMB … **Score GMB :** N/100)
    let score: number | null = null;
    if (agentId === 'audit-gmb') {
      const m = report.match(/\*\*Score GMB\s*:\*\*\s*(\d+)/i);
      if (m) score = parseInt(m[1], 10);
    }

    return NextResponse.json({ report, score });
  } catch (err) {
    console.error('[agents/run]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
