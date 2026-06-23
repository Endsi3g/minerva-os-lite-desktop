import { Lead } from './mock-data';

export interface LeadScoreV2 {
  total: number;       // 0-100
  icp: number;         // 0-25 data completeness + ICP match
  engagement: number;  // 0-25 pipeline stage + temperature signals
  urgency: number;     // 0-25 next action timing + freshness
  revenue: number;     // 0-25 business size + enrichment depth
}

// ── v1 (kept for backwards-compat) ───────────────────────────────────────────

export function computeLeadScore(lead: Lead): number {
  return computeLeadScoreV2(lead).total;
}

// ── v2 multidimensional ───────────────────────────────────────────────────────

export function computeLeadScoreV2(lead: Lead): LeadScoreV2 {
  const icp = scoreIcp(lead);
  const engagement = scoreEngagement(lead);
  const urgency = scoreUrgency(lead);
  const revenue = scoreRevenue(lead);
  return {
    icp,
    engagement,
    urgency,
    revenue,
    total: Math.min(100, icp + engagement + urgency + revenue),
  };
}

// ICP Fit — does the lead have enough data to be workable?
function scoreIcp(lead: Lead): number {
  let s = 0;
  if (lead.contactEmail) s += 5;
  if (lead.phone) s += 5;
  if (lead.website) s += 5;
  if (lead.niche) s += 5;
  if (lead.city) s += 3;
  if (lead.latitude) s += 2;
  return Math.min(25, s);
}

// Engagement — pipeline stage + temperature
function scoreEngagement(lead: Lead): number {
  let s = 0;

  switch ((lead.temperature || '').toLowerCase()) {
    case 'hot':  s += 15; break;
    case 'warm': s += 8;  break;
    case 'cold': s += 2;  break;
  }

  switch ((lead.status || '').toLowerCase()) {
    case 'won':            s += 10; break;
    case 'negotiation':
    case 'meeting booked': s += 8;  break;
    case 'proposal':       s += 5;  break;
    case 'contacted':      s += 3;  break;
  }

  if (lead.replyDetectedAt) s += 5;
  if (lead.replyStatus === 'positive') s += 5;

  return Math.min(25, s);
}

// Urgency — next action timing + data freshness
function scoreUrgency(lead: Lead): number {
  let s = 0;
  const now = Date.now();

  if (lead.nextActionDate) {
    const actionMs = new Date(lead.nextActionDate).getTime();
    const diffDays = (actionMs - now) / 86_400_000;
    if (diffDays < 0) {
      s += 10; // Overdue — highest urgency
    } else if (diffDays <= 3) {
      s += 15;
    } else if (diffDays <= 7) {
      s += 10;
    } else if (diffDays <= 30) {
      s += 5;
    }
  }

  if (lead.createdAt) {
    const ageDays = (now - new Date(lead.createdAt).getTime()) / 86_400_000;
    if (ageDays <= 3) s += 10;
    else if (ageDays <= 7) s += 7;
    else if (ageDays <= 30) s += 3;
  }

  if (lead.lastActivityAt) {
    const lastDays = (now - new Date(lead.lastActivityAt).getTime()) / 86_400_000;
    if (lastDays <= 7) s += 5;
    else if (lastDays <= 30) s += 2;
  }

  return Math.min(25, s);
}

// Revenue Potential — business signals + enrichment depth
function scoreRevenue(lead: Lead): number {
  let s = 0;

  if (typeof lead.rating === 'number' && lead.rating >= 4.5) s += 5;
  else if (typeof lead.rating === 'number' && lead.rating >= 4.0) s += 3;

  if (typeof lead.reviewsCount === 'number') {
    if (lead.reviewsCount >= 200) s += 8;
    else if (lead.reviewsCount >= 50) s += 5;
    else if (lead.reviewsCount >= 10) s += 2;
  }

  if (lead.websiteDescription && lead.websiteDescription.length > 50) s += 5;
  if (lead.decisionMakerName) s += 3;
  if (lead.dealAmount && lead.dealAmount > 0) s += 4;

  const premiumNiches = ['restaurant', 'médecin', 'avocat', 'dentiste', 'immobilier', 'notaire',
    'comptable', 'architecte', 'clinique', 'spa', 'hôtel', 'pharmacie'];
  const niche = (lead.niche || '').toLowerCase();
  if (premiumNiches.some((n) => niche.includes(n))) s += 5;

  return Math.min(25, s);
}
