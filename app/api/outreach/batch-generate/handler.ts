import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmailDraft, type AgentContext } from '@/lib/agent-tools';

const CONCURRENCY = 3;

// POST: manual batch entry point — user selects N leads on the Leads page and this
// generates one personalized draft per lead. Drafts land as pending (approved: null,
// source: 'batch') in the existing Approbations/Brouillons tabs — nothing is ever sent
// directly from here, approval (and the resulting email_queue insert) is a separate step.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadIds, workspaceId } = await req.json() as { leadIds?: string[]; workspaceId?: string };
  if (!leadIds || leadIds.length === 0) {
    return NextResponse.json({ error: 'leadIds requis' }, { status: 400 });
  }
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId requis' }, { status: 400 });
  }

  const { data: dbSettings } = await supabase
    .from('settings')
    .select('ai_provider, ai_model, openrouter_key')
    .eq('user_id', user.id)
    .maybeSingle();

  const ctx: AgentContext = {
    workspaceId,
    userId: user.id,
    supabase,
    settings: {
      ai_provider: dbSettings?.ai_provider,
      ai_model: dbSettings?.ai_model,
      openrouter_key: dbSettings?.openrouter_key,
    },
  };

  let created = 0;
  const failed: Array<{ lead_id: string; reason: string }> = [];

  for (let i = 0; i < leadIds.length; i += CONCURRENCY) {
    const chunk = leadIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map((leadId) => generateEmailDraft(ctx, { lead_id: leadId, template_type: 'introduction', source: 'batch' }))
    );
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        created++;
      } else {
        failed.push({ lead_id: chunk[idx], reason: result.reason?.message || 'Erreur inconnue' });
      }
    });
  }

  return NextResponse.json({ ok: true, created, failed });
}
