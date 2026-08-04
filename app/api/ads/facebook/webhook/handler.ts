import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FB_VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'minerva_fb_webhook';

// Meta calls this webhook server-to-server with no user session, so it can't go through
// /api/notifications/team (which requires an authenticated caller). Fan out directly here
// with the service-role client instead, mirroring that route's broadcast logic.
async function notifyTeamOfNewLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  workspaceId: string,
  lead: { id: string; business_name: string } | null
) {
  if (!lead) return;
  try {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();
    if (!workspace?.owner_id) return;

    const { data: members } = await supabase
      .from('team_members')
      .select('member_user_id')
      .eq('workspace_owner_id', workspace.owner_id)
      .eq('status', 'active');

    const recipientIds = new Set<string>([workspace.owner_id]);
    (members || []).forEach((m: { member_user_id: string | null }) => {
      if (m.member_user_id) recipientIds.add(m.member_user_id);
    });

    const nowStr = new Date().toISOString();
    const rows = Array.from(recipientIds).map((uid) => ({
      user_id: uid,
      workspace_id: workspaceId,
      type: 'team',
      title: 'Nouveau Lead créé',
      body: `Facebook Lead Ads : ${lead.business_name}.`,
      link: `/leads/${lead.id}`,
      is_read: false,
      created_at: nowStr,
      updated_at: nowStr,
    }));
    await supabase.from('notifications').insert(rows);
  } catch { /* notification fan-out is best-effort */ }
}

// Webhook verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === FB_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Incoming lead events (POST)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'leadgen') continue;

      const { form_id, leadgen_id, page_id } = change.value;

      // Find workspace for this form
      const { data: conn } = await supabase
        .from('fb_connections')
        .select('workspace_id, page_access_token, form_name, page_name, leads_count')
        .eq('form_id', form_id)
        .maybeSingle();

      if (!conn?.workspace_id) continue;

      // Fetch lead data from Facebook
      try {
        const leadRes = await fetch(
          `https://graph.facebook.com/v18.0/${leadgen_id}?fields=field_data,created_time&access_token=${conn.page_access_token}`
        );
        if (!leadRes.ok) continue;
        const leadData = await leadRes.json();

        const fields: Record<string, string> = {};
        for (const f of leadData.field_data || []) {
          fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
        }

        const businessName = fields['company'] || fields['full_name'] || fields['email'] || 'Lead Facebook';
        const contactEmail = fields['email'] || '';
        const phone = fields['phone_number'] || fields['phone'] || '';
        const contactName = fields['full_name'] || '';

        const { data: insertedLead, error: insertErr } = await supabase.from('leads').insert({
          workspace_id: conn.workspace_id,
          business_name: businessName,
          contact_email: contactEmail,
          phone,
          contact_name: contactName,
          source: `Facebook Lead Ads — ${conn.form_name || 'Formulaire'}`,
          lead_source_type: 'facebook',
          fb_form_id: form_id,
          fb_ad_id: leadgen_id,
          status: 'New',
          temperature: 'Hot',
          next_action: 'Contacter dans les 5 minutes (Speed-to-Lead)',
          next_action_date: new Date().toISOString().split('T')[0],
          sync_status: 'synced',
          created_at: leadData.created_time || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select('id, business_name').single();

        if (!insertErr) {
          await supabase
            .from('fb_connections')
            .update({ leads_count: (conn.leads_count || 0) + 1 })
            .eq('form_id', form_id);

          await notifyTeamOfNewLead(supabase, conn.workspace_id, insertedLead);
        }
      } catch { /* silent */ }

      void page_id;
    }
  }

  return NextResponse.json({ ok: true });
}
