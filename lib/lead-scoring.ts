import type { Note } from './mock-data';

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
