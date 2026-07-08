import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { generateCompletion } from '@/lib/ai';
import { scrapeWebsite, discoverInternalLinks } from '@/lib/website-scraper';

const DEEPER_CRAWL_KEYWORDS = [
  'about', 'a-propos', 'apropos', 'qui-sommes-nous',
  'services', 'contact', 'equipe', 'team', 'notre-histoire', 'histoire',
];
const ENRICHMENT_SUFFICIENT_THRESHOLD = 60;

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

// "Have we actually gathered enough to write a genuinely personalized message" — distinct
// from the opportunity/fit/intent heuristics above, which run regardless of scrape success.
function computeEnrichmentCompleteness(data: {
  hasWebsite: boolean;
  websiteScraped: boolean;
  websiteDescription: string;
  decisionMakerName: string;
  rating?: number;
  reviewsCount?: number;
  hasNamedEmail: boolean;
}): number {
  let score = 0;
  if (data.hasWebsite && data.websiteScraped) score += 30;
  if (data.websiteDescription && data.websiteDescription.length >= 80) score += 25;
  if (data.decisionMakerName) score += 20;
  if (data.rating !== undefined && (data.reviewsCount ?? 0) >= 3) score += 15;
  if (data.hasNamedEmail) score += 10;
  return Math.min(100, score);
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
      websiteContent = await scrapeWebsite(website);
    }

    let decisionMakerName = contactName || '';
    let decisionMakerRole = 'Propriétaire';
    let websiteDescription = '';
    let companyVibe = 'Local & Authentique';
    let foundEmail = '';

    // Fetch settings for AI API
    let settings: { ai_provider?: string | null; ai_model?: string | null; openrouter_key?: string | null } | null = null;
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

    async function analyzeWebsiteContent(content: string) {
      const prompt = `Tu es un expert en prospection B2B et en scraping.
Voici le contenu extrait du site web de l'entreprise "${businessName || 'cette entreprise'}" :
"""${content}"""

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
        // Un modèle de raisonnement (ex: Cloudflare Kimi K2) peut consommer
        // une bonne partie du budget en reasoning_content avant de produire
        // le JSON final — un plafond trop bas fait échouer l'appel entier
        // (voir lib/ai.ts callCloudflare, throw si content vide).
        maxTokens: 900,
        userId: userId || undefined,
      });
      return JSON.parse(text) as { managerName?: string; managerRole?: string; managerEmail?: string; companyVibe?: string; description?: string };
    }

    // AI Analysis of Website Content (if scraped)
    if (websiteContent) {
      try {
        const parsed = await analyzeWebsiteContent(websiteContent);
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
          maxTokens: 900,
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

    const hasNamedEmail = () => !!foundEmail || suggestedEmails.some(e => /^[a-z]+\.[a-z]+@/i.test(e));

    let enrichmentCompleteness = computeEnrichmentCompleteness({
      hasWebsite: !!website,
      websiteScraped: !!websiteContent,
      websiteDescription,
      decisionMakerName,
      rating,
      reviewsCount,
      hasNamedEmail: hasNamedEmail(),
    });

    // Homepage alone wasn't enough — go one level deeper on the SAME site (never an
    // external search engine): discover 1-2 same-domain pages (About/Contact/etc.),
    // scrape them, and re-run the extraction once with the combined content. Capped
    // at a single extra pass — this never loops further.
    if (enrichmentCompleteness < ENRICHMENT_SUFFICIENT_THRESHOLD && website) {
      try {
        const extraLinks = await discoverInternalLinks(website, DEEPER_CRAWL_KEYWORDS, 2);
        if (extraLinks.length > 0) {
          const extraContents = await Promise.all(extraLinks.map((url) => scrapeWebsite(url)));
          const combined = [websiteContent, ...extraContents.filter(Boolean)].filter(Boolean).join('\n\n---\n\n').slice(0, 10000);

          if (combined && combined !== websiteContent) {
            websiteContent = combined;
            const parsed = await analyzeWebsiteContent(combined);
            if (parsed.managerName) decisionMakerName = parsed.managerName;
            if (parsed.managerRole) decisionMakerRole = parsed.managerRole;
            if (parsed.companyVibe) companyVibe = parsed.companyVibe;
            if (parsed.description) websiteDescription = parsed.description;
            if (parsed.managerEmail) {
              foundEmail = parsed.managerEmail;
              suggestedEmails = [foundEmail, ...suggestedEmails.filter(e => e !== foundEmail)];
            }

            enrichmentCompleteness = computeEnrichmentCompleteness({
              hasWebsite: !!website,
              websiteScraped: !!websiteContent,
              websiteDescription,
              decisionMakerName,
              rating,
              reviewsCount,
              hasNamedEmail: hasNamedEmail(),
            });
          }
        }
      } catch (err) {
        console.warn('[enrich-contact] Deeper same-site crawl failed:', err);
      }
    }

    const enrichmentSufficient = enrichmentCompleteness >= ENRICHMENT_SUFFICIENT_THRESHOLD;

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
        maxTokens: 1000,
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

          // Also persist enriched fields on the lead record itself — decision_maker_role/
          // company_vibe/website_description/enrichment_* were computed above but never
          // persisted before, and decision_maker_role wasn't a tracked column at all
          // (an unknown-column update silently failed the whole write in some environments).
          await admin.from('leads').update({
            decision_maker_name: decisionMakerName || null,
            decision_maker_role: decisionMakerRole || null,
            company_vibe: companyVibe || null,
            website_description: websiteDescription || null,
            suggested_emails: suggestedEmails.length ? suggestedEmails : null,
            enrichment_completeness: enrichmentCompleteness,
            enrichment_sufficient: enrichmentSufficient,
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
      enrichmentCompleteness,
      enrichmentSufficient,
    });
  } catch (err: any) {
    console.error('[enrich-contact] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
