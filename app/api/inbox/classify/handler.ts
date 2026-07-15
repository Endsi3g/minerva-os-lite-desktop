import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { classifyReply, type AgentContext } from '@/lib/agent-tools';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { threadId, leadId, subject, snippet, workspaceId } = await req.json();
  if (!threadId || !leadId || !snippet) {
    return NextResponse.json({ error: 'threadId, leadId, snippet required' }, { status: 400 });
  }

  let wsId = workspaceId;
  if (!wsId) {
    const { data: settings } = await supabase
      .from('settings')
      .select('workspace_id, active_workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();
    wsId = settings?.workspace_id || settings?.active_workspace_id;
  }
  if (!wsId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const { data: dbSettings } = await supabase
    .from('settings')
    .select('ai_provider, ai_model, openrouter_key')
    .eq('user_id', user.id)
    .maybeSingle();

  const ctx: AgentContext = {
    workspaceId: wsId,
    userId: user.id,
    supabase,
    settings: {
      ai_provider: dbSettings?.ai_provider,
      ai_model: dbSettings?.ai_model,
      openrouter_key: dbSettings?.openrouter_key,
    },
  };

  try {
    const result = await classifyReply(ctx, {
      lead_id: leadId,
      subject: subject || '(Sans objet)',
      snippet: snippet.slice(0, 800),
      thread_id: threadId,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
