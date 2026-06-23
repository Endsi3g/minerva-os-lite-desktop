import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function extractInstagramUsername(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!u.hostname.includes('instagram.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

async function scrapeWithFirecrawl(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return '';
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['html'], onlyMainContent: false }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data?.data?.html || data?.html || '';
  } catch {
    return '';
  }
}

function extractInstagramImages(html: string): string[] {
  const images: string[] = [];

  // Extract og:image (profile picture or first post)
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (ogImage) images.push(ogImage);

  // Extract CDN images from script tags (Instagram stores in JSON)
  const cdnMatches = html.matchAll(/"display_url":"(https?:\\u002F\\u002F[^"]+cdninstagram[^"]+)"/g);
  for (const match of cdnMatches) {
    const url = match[1].replace(/\\u002F/g, '/');
    if (!images.includes(url)) images.push(url);
    if (images.length >= 12) break;
  }

  // Also try thumbnail_resources
  const thumbMatches = html.matchAll(/"src":"(https?:\\u002F\\u002F[^"]+cdninstagram[^"]+)"/g);
  for (const match of thumbMatches) {
    const url = match[1].replace(/\\u002F/g, '/');
    if (!images.includes(url)) images.push(url);
    if (images.length >= 12) break;
  }

  return images.slice(0, 9);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const instagramUrl = searchParams.get('url');
  if (!instagramUrl) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const username = extractInstagramUsername(instagramUrl);
  if (!username) return NextResponse.json({ error: 'Invalid Instagram URL' }, { status: 400 });

  const profileUrl = `https://www.instagram.com/${username}/`;

  // Try Firecrawl first
  const html = await scrapeWithFirecrawl(profileUrl);
  const images = html ? extractInstagramImages(html) : [];

  // Try plain fetch as fallback
  let fallbackHtml = '';
  if (images.length === 0) {
    try {
      const res = await fetch(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'fr-CA,fr;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        fallbackHtml = await res.text();
        const fallbackImages = extractInstagramImages(fallbackHtml);
        images.push(...fallbackImages.filter(i => !images.includes(i)));
      }
    } catch { /* silent */ }
  }

  // Extract bio/name from og tags
  const ogDesc = (html || fallbackHtml).match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const ogTitle = (html || fallbackHtml).match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';

  return NextResponse.json({
    username,
    profileUrl,
    displayName: ogTitle.replace(/\s*•.*$/, '').trim(),
    bio: ogDesc.slice(0, 200),
    images: images.slice(0, 9),
    hasImages: images.length > 0,
  });
}
