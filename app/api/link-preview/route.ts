import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

function isPrivateUrl(u: URL): boolean {
  const h = u.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.endsWith('.local') ||
    /^169\.254\./.test(h) ||   // link-local (AWS/GCP metadata)
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url requis' }, { status: 400 });

  try {
    const targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol) || isPrivateUrl(targetUrl)) {
      return NextResponse.json({ error: 'URL non autorisée' }, { status: 400 });
    }
    const domain = targetUrl.hostname.replace('www.', '');

    // Fetch the page with a 5s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Minerva/1.0 (link preview bot)' },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // Extract meta tags
    const getMetaContent = (name: string) => {
      const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim();
      }
      return null;
    };

    const title =
      getMetaContent('og:title') ||
      getMetaContent('twitter:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      domain;

    const description =
      getMetaContent('og:description') ||
      getMetaContent('twitter:description') ||
      getMetaContent('description') ||
      null;

    const image =
      getMetaContent('og:image') ||
      getMetaContent('twitter:image') ||
      null;

    return NextResponse.json({
      url,
      domain,
      title,
      description,
      image,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    });

  } catch (err: any) {
    const domain = (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url; } })();
    return NextResponse.json({
      url,
      domain,
      title: domain,
      description: null,
      image: null,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    });
  }
}
