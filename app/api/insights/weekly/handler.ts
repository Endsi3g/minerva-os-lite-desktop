// POST /api/insights/weekly
// Scans the workspace lead portfolio and produces an AI "opportunity report".
// Reports are persisted in weekly_reports table for catalogue access.
// Uses plain text only — no markdown syntax.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

function getWeekBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1); // Monday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  end.setHours(23, 59, 59, 999);
  return {
    weekStart: start.toISOString().split('T')[0],
    weekEnd: end.toISOString().split('T')[0],
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId } = await request.json();
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  // Confirm the toggle is enabled and fetch AI configuration settings
  const { data: settings } = await supabase
    .from('settings')
    .select('auto_insights, ai_provider, ai_model, openrouter_key')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settings && settings.auto_insights === false) {
    return NextResponse.json({ error: 'auto_insights disabled' }, { status: 403 });
  }

  const { data: leads } = await supabase
    .from('leads')
    .select('business_name, niche, city, status, temperature, rating, website, next_action, next_action_date, deal_amount, updated_at')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (!leads || leads.length === 0) {
    return NextResponse.json({
      report: "Aucun lead dans le portefeuille à analyser cette semaine.",
      metrics: {
        nbaAcceptanceRate: 0,
        nbaSuggested: 0,
        nbaExecuted: 0,
        bookingsThisWeek: 0,
        positiveRepliesThisWeek: 0,
        leadsAdvanced: 0,
        topNiche: null,
      },
    });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: nbaSuggested },
    { count: nbaExecuted },
    { count: bookingsThisWeek },
    { count: positiveRepliesThisWeek },
    { count: leadsAdvanced },
  ] = await Promise.all([
    supabase.from('agent_actions').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('suggested', true).gte('created_at', weekAgo),
    supabase.from('agent_actions').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('executed', true).gte('created_at', weekAgo),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('status', 'Meeting Booked').gte('updated_at', weekAgo),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).eq('reply_status', 'positive').gte('updated_at', weekAgo),
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId).not('status', 'in', '("New","Won","Lost")').gte('updated_at', weekAgo),
  ]);

  const nbaAcceptanceRate = nbaSuggested && nbaSuggested > 0
    ? Math.round(((nbaExecuted ?? 0) / nbaSuggested) * 100)
    : 0;

  const { data: nicheReplies } = await supabase
    .from('leads')
    .select('niche')
    .eq('workspace_id', workspaceId)
    .eq('reply_status', 'positive')
    .gte('updated_at', weekAgo);

  const nicheCounts: Record<string, number> = {};
  for (const l of nicheReplies ?? []) {
    if (l.niche) nicheCounts[l.niche] = (nicheCounts[l.niche] ?? 0) + 1;
  }
  const topNiche = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Compact stats to keep the prompt small
  const total = leads.length;
  const byStatus: Record<string, number> = {};
  const byTemp: Record<string, number> = {};
  let noWebsite = 0;
  for (const l of leads) {
    byStatus[l.status || 'New'] = (byStatus[l.status || 'New'] || 0) + 1;
    byTemp[l.temperature || 'Cold'] = (byTemp[l.temperature || 'Cold'] || 0) + 1;
    if (!l.website) noWebsite++;
  }
  const hotSample = leads
    .filter(l => l.temperature === 'Hot' || l.status === 'Contacted')
    .slice(0, 15)
    .map(l => `- ${l.business_name} (${l.niche || '?'}, ${l.city || '?'}) — statut ${l.status}, ${l.rating ? `note ${l.rating}` : 'pas de note'}${l.website ? '' : ', SANS site web'}`)
    .join('\n');

  // IMPORTANT: plain text only — no markdown syntax
  const prompt = `Tu es analyste commercial. Voici l'état du portefeuille de prospection cette semaine :\n\nTotal : ${total} leads\nStatuts : ${JSON.stringify(byStatus)}\nTempératures : ${JSON.stringify(byTemp)}\nSans site web : ${noWebsite}\n\nÉchantillon de leads prioritaires :\n${hotSample}\n\nImpact Minerva cette semaine : ${nbaExecuted ?? 0} actions exécutées (${nbaAcceptanceRate}% acceptées), ${bookingsThisWeek ?? 0} bookings, ${positiveRepliesThisWeek ?? 0} réponses positives, ${leadsAdvanced ?? 0} leads avancés dans le pipeline.${topNiche ? ` Niche top : ${topNiche}.` : ''}\n\nRédige un bilan hebdomadaire d'opportunités concis (~150 mots) : 3 opportunités concrètes à saisir cette semaine, les leads à relancer en priorité, et 1 recommandation stratégique. Sois actionnable et direct, en français.\n\nRÈGLE ABSOLUE : Réponds en texte brut uniquement. N'utilise PAS de syntaxe Markdown (pas de #, pas de **, pas de -, pas de *). Utilise des chiffres (1. 2. 3.) pour les listes. Pas de titres, pas de formatage spécial.`;

  const metrics = {
    nbaAcceptanceRate,
    nbaSuggested: nbaSuggested ?? 0,
    nbaExecuted: nbaExecuted ?? 0,
    bookingsThisWeek: bookingsThisWeek ?? 0,
    positiveRepliesThisWeek: positiveRepliesThisWeek ?? 0,
    leadsAdvanced: leadsAdvanced ?? 0,
    topNiche,
  };

  const { weekStart, weekEnd } = getWeekBounds();

  const persistReport = async (reportText: string) => {
    try {
      await supabase.from('weekly_reports').upsert({
        workspace_id: workspaceId,
        week_start: weekStart,
        week_end: weekEnd,
        report: reportText,
        metrics,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,week_start' });
    } catch (e) {
      console.error('[insights/weekly] persist error:', e);
    }
  };

  try {
    const report = await generateCompletion({
      messages: [{ role: 'user', content: prompt }],
      settings: settings || undefined,
      maxTokens: 1000,
    });

    await persistReport(report);

    // Persist as a notification so it surfaces in the bell
    await supabase.from('notifications').insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: 'weekly_insight',
      title: "Bilan hebdomadaire d'opportunités",
      body: report.slice(0, 280),
      link: '/weekly-report',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ report, metrics });
  } catch (e) {
    console.error('[insights/weekly] AI error, falling back to heuristic report:', e);
    const report = `Bilan hebdomadaire — ${total} leads au portefeuille.\n\nRépartition statut : ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}.\nTempératures : ${Object.entries(byTemp).map(([k, v]) => `${k}: ${v}`).join(', ')}.\n${noWebsite} prospects sans site web — opportunité d'audit ou de refonte.\n\nPriorisez les leads chauds et contactés cette semaine.`;

    await persistReport(report);

    return NextResponse.json({ report, metrics });
  }
}
