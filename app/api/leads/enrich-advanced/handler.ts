import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

function getFaviconUrl(website: string): string {
  try {
    const url = new URL(normalizeUrl(website));
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch {
    return '';
  }
}

function detectTechStack(html: string): string[] {
  const stack: string[] = [];
  const checks: [RegExp, string][] = [
    [/wp-content|wordpress/i, 'WordPress'],
    [/shopify/i, 'Shopify'],
    [/wix\.com|wixsite/i, 'Wix'],
    [/squarespace/i, 'Squarespace'],
    [/webflow/i, 'Webflow'],
    [/notion\.site/i, 'Notion'],
    [/__next|_next\/static/i, 'Next.js'],
    [/gatsby/i, 'Gatsby'],
    [/react|reactdom/i, 'React'],
    [/vue\.js|vuejs/i, 'Vue.js'],
    [/gtag|google-analytics|analytics\.js/i, 'Google Analytics'],
    [/hubspot/i, 'HubSpot'],
    [/mailchimp/i, 'Mailchimp'],
    [/intercom/i, 'Intercom'],
    [/stripe/i, 'Stripe'],
    [/calendly/i, 'Calendly'],
    [/tidio|tidiochat/i, 'Tidio'],
    [/bootstrap/i, 'Bootstrap'],
    [/tailwind/i, 'Tailwind CSS'],
  ];
  for (const [regex, name] of checks) {
    if (regex.test(html)) stack.push(name);
  }
  return [...new Set(stack)].slice(0, 8);
}

function computeWebPresenceScore(data: {
  website?: string;
  rating?: number;
  reviewsCount?: number;
  socialLinks?: Record<string, string>;
  techStack?: string[];
}): number {
  let score = 0;
  if (data.website) score += 20;
  if (data.rating && data.rating >= 4) score += 15;
  if (data.reviewsCount) {
    if (data.reviewsCount >= 50) score += 20;
    else if (data.reviewsCount >= 10) score += 12;
    else score += 5;
  }
  if (data.socialLinks) {
    const count = Object.keys(data.socialLinks).length;
    score += Math.min(25, count * 8);
  }
  if (data.techStack) {
    if (data.techStack.includes('Google Analytics')) score += 10;
    if (data.techStack.some(t => ['HubSpot', 'Intercom', 'Mailchimp'].includes(t))) score += 10;
  }
  return Math.min(100, score);
}

async function scrapeHtml(url: string): Promise<string> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizeUrl(url), formats: ['html', 'markdown'], onlyMainContent: false }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        return (data?.data?.html || data?.html || data?.data?.markdown || data?.markdown || '').slice(0, 8000);
      }
    } catch { /* fallback */ }
  }

  try {
    const res = await fetch(normalizeUrl(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinervaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return '';
    return (await res.text()).slice(0, 8000);
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, website, business_name, niche, city, website_description, reviews_count, rating, social_links')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const website = lead.website;
  const updates: Record<string, unknown> = {
    enriched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Logo (favicon)
  if (website) {
    updates['enriched_logo'] = getFaviconUrl(website);
  }

  // Scrape HTML for tech stack detection
  let html = '';
  if (website) {
    html = await scrapeHtml(website);
    const stack = detectTechStack(html);
    if (stack.length > 0) {
      updates['tech_stack'] = JSON.stringify(stack);
    }
  }

  // Web presence score
  const webPresence = computeWebPresenceScore({
    website: lead.website,
    rating: lead.rating,
    reviewsCount: lead.reviews_count,
    socialLinks: lead.social_links ? (typeof lead.social_links === 'string' ? JSON.parse(lead.social_links) : lead.social_links) : {},
    techStack: html ? detectTechStack(html) : [],
  });
  updates['web_presence_score'] = webPresence;

  // Company size estimate using AI
  const contextForAI = [
    lead.business_name,
    lead.niche,
    lead.city,
    lead.website_description,
    lead.reviews_count ? `${lead.reviews_count} avis` : null,
    html ? html.slice(0, 2000) : null,
  ].filter(Boolean).join('. ');

  if (contextForAI.length > 20) {
    try {
      const aiResponse = await generateCompletion({
        messages: [{ role: 'user', content: `Estime la taille de cette entreprise : ${contextForAI}. Réponds UNIQUEMENT en JSON: {"size": "solo"|"small"|"medium"|"large", "reason": "courte explication"}` }],
        system: 'Tu es un expert en analyse d\'entreprises. Réponds uniquement en JSON valide.',
      });
      const match = aiResponse.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (['solo', 'small', 'medium', 'large'].includes(parsed.size)) {
          updates['company_size_estimate'] = parsed.size;
        }
      }
    } catch { /* silent */ }
  }

  // Save to Supabase — gracefully degrade if new columns don't exist yet (migration pending)
  const { error: updateErr } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId);

  if (updateErr) {
    // Fallback: try with only base columns that definitely exist
    const baseUpdates = { updated_at: updates['updated_at'] };
    const { error: fallbackErr } = await supabase.from('leads').update(baseUpdates).eq('id', leadId);
    if (fallbackErr) {
      console.error('[enrich-advanced] fallback update failed:', fallbackErr.message);
    }
    // Return computed data anyway so UI can still display results
  }

  return NextResponse.json({
    ok: true,
    enrichedLogo: updates['enriched_logo'] || null,
    techStack: updates['tech_stack'] || null,
    webPresenceScore: updates['web_presence_score'] ?? null,
    companySizeEstimate: updates['company_size_estimate'] || null,
    enrichedAt: updates['enriched_at'],
    savedToDb: !updateErr,
  });
}
