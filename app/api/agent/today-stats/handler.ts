import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 });

  const today = new Date().toISOString().split('T')[0];
  const since = `${today}T00:00:00.000Z`;

  const [
    { count: oneOffEmailsSent },
    { count: queuedEmailsSent },
    { count: sequenceEmailsSent },
    { count: repliesReceived },
    { count: agentActions },
    { count: appointmentsCreated },
    { count: leadsCreated },
    { data: latestActions },
  ] = await Promise.all([
    // "Emails envoyés" must reflect emails actually delivered via Gmail, not drafts created —
    // these three sources are the only places that write a real Gmail messages.send result.
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('type', 'email').gte('created_at', since),
    supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'sent').gte('sent_at', since),
    supabase.from('email_sequence_steps').select('*, email_sequences!inner(workspace_id)', { count: 'exact', head: true }).eq('email_sequences.workspace_id', workspaceId).eq('status', 'sent').gte('sent_at', since),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).not('reply_detected_at', 'is', null).gte('reply_detected_at', since),
    supabase.from('agent_actions').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('executed', true).gte('created_at', since),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('type', 'calendar_event_created').gte('created_at', since),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('workspace_id', workspaceId).gte('created_at', since),
    supabase.from('agent_actions').select('action_type, reasoning, lead_id').eq('workspace_id', workspaceId).eq('executed', true).gte('created_at', since).order('created_at', { ascending: false }).limit(3),
  ]);

  return NextResponse.json({
    date: today,
    emails_sent: (oneOffEmailsSent ?? 0) + (queuedEmailsSent ?? 0) + (sequenceEmailsSent ?? 0),
    replies_received: repliesReceived ?? 0,
    agent_actions: agentActions ?? 0,
    appointments_created: appointmentsCreated ?? 0,
    leads_created: leadsCreated ?? 0,
    latest_actions: latestActions ?? [],
  });
}
