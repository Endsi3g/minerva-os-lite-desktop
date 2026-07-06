export function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

// Firecrawl scrape (clean markdown of main content)
export async function scrapeWithFirecrawl(url: string): Promise<string | null> {
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
export async function scrapePlain(url: string): Promise<string | null> {
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

// Common call pattern used everywhere a single page needs scraping: Firecrawl first
// (cleaner markdown extraction), plain HTML fetch as a fallback if Firecrawl is
// unconfigured or fails.
export async function scrapeWebsite(url: string): Promise<string | null> {
  return (await scrapeWithFirecrawl(url)) || (await scrapePlain(url));
}

// Discovers same-domain internal links whose path matches one of the given keywords
// (e.g. 'about'/'a-propos'/'contact') by fetching the homepage's raw HTML directly —
// independent of whichever method scraped the content, since scrapePlain strips all
// tags (losing hrefs) and Firecrawl's markdown link syntax isn't reliable enough to
// depend on. Used to go deeper on the lead's own site when the homepage alone doesn't
// yield enough information — never queries an external search engine.
export async function discoverInternalLinks(
  homepageUrl: string,
  keywords: string[],
  maxLinks = 2,
): Promise<string[]> {
  try {
    const res = await fetch(normalizeUrl(homepageUrl), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinervaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const base = new URL(normalizeUrl(homepageUrl));
    const baseHost = base.hostname.replace(/^www\./, '');

    const hrefMatches = [...html.matchAll(/<a\s+[^>]*href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
    const candidates = new Map<string, string>();

    for (const href of hrefMatches) {
      try {
        const abs = new URL(href, base).toString();
        const u = new URL(abs);
        if (u.hostname.replace(/^www\./, '') !== baseHost) continue;
        const path = u.pathname.toLowerCase();
        if (keywords.some((k) => path.includes(k)) && !candidates.has(abs)) {
          candidates.set(abs, path);
        }
      } catch {
        // skip malformed hrefs (mailto:, tel:, javascript:, etc.)
      }
    }

    return [...candidates.keys()].slice(0, maxLinks);
  } catch {
    return [];
  }
}
