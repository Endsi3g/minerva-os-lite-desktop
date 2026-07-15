import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Real, workspace-scoped operational counters — no synthetic/simulated numbers.
// Deliberately reuses existing tables instead of a new "metrics" table: leads,
// email_queue, sms_messages and agent_actions already carry everything needed.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    leadsCreated,
    repliesDetected,
    emailsSent,
    emailsFailed,
    smsSent,
    agentActions,
    aiLogs,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since7d),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('reply_detected_at', since7d),
    supabase.from('email_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'sent').gte('sent_at', since7d),
    supabase.from('email_queue').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'failed').gte('updated_at', since7d),
    supabase.from('sms_messages').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since7d),
    supabase.from('agent_actions').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since7d),
    supabase.from('ai_gateway_logs').select('success').eq('user_id', user.id).gte('created_at', since7d).limit(500),
  ]);

  const aiTotal = aiLogs.data?.length ?? 0;
  const aiSuccess = aiLogs.data?.filter((l) => l.success).length ?? 0;

  return NextResponse.json({
    period_days: 7,
    leads_created: leadsCreated.count ?? 0,
    replies_detected: repliesDetected.count ?? 0,
    emails_sent: emailsSent.count ?? 0,
    emails_failed: emailsFailed.count ?? 0,
    sms_sent: smsSent.count ?? 0,
    agent_actions: agentActions.count ?? 0,
    ai_requests: aiTotal,
    ai_success_rate: aiTotal > 0 ? Math.round((aiSuccess / aiTotal) * 100) : null,
    sentry_configured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}
