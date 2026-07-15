import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/agents/[id]/reviews
 * Returns the stored reviews for a given AI agent.
 * Replaces: localStorage.getItem(`minerva_agent_reviews_${agentId}`)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    // agent_reviews is a JSONB column on the ai_agents table.
    // If the table doesn't have this column yet (migration not run), return [].
    const { data, error } = await supabase
      .from('ai_agents')
      .select('agent_reviews')
      .eq('id', agentId)
      .maybeSingle();

    if (error) {
      // Column might not exist yet on older DBs — return empty gracefully
      if (error.message?.includes('agent_reviews')) {
        return NextResponse.json({ reviews: [] });
      }
      throw error;
    }

    return NextResponse.json({ reviews: data?.agent_reviews ?? [] });
  } catch (err: any) {
    console.error('[agent reviews GET]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}

/**
 * POST /api/agents/[id]/reviews
 * Appends a review to an agent's review list or replaces it entirely.
 * Body: { reviews: any[] }  — full array replacement
 * Replaces: localStorage.setItem(`minerva_agent_reviews_${agentId}`, JSON.stringify(...))
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { reviews } = await req.json();
    if (!Array.isArray(reviews)) {
      return NextResponse.json({ error: 'Champ `reviews` (array) requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ai_agents')
      .update({ agent_reviews: reviews })
      .eq('id', agentId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[agent reviews POST]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
