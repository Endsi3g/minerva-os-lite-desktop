import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listLeadsToFollowUp, generateEmailDraft, type AgentContext } from '@/lib/agent-tools';

// SAFETY INVARIANT: this cron only ever inserts into `drafts` (source: 'batch_auto',
// approved: null) via generateEmailDraft — it must NEVER insert into email_queue, call
// the Gmail send API, or touch sequence_enrollments. Every generated draft requires
// human approval (see /api/outreach/approvals) before anything actually sends. Opt-in
// only: a workspace's owner must explicitly enable settings.batch_outreach_auto_draft.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: eligibleSettings } = await supabase
    .from('settings')
    .select('user_id, workspace_id, ai_provider, ai_model, openrouter_key')
    .eq('batch_outreach_auto_draft', true);

  let workspacesProcessed = 0;
  let drafted = 0;
  const errors: Array<{ workspace_id: string; reason: string }> = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const settingsRow of eligibleSettings ?? []) {
    if (!settingsRow.workspace_id || !settingsRow.user_id) continue;

    try {
      const ctx: AgentContext = {
        workspaceId: settingsRow.workspace_id,
        userId: settingsRow.user_id,
        supabase,
        settings: {
          ai_provider: settingsRow.ai_provider,
          ai_model: settingsRow.ai_model,
          openrouter_key: settingsRow.openrouter_key,
        },
      };

      const candidates = await listLeadsToFollowUp(ctx, { threshold_days: 7, min_score: 40 });

      // Skip leads already batch-drafted recently, to avoid re-drafting the same lead every run.
      const { data: recentDrafts } = await supabase
        .from('drafts')
        .select('lead_id')
        .eq('workspace_id', settingsRow.workspace_id)
        .in('source', ['batch', 'batch_auto'])
        .gte('created_at', sevenDaysAgo);
      const recentlyDrafted = new Set((recentDrafts ?? []).map((d: { lead_id: string }) => d.lead_id));

      for (const lead of candidates) {
        if (recentlyDrafted.has(lead.id)) continue;
        try {
          await generateEmailDraft(ctx, { lead_id: lead.id, template_type: 'follow_up', source: 'batch_auto' });
          drafted++;
        } catch (err) {
          errors.push({ workspace_id: settingsRow.workspace_id, reason: (err as Error).message });
        }
      }

      workspacesProcessed++;
    } catch (err) {
      errors.push({ workspace_id: settingsRow.workspace_id, reason: (err as Error).message });
    }
  }

  return NextResponse.json({ ok: true, workspacesProcessed, drafted, errors });
}
