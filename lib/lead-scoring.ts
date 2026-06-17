import type { Lead, Note } from './mock-data';

export interface ScoringCriteria {
  noWebsite: number;
  lowRating: number;
  fewReviews: number;
  hotTemperature: number;
  nicheMatch: number;
  cityMatch: number;
}

export const DEFAULT_SCORING: ScoringCriteria = {
  noWebsite: 30,
  lowRating: 20,
  fewReviews: 15,
  hotTemperature: 5,
  nicheMatch: 10,
  cityMatch: 5,
};

export const SCORING_LABELS: Record<keyof ScoringCriteria, string> = {
  noWebsite: 'Aucun site web',
  lowRating: 'Note < 3.5★',
  fewReviews: '< 10 avis Google',
  hotTemperature: 'Température : Chaud',
  nicheMatch: 'Niche cible correspondante',
  cityMatch: 'Ville cible correspondante',
};

// Legacy signature — used by reach-context and intelligence panel
interface ScoringInput {
  notes?: Note[];
  source?: string;
  website?: string;
}

export function computeLeadScore(lead: ScoringInput): number {
  let score = 50;
  const textLower = [
    ...(lead.notes || []).map(n => n.content),
    lead.source || ''
  ].join(' ').toLowerCase();

  if (!lead.website || textLower.includes('aucun site') || textLower.includes('pas de site') || textLower.includes('no website')) score += 35;
  if (textLower.includes('non sécurisé') || textLower.includes('pas de https') || textLower.includes('https manquant')) score += 20;
  if (textLower.includes('non optimisé mobiles') || textLower.includes('viewport absent') || textLower.includes('non mobile')) score += 25;
  if (textLower.includes('temps de réponse lent') || textLower.includes('lent à charger') || textLower.includes('slow')) score += 15;
  if (textLower.includes('pas de ga') || textLower.includes('no analytics') || textLower.includes('no tracking')) score += 10;
  if (textLower.includes('non revendiquée') || textLower.includes('fiche gmb non')) score += 20;

  const ratingMatch = (lead.source || '').match(/([0-9.]+)\s*★/);
  if (ratingMatch && parseFloat(ratingMatch[1]) < 4.0) score += 15;

  return Math.min(98, score);
}

// New persona-aware scoring — used by personas page and ICP system
export function scoreLeadByPersona(
  lead: Lead,
  criteria: ScoringCriteria = DEFAULT_SCORING,
  targetNiches: string[] = [],
  targetCities: string[] = [],
): number {
  let score = 0;

  if (!lead.website) score += criteria.noWebsite;
  if (lead.rating && lead.rating > 0 && lead.rating < 3.5) score += criteria.lowRating;
  if (lead.reviewsCount && lead.reviewsCount > 0 && lead.reviewsCount < 10) score += criteria.fewReviews;
  if (lead.temperature === 'Hot') score += criteria.hotTemperature;

  if (targetNiches.length > 0 && lead.niche) {
    const lNiche = lead.niche.toLowerCase();
    if (targetNiches.some(n => lNiche.includes(n.toLowerCase()) || n.toLowerCase().includes(lNiche))) {
      score += criteria.nicheMatch;
    }
  }

  if (targetCities.length > 0 && lead.city) {
    const lCity = lead.city.toLowerCase();
    if (targetCities.some(c => lCity.includes(c.toLowerCase()) || c.toLowerCase().includes(lCity))) {
      score += criteria.cityMatch;
    }
  }

  return Math.min(Math.round(score), 100);
}
