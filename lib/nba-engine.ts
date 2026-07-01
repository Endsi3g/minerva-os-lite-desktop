export interface NbaScore {
  score: number;
  action: string;
  channel: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  signals: {
    daysSinceContact: number;
    engagementScore: number;
    nicheScore: number;
  };
}

export interface NbaLead {
  id: string;
  niche: string;
  city?: string;
  status: string;
  temperature: string;
  nextActionDate?: string;
  lastActivityAt?: string;
  replyDetectedAt?: string;
  replyStatus?: string | null;
  emailOpensCount?: number;
  emailClicksCount?: number;
  score?: number;
}

export interface NicheInsight {
  niche: string;
  city?: string;
  response_rate: number;
  booking_rate: number;
  recommended_channel: string;
  best_cadence_days: number;
}

export function computeNbaScore(lead: NbaLead, nicheInsight?: NicheInsight | null): NbaScore {
  const lastContact = lead.lastActivityAt || lead.nextActionDate;
  const daysSinceContact = lastContact
    ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000)
    : 30;

  let contactScore = 0;
  if (daysSinceContact > 14) contactScore = 40;
  else if (daysSinceContact > 7) contactScore = 30;
  else if (daysSinceContact > 3) contactScore = 20;
  else if (daysSinceContact > 1) contactScore = 10;
  else contactScore = 0;

  const opens = lead.emailOpensCount ?? 0;
  let engagementScore = 0;
  if (lead.replyStatus === 'positive') {
    engagementScore = 0;
  } else if (lead.replyStatus === 'negative') {
    engagementScore = 0;
  } else if (opens >= 3) {
    engagementScore = 30;
  } else if (opens >= 1) {
    engagementScore = 20;
  } else {
    engagementScore = 10;
  }

  let nicheScore = 15;
  if (nicheInsight) {
    if (nicheInsight.response_rate > 20) nicheScore = 30;
    else if (nicheInsight.response_rate > 10) nicheScore = 22;
    else if (nicheInsight.response_rate > 5) nicheScore = 15;
    else nicheScore = 8;
  }

  const total = contactScore + engagementScore + nicheScore;

  let action: string;
  let channel: string;
  let urgency: 'high' | 'medium' | 'low';

  if (lead.replyStatus === 'positive') {
    action = 'book_meeting';
    channel = 'email';
    urgency = 'high';
  } else if (lead.replyStatus === 'negative') {
    action = 'pause';
    channel = 'email';
    urgency = 'low';
  } else if (opens >= 3 && !lead.replyDetectedAt) {
    action = 'switch_channel';
    channel = nicheInsight?.recommended_channel === 'call' ? 'call' : 'call';
    urgency = 'high';
  } else if (total >= 70) {
    action = 'email_followup';
    channel = nicheInsight?.recommended_channel ?? 'email';
    urgency = 'high';
  } else if (total >= 50) {
    action = 'email_followup';
    channel = 'email';
    urgency = 'medium';
  } else if (total >= 30) {
    action = 'nurture';
    channel = 'email';
    urgency = 'low';
  } else {
    action = 'pause';
    channel = 'email';
    urgency = 'low';
  }

  const reasons: string[] = [];
  if (daysSinceContact > 7) reasons.push(`Aucun contact depuis ${daysSinceContact} jours`);
  if (opens >= 3 && !lead.replyDetectedAt) reasons.push(`A ouvert vos emails ${opens}x sans répondre`);
  if (lead.replyStatus === 'positive') reasons.push('A répondu positivement — à convertir');
  if (nicheInsight && nicheInsight.response_rate > 15) reasons.push(`Niche active (${nicheInsight.response_rate.toFixed(0)}% taux de réponse)`);
  if (nicheInsight && nicheInsight.response_rate < 8) reasons.push(`Niche froide — essayer un autre angle`);
  if (reasons.length === 0) reasons.push('Relance recommandée par le moteur adaptatif');

  return {
    score: Math.min(100, Math.round(total)),
    action,
    channel,
    reason: reasons.join(' · '),
    urgency,
    signals: { daysSinceContact, engagementScore, nicheScore },
  };
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    email_followup: 'Envoyer un email de relance',
    call: 'Appeler le prospect',
    switch_channel: 'Changer de canal (appel recommandé)',
    field_visit: 'Planifier une visite terrain',
    book_meeting: 'Proposer un rendez-vous',
    nurture: 'Ajouter à une séquence de nurture',
    pause: 'Mettre en pause',
  };
  return labels[action] ?? action;
}

export function getUrgencyColor(urgency: 'high' | 'medium' | 'low'): string {
  if (urgency === 'high') return '#dc2626';
  if (urgency === 'medium') return '#d97706';
  return '#6b7280';
}
