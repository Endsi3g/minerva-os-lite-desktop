export type DealRiskLevel = 'high' | 'medium' | 'low';

export interface DealRiskInput {
  status: string;
  lastActivityAt?: string;
  nextActionDate?: string;
  replyStatus?: string | null;
  dealAmount?: number;
  dealProbability?: number;
}

export interface DealRiskResult {
  level: DealRiskLevel;
  reasons: string[];
  daysSinceContact: number;
}

const OPEN_STATUSES = new Set(['Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation']);

// Computes a lightweight risk signal for open deals in the pipeline — reuses the same
// "days since contact" + reply-sentiment signals as lib/nba-engine.ts rather than inventing
// a new activity model, applied here to flag deals that are quietly stalling.
export function computeDealRisk(input: DealRiskInput): DealRiskResult | null {
  if (!OPEN_STATUSES.has(input.status)) return null; // Won/Lost/New — risk doesn't apply

  const lastContact = input.lastActivityAt || input.nextActionDate;
  const daysSinceContact = lastContact
    ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000)
    : 30;

  const reasons: string[] = [];
  let points = 0;

  if (daysSinceContact > 14) { points += 3; reasons.push(`Aucune activité depuis ${daysSinceContact} jours`); }
  else if (daysSinceContact > 7) { points += 2; reasons.push(`Activité ralentie (${daysSinceContact} jours)`); }

  if (input.replyStatus === 'negative') { points += 3; reasons.push('Dernière réponse négative'); }

  if ((input.dealAmount ?? 0) > 0 && (input.dealProbability ?? 100) < 30) {
    points += 2;
    reasons.push('Probabilité de closing faible pour un deal chiffré');
  }

  if (reasons.length === 0) return { level: 'low', reasons: ['Deal actif, pas de signal de risque'], daysSinceContact };

  const level: DealRiskLevel = points >= 5 ? 'high' : points >= 3 ? 'medium' : 'low';
  return { level, reasons, daysSinceContact };
}

export function getDealRiskColor(level: DealRiskLevel): string {
  if (level === 'high') return '#dc2626';
  if (level === 'medium') return '#d97706';
  return '#059669';
}

export function getDealRiskLabel(level: DealRiskLevel): string {
  if (level === 'high') return 'Risque élevé';
  if (level === 'medium') return 'À surveiller';
  return 'Sain';
}
