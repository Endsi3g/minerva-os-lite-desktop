import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = request.nextUrl.searchParams.get('workspace_id');
    const playbookId = request.nextUrl.searchParams.get('playbook_id');

    let query = supabase
      .from('playbook_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    if (playbookId) query = query.eq('playbook_id', playbookId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[playbook-runs GET]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { playbook_id, workspace_id, campaign_id, status = 'running' } = body;

    if (!playbook_id) return NextResponse.json({ error: 'playbook_id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('playbook_runs')
      .insert({
        playbook_id,
        workspace_id: workspace_id ?? null,
        campaign_id: campaign_id ?? null,
        status,
        leads_scraped: 0,
        emails_sent: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[playbook-runs POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status, leads_scraped, emails_sent } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (leads_scraped !== undefined) updates.leads_scraped = leads_scraped;
    if (emails_sent !== undefined) updates.emails_sent = emails_sent;
    if (status === 'done') updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('playbook_runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[playbook-runs PATCH]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
