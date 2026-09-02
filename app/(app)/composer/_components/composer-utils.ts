import { Lead } from '@/lib/mock-data';

export interface SubstitutionContext {
  lead: Lead | null;
  userFirstName?: string;
  userLastName?: string;
  userCompanyName?: string;
  userSignature?: string;
  calendarUrl?: string;
}

export function substituteVariables(text: string, ctx: SubstitutionContext): string {
  if (!text) return '';
  const { lead, userFirstName = 'Kael', userLastName = 'Belceus', userCompanyName = 'Minerva OS', userSignature = '', calendarUrl = 'https://cal.com/minerva' } = ctx;

  const contactFirstName = lead?.contactName ? lead.contactName.trim().split(/\s+/)[0] : (lead?.businessName || 'Monsieur/Madame');
  const contactLastName = lead?.contactName ? lead.contactName.trim().split(/\s+/).slice(1).join(' ') || '' : '';
  const business = lead?.businessName || '';
  const city = lead?.city || '';
  const sector = lead?.niche || '';
  const phone = lead?.phone || '';
  const website = lead?.website || '';
  const address = lead?.address || '';
  const role = lead?.decisionMakerRole || (lead?.contactName ? 'Dirigeant' : '');
  
  // Intelligent signals
  const signal = lead?.enrichmentReview?.reasoning || lead?.companyVibe || (lead?.nextAction ? `Suite à : ${lead.nextAction}` : 'Belle présence sur votre marché local');
  const scoreVal = lead?.score !== undefined ? String(lead.score) : '85';
  const reviewsCount = lead?.reviewsCount ? `${lead.reviewsCount} avis` : 'Plusieurs avis positifs';
  const rating = lead?.rating ? `${lead.rating}★` : '5.0★';
  const dealVal = lead?.dealAmount ? `${lead.dealAmount.toLocaleString('fr-FR')} €` : 'Sur devis';

  return text
    // Prospect variables
    .replace(/\{\{prenom\}\}/gi, contactFirstName)
    .replace(/\{\{nom\}\}/gi, contactLastName || contactFirstName)
    .replace(/\{\{entreprise\}\}/gi, business)
    .replace(/\{\{poste\}\}/gi, role)
    .replace(/\{\{ville\}\}/gi, city)
    .replace(/\{\{secteur\}\}/gi, sector)
    .replace(/\{\{telephone\}\}/gi, phone)
    .replace(/\{\{site_web\}\}/gi, website)
    .replace(/\{\{adresse\}\}/gi, address)
    // Signal & intelligence
    .replace(/\{\{signal_affaires\}\}/gi, signal)
    .replace(/\{\{score\}\}/gi, scoreVal)
    .replace(/\{\{avis_google\}\}/gi, reviewsCount)
    .replace(/\{\{note_google\}\}/gi, rating)
    .replace(/\{\{deal_montant\}\}/gi, dealVal)
    // Sender
    .replace(/\{\{mon_prenom\}\}/gi, userFirstName)
    .replace(/\{\{mon_nom\}\}/gi, userLastName)
    .replace(/\{\{mon_entreprise\}\}/gi, userCompanyName)
    .replace(/\{\{signature\}\}/gi, userSignature || `${userFirstName} ${userLastName} — ${userCompanyName}`)
    .replace(/\{\{mon_calendrier\}\}/gi, calendarUrl);
}

export function detectTokens(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{[a-zA-Z0-9_-]+\}\}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export interface DeliverabilityAnalysis {
  wordCount: number;
  charCount: number;
  readingTimeSec: number;
  spamScore: number; // 0 (bad) to 100 (clean)
  spamWarnings: string[];
  tokensRemaining: string[];
  readabilityTone: 'Ultra concis' | 'Optimal (Direct)' | 'Équilibré' | 'Trop long pour un cold email';
}

const SPAM_KEYWORDS = [
  'gratuit', '100% gratuit', 'sans engagement', 'offre exceptionnelle', 'urgent',
  'gagnez de l\'argent', 'devenez riche', 'promo exclusive', 'cliquez ici', 'satisfait ou remboursé',
  'garanti', 'meilleur prix', '$$$', 'argent facile'
];

export function analyzeDeliverability(subject: string, body: string, hasLead: boolean): DeliverabilityAnalysis {
  const fullText = `${subject} ${body}`.trim();
  const words = fullText ? fullText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = fullText.length;
  const readingTimeSec = Math.max(1, Math.round((wordCount / 200) * 60));

  const spamWarnings: string[] = [];
  let penalty = 0;

  // Check for Spam trigger words
  const lower = fullText.toLowerCase();
  SPAM_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      penalty += 15;
      spamWarnings.push(`Mot clé sensible détecté : "${kw}"`);
    }
  });

  // Check for excessive exclamation or uppercase
  const exclamationCount = (fullText.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    penalty += 10;
    spamWarnings.push(`Trop de points d'exclamation (${exclamationCount})`);
  }

  const upperCaseWords = words.filter(w => w.length > 3 && w === w.toUpperCase() && !w.startsWith('{{'));
  if (upperCaseWords.length > 2) {
    penalty += 15;
    spamWarnings.push(`Mots en majuscules détectés : ${upperCaseWords.slice(0, 3).join(', ')}`);
  }

  // Check subject length
  if (subject.length > 60) {
    penalty += 8;
    spamWarnings.push(`Objet un peu long (${subject.length} car.), idéalement < 50`);
  }

  const remainingTokens = detectTokens(fullText);
  if (!hasLead && remainingTokens.length > 0) {
    spamWarnings.push(`${remainingTokens.length} variable(s) détectée(s) sans prospect sélectionné`);
  }

  const spamScore = Math.max(10, Math.min(100, 100 - penalty));

  let readabilityTone: DeliverabilityAnalysis['readabilityTone'] = 'Optimal (Direct)';
  if (wordCount < 40) readabilityTone = 'Ultra concis';
  else if (wordCount <= 120) readabilityTone = 'Optimal (Direct)';
  else if (wordCount <= 220) readabilityTone = 'Équilibré';
  else readabilityTone = 'Trop long pour un cold email';

  return {
    wordCount,
    charCount,
    readingTimeSec,
    spamScore,
    spamWarnings,
    tokensRemaining: remainingTokens,
    readabilityTone,
  };
}
