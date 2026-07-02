import { NextRequest, NextResponse } from 'next/server';
import type { SeoAuditResult, SeoAuditError } from '@/lib/audit-types';

export type { SeoAuditResult, SeoAuditError } from '@/lib/audit-types';

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  return match ? match[1].trim() : null;
}

function hasViewportMeta(html: string): boolean {
  return /<meta[^>]+name=["']viewport["']/i.test(html);
}

function countH1Tags(html: string): number {
  const matches = html.match(/<h1[\s>]/gi);
  return matches ? matches.length : 0;
}

function hasGoogleAnalytics(html: string): boolean {
  return /gtag\s*\(|ga\.js|analytics\.js|google-analytics\.com/i.test(html);
}

function hasFacebookPixel(html: string): boolean {
  return /fbq\s*\(|connect\.facebook\.net\/en_US\/fbevents\.js/i.test(html);
}

function computeScore(params: {
  https: boolean;
  hasViewport: boolean;
  hasTitle: boolean;
  titleLength: number;
  hasDescription: boolean;
  descriptionLength: number;
  loadTime: number;
  h1Count: number;
  hasGA: boolean;
  hasFBPixel: boolean;
}): number {
  let score = 0;

  if (params.https) score += 20;
  if (params.hasViewport) score += 15;

  if (params.hasTitle) {
    if (params.titleLength >= 50 && params.titleLength <= 70) {
      score += 15;
    } else {
      score += 10;
    }
  }

  if (params.hasDescription) {
    if (params.descriptionLength >= 120 && params.descriptionLength <= 160) {
      score += 15;
    } else {
      score += 10;
    }
  }

  if (params.loadTime < 2000) {
    score += 15;
  } else if (params.loadTime < 4000) {
    score += 8;
  }

  if (params.h1Count === 1) score += 10;

  if (params.hasGA || params.hasFBPixel) score += 10;

  return Math.min(100, Math.max(0, score));
}

function buildIssues(params: {
  https: boolean;
  hasViewport: boolean;
  hasTitle: boolean;
  titleLength: number;
  hasDescription: boolean;
  descriptionLength: number;
  loadTime: number;
  h1Count: number;
  hasGA: boolean;
  hasFBPixel: boolean;
}): { label: string; severity: 'error' | 'warning' | 'info' }[] {
  const issues: { label: string; severity: 'error' | 'warning' | 'info' }[] = [];

  if (!params.https) {
    issues.push({ label: 'Site non sécurisé (pas de HTTPS)', severity: 'error' });
  }

  if (!params.hasViewport) {
    issues.push({ label: 'Balise viewport manquante — site non adapté aux mobiles', severity: 'error' });
  }

  if (!params.hasTitle) {
    issues.push({ label: 'Balise <title> absente', severity: 'error' });
  } else if (params.titleLength < 50) {
    issues.push({ label: `Titre trop court (${params.titleLength} car.) — optimal: 50-70 caractères`, severity: 'warning' });
  } else if (params.titleLength > 70) {
    issues.push({ label: `Titre trop long (${params.titleLength} car.) — optimal: 50-70 caractères`, severity: 'warning' });
  } else {
    issues.push({ label: `Titre bien optimisé (${params.titleLength} caractères)`, severity: 'info' });
  }

  if (!params.hasDescription) {
    issues.push({ label: 'Meta description absente', severity: 'error' });
  } else if (params.descriptionLength < 120) {
    issues.push({ label: `Meta description trop courte (${params.descriptionLength} car.) — optimal: 120-160 caractères`, severity: 'warning' });
  } else if (params.descriptionLength > 160) {
    issues.push({ label: `Meta description trop longue (${params.descriptionLength} car.) — optimal: 120-160 caractères`, severity: 'warning' });
  } else {
    issues.push({ label: `Meta description bien optimisée (${params.descriptionLength} caractères)`, severity: 'info' });
  }

  if (params.loadTime >= 4000) {
    issues.push({ label: `Temps de chargement lent (${params.loadTime}ms)`, severity: 'error' });
  } else if (params.loadTime >= 2000) {
    issues.push({ label: `Temps de chargement moyen (${params.loadTime}ms) — objectif: < 2s`, severity: 'warning' });
  } else {
    issues.push({ label: `Temps de chargement rapide (${params.loadTime}ms)`, severity: 'info' });
  }

  if (params.h1Count === 0) {
    issues.push({ label: 'Aucune balise H1 trouvée', severity: 'error' });
  } else if (params.h1Count > 1) {
    issues.push({ label: `${params.h1Count} balises H1 présentes — une seule recommandée`, severity: 'warning' });
  } else {
    issues.push({ label: 'Une seule balise H1 présente (correct)', severity: 'info' });
  }

  if (!params.hasGA && !params.hasFBPixel) {
    issues.push({ label: 'Aucun outil de tracking détecté (Google Analytics, Facebook Pixel)', severity: 'warning' });
  } else {
    if (params.hasGA) issues.push({ label: 'Google Analytics détecté', severity: 'info' });
    if (params.hasFBPixel) issues.push({ label: 'Facebook Pixel détecté', severity: 'info' });
  }

  return issues;
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawUrl = (body.url || '').trim();
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url field' }, { status: 400 });
  }

  // Normalise URL — add protocol if missing
  let url = rawUrl;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MinervaBot/1.0)',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const loadTime = Date.now() - startTime;
    const html = await response.text();

    const isHttps = new URL(response.url || url).protocol === 'https:';
    const viewportPresent = hasViewportMeta(html);
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const h1Count = countH1Tags(html);
    const gaPresent = hasGoogleAnalytics(html);
    const fbPresent = hasFacebookPixel(html);

    const params = {
      https: isHttps,
      hasViewport: viewportPresent,
      hasTitle: !!title,
      titleLength: title ? title.length : 0,
      hasDescription: !!description,
      descriptionLength: description ? description.length : 0,
      loadTime,
      h1Count,
      hasGA: gaPresent,
      hasFBPixel: fbPresent,
    };

    const score = computeScore(params);
    const issues = buildIssues(params);

    const result: SeoAuditResult = {
      url: response.url || url,
      loadTime,
      https: isHttps,
      hasViewport: viewportPresent,
      title,
      titleLength: title ? title.length : 0,
      hasTitle: !!title,
      descriptionContent: description,
      descriptionLength: description ? description.length : 0,
      hasDescription: !!description,
      hasGA: gaPresent,
      hasFBPixel: fbPresent,
      h1Count,
      score,
      issues,
    };

    return NextResponse.json(result);
  } catch {
    clearTimeout(timeout);
    const errorResult: SeoAuditError = {
      url,
      score: 0,
      error: 'unreachable',
    };
    return NextResponse.json(errorResult, { status: 200 });
  }
}
