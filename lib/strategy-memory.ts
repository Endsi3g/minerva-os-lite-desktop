export interface StrategyLearning {
  memory_type: 'timing' | 'channel' | 'campaign';
  niche?: string;
  city?: string;
  campaign_id?: string;
  insight: string;
  key: string;
  value: string;
  confidence: number;
  sample_size: number;
}

interface LeadData {
  niche?: string;
  city?: string;
  last_activity_at?: string;
  reply_status?: string;
  nba_channel?: string;
  campaign_id?: string;
  status?: string;
}

export function computeTimingLearnings(leads: LeadData[]): StrategyLearning[] {
  const groups: Record<string, Record<number, { total: number; positive: number }>> = {};
  for (const l of leads) {
    if (!l.niche || !l.last_activity_at) continue;
    const day = new Date(l.last_activity_at).getDay();
    if (!groups[l.niche]) groups[l.niche] = {};
    if (!groups[l.niche][day]) groups[l.niche][day] = { total: 0, positive: 0 };
    groups[l.niche][day].total++;
    if (l.reply_status === 'positive') groups[l.niche][day].positive++;
  }

  const DAY_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const learnings: StrategyLearning[] = [];

  for (const [niche, days] of Object.entries(groups)) {
    let bestDay = -1;
    let bestRate = 0;
    let bestTotal = 0;
    for (const [day, stats] of Object.entries(days)) {
      if (stats.total < 3) continue;
      const rate = stats.positive / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = Number(day);
        bestTotal = stats.total;
      }
    }
    if (bestDay < 0) continue;
    const pct = Math.round(bestRate * 100);
    learnings.push({
      memory_type: 'timing',
      niche,
      key: 'best_day_of_week',
      value: String(bestDay),
      insight: `Les ${niche.toLowerCase()} répondent mieux le ${DAY_FR[bestDay]} (${pct}% taux de réponse sur ${bestTotal} contacts)`,
      confidence: Math.min(0.95, 0.4 + bestTotal * 0.03),
      sample_size: bestTotal,
    });
  }
  return learnings;
}

export function computeChannelLearnings(leads: LeadData[]): StrategyLearning[] {
  const groups: Record<string, Record<string, { total: number; positive: number }>> = {};
  for (const l of leads) {
    if (!l.niche || !l.nba_channel) continue;
    const ch = l.nba_channel;
    if (!groups[l.niche]) groups[l.niche] = {};
    if (!groups[l.niche][ch]) groups[l.niche][ch] = { total: 0, positive: 0 };
    groups[l.niche][ch].total++;
    if (l.reply_status === 'positive') groups[l.niche][ch].positive++;
  }

  const CH_FR: Record<string, string> = { email: 'email', call: 'appel', visit: 'visite terrain' };
  const learnings: StrategyLearning[] = [];

  for (const [niche, channels] of Object.entries(groups)) {
    let bestCh = '';
    let bestRate = 0;
    let bestTotal = 0;
    for (const [ch, stats] of Object.entries(channels)) {
      if (stats.total < 3) continue;
      const rate = stats.positive / stats.total;
      if (rate > bestRate) { bestRate = rate; bestCh = ch; bestTotal = stats.total; }
    }
    if (!bestCh) continue;
    const pct = Math.round(bestRate * 100);
    learnings.push({
      memory_type: 'channel',
      niche,
      key: 'best_channel',
      value: bestCh,
      insight: `Pour ${niche.toLowerCase()}, l'${CH_FR[bestCh] ?? bestCh} convertit mieux (${pct}% taux de réponse sur ${bestTotal} contacts)`,
      confidence: Math.min(0.95, 0.4 + bestTotal * 0.03),
      sample_size: bestTotal,
    });
  }
  return learnings;
}

export function computeCampaignLearnings(
  campaigns: Array<{ id: string; name: string; niches: string[] }>,
  leads: LeadData[]
): StrategyLearning[] {
  const campaignStats: Record<string, { name: string; niches: string[]; total: number; positive: number }> = {};
  for (const c of campaigns) {
    campaignStats[c.id] = { name: c.name, niches: c.niches, total: 0, positive: 0 };
  }
  for (const l of leads) {
    if (!l.campaign_id || !campaignStats[l.campaign_id]) continue;
    campaignStats[l.campaign_id].total++;
    if (l.reply_status === 'positive') campaignStats[l.campaign_id].positive++;
  }

  return Object.entries(campaignStats)
    .filter(([, s]) => s.total >= 5)
    .map(([id, s]) => {
      const rate = s.total > 0 ? Math.round((s.positive / s.total) * 100) : 0;
      const niche = s.niches?.[0] ?? 'leads';
      return {
        memory_type: 'campaign' as const,
        niche,
        campaign_id: id,
        key: `campaign_${id}_response_rate`,
        value: String(rate),
        insight: `Campagne "${s.name}" : ${rate}% taux de réponse (${s.positive}/${s.total} leads ${niche.toLowerCase()})`,
        confidence: Math.min(0.95, 0.3 + s.total * 0.02),
        sample_size: s.total,
      };
    });
}
