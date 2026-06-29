import { getAdminClient } from '@/lib/supabase/admin';

export type LeadEventType =
  // Outreach
  | 'email_draft_approved' | 'email_draft_rejected'
  | 'email_sent' | 'reply_classified'
  | 'sequence_enrolled' | 'sequence_paused' | 'sequence_resumed' | 'sequence_completed'
  // Agent
  | 'agent_action_approved' | 'agent_action_rejected'
  | 'tag_added' | 'follow_up_suggested' | 'pipeline_updated_by_agent'
  // Manual
  | 'note' | 'call' | 'meeting_booked' | 'field_visit';

export interface LeadEventPayload {
  lead_id: string;
  workspace_id: string;
  user_id?: string;
  event_type: LeadEventType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export async function logLeadEvent(payload: LeadEventPayload): Promise<void> {
  try {
    const supabase = getAdminClient();
    await supabase.from('lead_events').insert({
      lead_id: payload.lead_id,
      workspace_id: payload.workspace_id,
      user_id: payload.user_id ?? null,
      event_type: payload.event_type,
      title: payload.title,
      body: payload.body ?? null,
      metadata: payload.metadata ?? {},
      created_at: new Date().toISOString(),
    });
  } catch {
    // Fire-and-forget: never throw — timeline logging must never break the main flow
  }
}
