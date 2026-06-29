// POST /api/insights/weekly
// Scans the workspace lead portfolio and produces an AI "opportunity report".
// Triggered from the dashboard on weekends when auto_insights is enabled (the client
// guards it to run at most once per week). Returns a markdown report.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

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
    return NextResponse.json({ report: "Aucun lead dans le portefeuille à analyser cette semaine." });
  }

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

  const prompt = `Tu es analyste commercial. Voici l'état du portefeuille de prospection cette semaine :\n\nTotal : ${total} leads\nStatuts : ${JSON.stringify(byStatus)}\nTempératures : ${JSON.stringify(byTemp)}\nSans site web : ${noWebsite}\n\nÉchantillon de leads prioritaires :\n${hotSample}\n\nRédige un bilan hebdomadaire d'opportunités concis (Markdown, ~150 mots) : 3 opportunités concrètes à saisir cette semaine, les leads à relancer en priorité, et 1 recommandation stratégique. Sois actionnable et direct, en français.`;

  try {
    const report = await generateCompletion({
      messages: [{ role: 'user', content: prompt }],
      settings: settings || undefined,
      maxTokens: 600,
    });

    // Persist as a notification so it surfaces in the bell
    await supabase.from('notifications').insert({
      user_id: user.id,
      workspace_id: workspaceId,
      type: 'weekly_insight',
      title: "Bilan hebdomadaire d'opportunités",
      body: report.slice(0, 280),
      link: '/today',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ report });
  } catch (e) {
    console.error('[insights/weekly] AI error, falling back to heuristic report:', e);
    // Fallback heuristic report without AI
    const report = `## Bilan hebdomadaire d'opportunités\n\n- **${total}** leads au portefeuille.\n- Répartition statut : ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}.\n- Températures : ${Object.entries(byTemp).map(([k, v]) => `${k}: ${v}`).join(', ')}.\n- **${noWebsite}** prospects sans site web (opportunité d'audit/refonte).\n\nPriorisez les leads chauds et contactés cette semaine.`;
    return NextResponse.json({ report });
  }
}
