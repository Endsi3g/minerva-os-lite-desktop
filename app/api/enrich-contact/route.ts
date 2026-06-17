import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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
  // High ratings but few reviews = opportunity to improve
  if (data.rating && data.rating < 4.0) score += 25;
  else if (data.rating && data.rating < 4.5) score += 15;
  if (data.reviewsCount) {
    if (data.reviewsCount < 10) score += 20;
    else if (data.reviewsCount < 30) score += 10;
  }
  // Niches with higher intent
  const highIntentNiches = ['restaurant', 'café', 'coiffeur', 'esthétique', 'dentiste', 'médecin', 'plombier', 'électricien', 'notaire', 'comptable'];
  if (data.niche && highIntentNiches.some(n => data.niche!.toLowerCase().includes(n))) score += 20;
  return Math.min(100, score);
}

export async function POST(req: NextRequest) {
  try {
    const { website, businessName, contactName, city, niche, rating, reviewsCount, socialLinks, photos } = await req.json();

    const domain = website ? extractDomain(website) : null;
    const suggestedEmails = domain ? generateEmailSuggestions(domain, contactName) : [];
    const fitScore = computeFitScore({ website, rating, reviewsCount, socialLinks, photos });
    const intentScore = computeIntentScore({ rating, reviewsCount, niche });

    let decisionMakerName = '';
    let decisionMakerRole = '';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && businessName) {
      try {
        const client = new Anthropic({ apiKey });
        const prompt = `Tu es un expert en prospection B2B locale.
Business: "${businessName}" — Niche: "${niche || 'non précisé'}" — Ville: "${city || 'non précisée'}"
${website ? `Site: ${website}` : ''}

Génère en JSON strict (sans markdown) le décideur probable de ce business local :
{"name": "Prénom Nom (si devinable depuis le nom du business, sinon vide)", "role": "Propriétaire" | "Gérant" | "Directeur" | "Fondateur" | titre pertinent selon la niche}

Réponds UNIQUEMENT avec le JSON.`;

        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
        const parsed = JSON.parse(text);
        decisionMakerName = parsed.name || '';
        decisionMakerRole = parsed.role || 'Propriétaire';
      } catch {
        decisionMakerRole = 'Propriétaire';
      }
    } else {
      decisionMakerRole = 'Propriétaire';
    }

    return NextResponse.json({
      suggestedEmails,
      fitScore,
      intentScore,
      decisionMakerName,
      decisionMakerRole,
      domain,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
