import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logLeadEvent } from '@/lib/timeline-logger';

// GET: return pending approval items — agent_actions (suggested, not executed) + agent-drafted emails
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const [{ data: agentActions }, { data: drafts }] = await Promise.all([
    supabase
      .from('agent_actions')
      .select('id, action_type, lead_id, reasoning, data_signals, result, autonomy_level, outreach_type, created_at, leads(id, business_name, niche)')
      .eq('workspace_id', workspaceId)
      .eq('executed', false)
      .is('approved', null)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('drafts')
      // The draft text lives in the `content` column (there is no `body` column on `drafts`) —
      // aliased to `body` here so the response shape matches what outreach-approvals.tsx expects.
      .select('id, lead_id, subject, body:content, intent_type, source, created_at, leads(id, business_name, niche)')
      .eq('workspace_id', workspaceId)
      .in('source', ['agent', 'batch', 'batch_auto'])
      .is('approved', null)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return NextResponse.json({
    agent_actions: agentActions ?? [],
    drafts: drafts ?? [],
    total: (agentActions?.length ?? 0) + (drafts?.length ?? 0),
  });
}

// Agent action types that represent an actual email send — approving these should
// queue a real send, same as approving a draft. Other types (tasks, pipeline moves,
// sequence enrollment) just flip the approved flag, they have nothing to "send".
const EMAIL_ACTION_TYPES = new Set(['send_email', 'outreach_followup', 'outreach_initial_send']);

// PATCH: approve or reject an item — and log to timeline
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, type, decision, workspace_id } = await req.json();
  if (!id || !type || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'id, type, decision required' }, { status: 400 });
  }

  const approved = decision === 'approve';

  if (type === 'draft') {
    const { data: draft, error } = await supabase
      .from('drafts')
      .update({ approved, approved_at: new Date().toISOString() })
      .eq('id', id)
      .select('lead_id, subject, content, workspace_id, leads(contact_email, contact_name, business_name)')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let queueError: string | null = null;

    // Approving a draft used to just flip this boolean — nothing ever actually sent it.
    // Insert into email_queue so the existing process-queue cron (or an immediate
    // /api/outreach/queue/process-now call) picks it up under the normal quota/window.
    if (approved && draft) {
      const lead = draft.leads as unknown as { contact_email: string | null; contact_name: string | null; business_name: string | null } | null;
      if (!lead?.contact_email) {
        queueError = "Ce prospect n'a pas d'adresse e-mail — impossible de mettre en file d'envoi.";
        await supabase.from('drafts').update({ error: queueError }).eq('id', id);
      } else {
        const { error: insertErr } = await supabase.from('email_queue').insert({
          workspace_id: draft.workspace_id,
          lead_id: draft.lead_id,
          to_email: lead.contact_email,
          to_name: lead.contact_name || lead.business_name,
          subject: draft.subject,
          body_html: draft.content,
          status: 'pending',
          scheduled_at: new Date().toISOString(),
        });
        if (insertErr) {
          queueError = insertErr.message;
          await supabase.from('drafts').update({ error: queueError }).eq('id', id);
        }
      }
    }

    if (draft?.lead_id) {
      logLeadEvent({
        lead_id: draft.lead_id,
        workspace_id: draft.workspace_id ?? workspace_id ?? '',
        user_id: user.id,
        event_type: approved ? 'email_draft_approved' : 'email_draft_rejected',
        title: approved
          ? `Brouillon approuvé : ${draft.subject || 'email'}`
          : `Brouillon rejeté : ${draft.subject || 'email'}`,
        metadata: { draft_id: id, decision },
      });
    }

    return NextResponse.json({ ok: true, approved, queueError });
  } else {
    const { data: action, error } = await supabase
      .from('agent_actions')
      .update({ approved })
      .eq('id', id)
      .select('lead_id, action_type, workspace_id, outreach_type, leads(contact_email, contact_name, business_name)')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let queueError: string | null = null;

    if (approved && action && EMAIL_ACTION_TYPES.has(action.action_type)) {
      const lead = action.leads as unknown as { contact_email: string | null; contact_name: string | null; business_name: string | null } | null;
      if (lead?.contact_email) {
        const { data: draftForAction } = await supabase
          .from('drafts')
          .select('subject, content')
          .eq('lead_id', action.lead_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (draftForAction) {
          const { error: insertErr } = await supabase.from('email_queue').insert({
            workspace_id: action.workspace_id,
            lead_id: action.lead_id,
            to_email: lead.contact_email,
            to_name: lead.contact_name || lead.business_name,
            subject: draftForAction.subject,
            body_html: draftForAction.content,
            status: 'pending',
            scheduled_at: new Date().toISOString(),
          });
          if (insertErr) queueError = insertErr.message;
        }
      } else {
        queueError = "Ce prospect n'a pas d'adresse e-mail — impossible de mettre en file d'envoi.";
      }
    }

    if (action?.lead_id) {
      logLeadEvent({
        lead_id: action.lead_id,
        workspace_id: action.workspace_id ?? workspace_id ?? '',
        user_id: user.id,
        event_type: approved ? 'agent_action_approved' : 'agent_action_rejected',
        title: approved
          ? `Action agent approuvée : ${action.action_type}`
          : `Action agent rejetée : ${action.action_type}`,
        metadata: { action_id: id, action_type: action.action_type, decision },
      });
    }

    return NextResponse.json({ ok: true, approved, queueError });
  }
}
