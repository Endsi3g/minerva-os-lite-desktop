import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) { rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!checkRateLimit(user.id, 5)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const { workspace_id } = body;
  if (!workspace_id) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const { data: memoryRows } = await supabase
    .from('strategy_memory')
    .select('memory_type, niche, insight, confidence, sample_size')
    .eq('workspace_id', workspace_id)
    .order('confidence', { ascending: false })
    .limit(10);

  const { data: insightRows } = await supabase
    .from('agent_insights')
    .select('niche, city, response_rate, recommended_channel, leads_count')
    .eq('workspace_id', workspace_id)
    .order('response_rate', { ascending: true })
    .limit(5);

  const learnings = memoryRows ?? [];
  const underperforming = insightRows ?? [];

  const prompt = `Tu es Minerva, un assistant commercial stratégique. Sur la base de ces apprentissages observés dans les données de prospection, génère 3 recommandations stratégiques actionnables pour améliorer les conversions. Format: bullet list en français, très concis, prescriptif.

Apprentissages: ${JSON.stringify(learnings)}.

Niches sous-performantes: ${JSON.stringify(underperforming)}.`;

  const recommendations = await generateCompletion({
    system: 'Tu es Minerva, assistant commercial stratégique expert en prospection B2B.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 600,
    temperature: 0.5,
    userId: user.id,
  });

  return NextResponse.json({ recommendations });
}
