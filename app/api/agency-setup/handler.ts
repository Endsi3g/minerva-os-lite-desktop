import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

async function scrapeWebsite(url: string): Promise<string> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizeUrl(url), formats: ['markdown'], onlyMainContent: true }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return (data?.data?.markdown || data?.markdown || '').slice(0, 6000);
      }
    } catch { /* fallback */ }
  }

  try {
    const res = await fetch(normalizeUrl(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinervaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
    return [ogTitle || title, ogDesc || metaDesc, text].filter(Boolean).join('. ');
  } catch {
    return '';
  }
}

function extractLogoUrl(html: string, baseUrl: string): string | null {
  try {
    const base = new URL(normalizeUrl(baseUrl));
    const patterns = [
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<img[^>]+class=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
      /<img[^>]+id=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
    ];
    for (const p of patterns) {
      const match = html.match(p);
      if (match?.[1]) {
        const href = match[1];
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return `https:${href}`;
        if (href.startsWith('/')) return `${base.origin}${href}`;
        return `${base.origin}/${href}`;
      }
    }
    return `https://www.google.com/s2/favicons?domain=${base.hostname}&sz=128`;
  } catch {
    return null;
  }
}

function extractColors(html: string): string[] {
  const colors: string[] = [];
  const hexMatches = html.match(/#([0-9a-fA-F]{3,6})\b/g) || [];
  const freq: Record<string, number> = {};
  for (const c of hexMatches) {
    const normalized = c.toLowerCase();
    if (normalized === '#fff' || normalized === '#ffffff' || normalized === '#000' || normalized === '#000000') continue;
    freq[normalized] = (freq[normalized] || 0) + 1;
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [color] of sorted) colors.push(color);
  return colors;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { websiteUrl } = await req.json();
  if (!websiteUrl) return NextResponse.json({ error: 'websiteUrl required' }, { status: 400 });

  // Scrape
  const content = await scrapeWebsite(websiteUrl);
  if (!content || content.length < 50) {
    return NextResponse.json({ error: 'Impossible de lire ce site. Vérifiez l\'URL.' }, { status: 422 });
  }

  // Fetch raw HTML for logo + colors
  let rawHtml = '';
  try {
    const res = await fetch(normalizeUrl(websiteUrl), { signal: AbortSignal.timeout(8000) });
    rawHtml = await res.text();
  } catch { /* silent */ }

  const logoUrl = extractLogoUrl(rawHtml, websiteUrl);
  const brandColors = extractColors(rawHtml);

  // AI extraction
  const prompt = `Voici le contenu d'un site web d'agence :
---
${content.slice(0, 4000)}
---

Extrait les informations en JSON strict, sans markdown. Format :
{
  "agencyName": "Nom de l'agence",
  "tagline": "Slogan ou proposition de valeur courte",
  "description": "Description de l'agence en 2-3 phrases",
  "services": [
    { "name": "Nom du service", "description": "Description courte", "price": "Prix si mentionné ou null" }
  ],
  "systemPrompt": "Tu es l'assistant IA de [agencyName]. Tu représentes cette agence qui propose [services]. Tu réponds au nom de l'agence avec un ton professionnel et orienté résultats. Voici ce que tu sais de l'agence : [description]. Aide les prospects à comprendre l'offre et à passer à l'action.",
  "targetAudience": "Qui sont les clients de cette agence",
  "city": "Ville ou région si mentionnée",
  "phone": "Téléphone si mentionné ou null",
  "email": "Email si mentionné ou null"
}`;

  let extracted: {
    agencyName?: string;
    tagline?: string;
    description?: string;
    services?: Array<{ name: string; description: string; price?: string | null }>;
    systemPrompt?: string;
    targetAudience?: string;
    city?: string;
    phone?: string | null;
    email?: string | null;
  } = {};

  try {
    const aiResponse = await generateCompletion({
      messages: [{ role: 'user', content: prompt }],
      system: 'Tu es un extracteur de données. Réponds UNIQUEMENT en JSON valide sans markdown ni backticks.',
    });
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    }
  } catch { /* silent — return what we have */ }

  // Save to settings
  const settingsUpdate: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (extracted.agencyName) settingsUpdate['company_name'] = extracted.agencyName;
  if (extracted.systemPrompt) settingsUpdate['ai_agency_prompt'] = extracted.systemPrompt;
  if (websiteUrl) settingsUpdate['agency_website'] = websiteUrl;
  if (brandColors.length) settingsUpdate['agency_brand_colors'] = JSON.stringify(brandColors);
  if (logoUrl) settingsUpdate['agency_logo_url'] = logoUrl;

  const { error: settingsErr } = await supabase
    .from('settings')
    .update(settingsUpdate)
    .eq('user_id', user.id);

  if (settingsErr) {
    // Columns may not exist yet — try minimal update
    await supabase.from('settings').update({ updated_at: new Date().toISOString() }).eq('user_id', user.id);
  }

  // Update workspace: name + logo (best effort)
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (workspace?.id) {
    const wUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (extracted.agencyName) wUpdates['name'] = extracted.agencyName;
    if (logoUrl) wUpdates['logo_base64'] = logoUrl; // store URL, sidebar shows as <img src>
    await supabase.from('workspaces').update(wUpdates).eq('id', workspace.id);

    // Save services catalog (price as number)
    if (extracted.services?.length) {
      for (const svc of extracted.services.slice(0, 10)) {
        let priceNum: number | null = null;
        if (svc.price) {
          const numMatch = svc.price.replace(/[\s$€£]/g, '').match(/[\d]+([.,]\d+)?/);
          if (numMatch) priceNum = parseFloat(numMatch[0].replace(',', '.'));
        }
        const { error: svcErr } = await supabase.from('services').upsert({
          workspace_id: workspace.id,
          name: svc.name,
          description: svc.description || '',
          price: priceNum,
          type: 'digital',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id,name', ignoreDuplicates: true });
        void svcErr;
      }
    }

    // Save logo to documents library (with imageUrl in content JSON)
    if (logoUrl) {
      const { error: docErr } = await supabase.from('documents').insert({
        user_id: user.id,
        workspace_id: workspace.id,
        title: `Logo — ${extracted.agencyName || 'Agence'}`,
        type: 'blank' as const,
        content: JSON.stringify({ imageUrl: logoUrl, assetType: 'agency_logo' }),
        is_shared: true,
        folder_name: 'Agence',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      void docErr;
    }
  }

  return NextResponse.json({
    ok: true,
    agencyName: extracted.agencyName,
    tagline: extracted.tagline,
    description: extracted.description,
    services: extracted.services || [],
    systemPrompt: extracted.systemPrompt,
    targetAudience: extracted.targetAudience,
    city: extracted.city,
    phone: extracted.phone,
    email: extracted.email,
    logoUrl,
    brandColors,
  });
}
