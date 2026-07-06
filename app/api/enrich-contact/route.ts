import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { generateCompletion } from '@/lib/ai';

function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

function extractDomain(website: string): string | null {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function generateEmailSuggestions(domain: string, contactName?: string): string[] {
  const emails: string[] = [];
  emails.push(`info@${domain}`);
  emails.push(`contact@${domain}`);
  emails.push(`bonjour@${domain}`);

  if (contactName) {
    const parts = contactName.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      const [first, last] = parts;
      emails.push(`${first}.${last}@${domain}`);
      emails.push(`${first}@${domain}`);
      emails.push(`${first[0]}${last}@${domain}`);
    }
  }

  return [...new Set(emails)];
}

// Firecrawl scrape (clean markdown of main content)
async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizeUrl(url), formats: ['markdown'], onlyMainContent: true }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const md: string = data?.data?.markdown || data?.markdown || '';
    return md.slice(0, 4000) || null;
  } catch {
    return null;
  }
}

// Fallback: fetch the raw HTML and strip tags to plain text
async function scrapePlain(url: string): Promise<string | null> {
  try {
    const res = await fetch(normalizeUrl(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinervaBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const combined = [title, metaDesc, text].filter(Boolean).join('. ');
    return combined.slice(0, 4000) || null;
  } catch {
    return null;
  }
}

function computeFitScore(data: {
  website?: string;
  rating?: number;
  reviewsCount?: number;
  socialLinks?: Record<string, string>;
  photos?: string[];
}): number {
  let score = 0;
  if (data.website) score += 25;
  if (data.rating) {
    if (data.rating >= 4.5) score += 15;
    else if (data.rating >= 4.0) score += 12;
    else if (data.rating >= 3.5) score += 8;
    else score += 4;
  }
  if (data.reviewsCount) {
    if (data.reviewsCount >= 100) score += 20;
    else if (data.reviewsCount >= 50) score += 15;
    else if (data.reviewsCount >= 20) score += 10;
    else if (data.reviewsCount >= 5) score += 5;
  }
  if (data.socialLinks && Object.keys(data.socialLinks).length > 0) score += 20;
  if (data.photos && data.photos.length > 0) score += 10;
  const bonus = data.website && data.socialLinks && Object.keys(data.socialLinks).length > 1 ? 10 : 0;
  return Math.min(100, score + bonus);
}

function computeIntentScore(data: {
  rating?: number;
  reviewsCount?: number;
  niche?: string;
}): number {
  let score = 30;
  if (data.rating && data.rating < 4.0) score += 25;
  else if (data.rating && data.rating < 4.5) score += 15;
  if (data.reviewsCount) {
    if (data.reviewsCount < 10) score += 20;
    else if (data.reviewsCount < 30) score += 10;
  }
  const highIntentNiches = ['restaurant', 'café', 'coiffeur', 'esthétique', 'dentiste', 'médecin', 'plombier', 'électricien', 'notaire', 'comptable'];
  if (data.niche && highIntentNiches.some(n => data.niche!.toLowerCase().includes(n))) score += 20;
  return Math.min(100, score);
}

function computeOpportunityScore(data: {
  website?: string;
  rating?: number;
  reviewsCount?: number;
  hasManagerEmail: boolean;
  hasManagerName: boolean;
}): number {
  let score = 25; // Base opportunity

  if (!data.website) {
    score += 30;
  } else {
    if (!data.hasManagerEmail) {
      score += 15;
    }
  }

  if (data.rating !== undefined) {
    if (data.rating < 3.5) {
      score += 25;
    } else if (data.rating < 4.2) {
      score += 15;
    }
  } else {
    score += 10;
  }

  if (data.reviewsCount !== undefined) {
    if (data.reviewsCount < 10) {
      score += 20;
    } else if (data.reviewsCount < 50) {
      score += 10;
    }
  } else {
    score += 10;
  }

  if (!data.hasManagerName) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

export async function POST(req: NextRequest) {
  try {
    const { leadId, website, businessName, contactName, city, niche, rating, reviewsCount, socialLinks, photos } = await req.json();

    const domain = website ? extractDomain(website) : null;
    let suggestedEmails = domain ? generateEmailSuggestions(domain, contactName) : [];
    const fitScore = computeFitScore({ website, rating, reviewsCount, socialLinks, photos });
    const intentScore = computeIntentScore({ rating, reviewsCount, niche });

    let websiteContent: string | null = null;
    if (website) {
      websiteContent = (await scrapeWithFirecrawl(website)) || (await scrapePlain(website));
    }

    let decisionMakerName = contactName || '';
    let decisionMakerRole = 'Propriétaire';
    let websiteDescription = '';
    let companyVibe = 'Local & Authentique';
    let foundEmail = '';

    // Fetch settings for AI API
    let settings = null;
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { data: dbSettings } = await supabase
          .from('settings')
          .select('ai_provider, ai_model, openrouter_key')
          .eq('user_id', user.id)
          .maybeSingle();
        settings = dbSettings;
      }
    } catch (err) {
      console.warn('[enrich-contact] Failed loading user settings:', err);
    }

    // AI Analysis of Website Content (if scraped)
    if (websiteContent) {
      try {
        const prompt = `Tu es un expert en prospection B2B et en scraping.
Voici le contenu extrait du site web de l'entreprise "${businessName || 'cette entreprise'}" :
"""${websiteContent}"""

Analyse le texte ci-dessus et extrais les informations suivantes au format JSON strict (sans markdown, sans enrobage) :
{
  "managerName": "Nom et prénom du gérant, propriétaire, président ou fondateur s'il est mentionné dans le texte. Laisse vide si aucun nom précis de responsable n'apparaît.",
  "managerRole": "Son rôle exact (ex: Propriétaire, Directeur, Gérant, Fondateur, etc.). Par défaut 'Gérant' ou 'Propriétaire'.",
  "managerEmail": "L'adresse email du gérant ou une adresse de contact nominative de l'équipe s'il y en a une, sinon une adresse générale comme info@... ou contact@... trouvée dans le texte.",
  "companyVibe": "La 'vibe' ou l'image de marque de l'entreprise en quelques mots clés en français (ex: Familial & Chaleureux, Moderne & Dynamique, Écologique & Local, Premium & Haut de gamme, etc.)",
  "description": "Une description commerciale concise (3 phrases max) en français de l'entreprise."
}

Réponds uniquement avec le JSON strict.`;

        const text = await generateCompletion({
          messages: [{ role: 'user', content: prompt }],
          settings: settings || undefined,
          jsonMode: true,
          maxTokens: 500,
          userId: userId || undefined,
        });

        const parsed = JSON.parse(text);
        if (parsed.managerName) decisionMakerName = parsed.managerName;
        if (parsed.managerRole) decisionMakerRole = parsed.managerRole;
        if (parsed.companyVibe) companyVibe = parsed.companyVibe;
        if (parsed.description) websiteDescription = parsed.description;
        if (parsed.managerEmail) {
          foundEmail = parsed.managerEmail;
          suggestedEmails = [foundEmail, ...suggestedEmails.filter(e => e !== foundEmail)];
        }
      } catch (err) {
        console.warn('[enrich-contact] AI analysis of website failed:', err);
      }
    } else {
      // AI Guessing if no website is present
      try {
        const prompt = `Tu es un expert en prospection locale.
Business: "${businessName}" — Niche: "${niche || 'non précisé'}" — Ville: "${city || 'non précisée'}"

Génère en JSON strict (sans markdown, sans enrobage) le décideur probable de ce business local et sa vibe estimée :
{
  "managerName": "",
  "managerRole": "Propriétaire",
  "managerEmail": "",
  "companyVibe": "Local & Chaleureux",
  "description": "${businessName} est une entreprise locale spécialisée dans le secteur de ${niche || 'services'} à ${city || 'Québec'}."
}

Réponds uniquement avec le JSON.`;

        const text = await generateCompletion({
          messages: [{ role: 'user', content: prompt }],
          settings: settings || undefined,
          jsonMode: true,
          maxTokens: 200,
          userId: userId || undefined,
        });

        const parsed = JSON.parse(text);
        if (parsed.managerRole) decisionMakerRole = parsed.managerRole;
        if (parsed.companyVibe) companyVibe = parsed.companyVibe;
        if (parsed.description) websiteDescription = parsed.description;
      } catch (err) {
        console.warn('[enrich-contact] AI guessing failed:', err);
      }
    }

    // Compute Accurate Opportunity Score
    const opportunityScore = computeOpportunityScore({
      website,
      rating,
      reviewsCount,
      hasManagerEmail: !!foundEmail || suggestedEmails.length > 0,
      hasManagerName: !!decisionMakerName,
    });

    // Generate Custom Calling Pitch adhering to Quebec 2026 guidelines
    let customPitch = '';
    try {
      const pitchPrompt = `Tu es un expert en outreach commercial au Québec en 2026.
Génère un script d'appel (pitch de vente téléphonique) ultra-court, direct et pertinent pour ce prospect.

Données du prospect :
- Entreprise : ${businessName}
- Niche : ${niche || 'Services'}
- Ville : ${city || 'Québec'}
- Décideur : ${decisionMakerName || 'Gérant'} (${decisionMakerRole || 'Responsable'})
- Vibe de l'entreprise : ${companyVibe}
- Fiche Google : ${rating !== undefined ? `Note de ${rating}/5 avec ${reviewsCount || 0} avis` : 'Pas d\'informations'}
- Description de l'activité : ${websiteDescription}

Directives pour le Québec en 2026 :
1. Ton & Style : Français québécois professionnel et naturel. Sans formule de politesse bateau ou jargon marketing pompeux de France. Direct, court et très respectueux du temps du prospect.
2. Structure du pitch :
   - Salutations courtes et présentation (ex: "Bonjour, c'est [Moi] de [Agence]...").
   - Déclencheur clair / Raison d'appel (ex: "J'ai vu que votre fiche Google n'était pas optimisée..." ou "J'ai visité votre site et remarqué que...").
   - Proposition de valeur / Solution au problème concret.
   - Question de clôture simple / Appel à l'action unique (ex: "Est-ce qu'on peut s'en parler 5 à 10 minutes cette semaine ?").
3. Durée : Moins de 45 secondes à lire. Pas d'asterisks (*) ou de balises markdown dans le texte final.

Génère UNIQUEMENT le texte final du pitch, sans titres de section ni balises markdown.`;

      customPitch = await generateCompletion({
        messages: [{ role: 'user', content: pitchPrompt }],
        settings: settings || undefined,
        maxTokens: 400,
        userId: userId || undefined,
      });
      // Replace markdown asterisks just in case
      customPitch = customPitch.replace(/\*/g, '').trim();
    } catch (err) {
      console.warn('[enrich-contact] AI custom pitch generation failed:', err);
      customPitch = `Bonjour ${decisionMakerName || 'le gérant'}, je suis passé devant ${businessName} et j'ai vu que vous offriez d'excellents services de ${niche || 'proximité'} à ${city || 'Québec'}. J'aimerais vous proposer mes services pour vous aider à optimiser votre visibilité locale et obtenir plus de clients. Est-ce qu'on pourrait s'en parler 5 minutes cette semaine ?`;
    }

    // Direct Database Insert for Drafts
    if (leadId && userId) {
      try {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        // Fetch lead's workspace
        const { data: leadDb } = await admin
          .from('leads')
          .select('workspace_id, user_id')
          .eq('id', leadId)
          .maybeSingle();

        if (leadDb) {
          // Check if there is already an AI-generated call pitch draft to avoid duplication, or insert new one
          await admin.from('drafts').insert({
            lead_id: leadId,
            user_id: userId,
            workspace_id: leadDb.workspace_id,
            channel: 'Call',
            tone: 'Direct & Closer',
            content: customPitch,
            status: 'Draft'
          });

          // Also persist enriched fields on the lead record itself
          await admin.from('leads').update({
            decision_maker_name: decisionMakerName || null,
            decision_maker_role: decisionMakerRole || null,
            suggested_emails: suggestedEmails.length ? suggestedEmails : null,
            enriched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', leadId);
        }
      } catch (err) {
        console.warn('[enrich-contact] Failed saving call pitch draft in DB:', err);
      }
    }

    return NextResponse.json({
      suggestedEmails,
      fitScore,
      intentScore,
      opportunityScore,
      decisionMakerName,
      decisionMakerRole,
      websiteDescription,
      companyVibe,
      customPitch,
      foundEmail,
      domain,
    });
  } catch (err: any) {
    console.error('[enrich-contact] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
