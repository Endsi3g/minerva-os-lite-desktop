import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: fetch email queue for workspace
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: settings } = await supabase.from('settings').select('workspace_id').eq('user_id', user.id).single();
  if (!settings) return NextResponse.json({ error: 'No workspace' }, { status: 400 });
  const status = req.nextUrl.searchParams.get('status');
  let query = supabase
    .from('email_queue')
    .select('*, leads(business_name, contact_name)')
    .eq('workspace_id', settings.workspace_id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return NextResponse.json(data || []);
}

// POST: add email to queue
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: settings } = await supabase.from('settings').select('workspace_id').eq('user_id', user.id).single();
  const body = await req.json();
  const { data, error } = await supabase.from('email_queue').insert({
    workspace_id: settings!.workspace_id,
    lead_id: body.leadId,
    enrollment_id: body.enrollmentId,
    to_email: body.toEmail,
    to_name: body.toName,
    subject: body.subject,
    body_html: body.bodyHtml,
    body_text: body.bodyText,
    status: 'pending',
    scheduled_at: body.scheduledAt || new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: update queue item status (cancel, retry)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, status } = body;
  const { error } = await supabase
    .from('email_queue')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
