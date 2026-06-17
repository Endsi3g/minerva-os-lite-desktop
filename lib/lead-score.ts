import { Lead } from './mock-data';

/**
 * Computes an opportunity score (0-100) for a lead.
 * Higher = better prospecting opportunity (i.e., more room to help them).
 *
 * Scoring factors:
 * - No website (+30): biggest signal that they need digital help
 * - Low rating (+20 if < 3.5, +10 if < 4.0): e-reputation issue
 * - Few reviews (+15 if < 10, +8 if < 50): low visibility
 * - HTTPS missing from seoAudit string (+5): technical gap
 * - Hot temperature (+5): prioritise already-warm leads
 */
export function computeLeadScore(lead: Lead): number {
  let score = 0;

  // No website — biggest opportunity signal
  if (!lead.website) {
    score += 30;
  }

  // Rating-based scoring
  if (typeof lead.rating === 'number') {
    if (lead.rating < 3.5) {
      score += 20;
    } else if (lead.rating < 4.0) {
      score += 10;
    }
  }

  // Reviews count scoring
  if (typeof lead.reviewsCount === 'number') {
    if (lead.reviewsCount < 10) {
      score += 15;
    } else if (lead.reviewsCount < 50) {
      score += 8;
    }
  }

  // Temperature bonus — hot leads are more valuable to act on
  if (lead.temperature === 'Hot') {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}
