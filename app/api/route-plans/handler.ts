import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const workspaceId = searchParams.get('workspace_id');
    const campaignId = searchParams.get('campaign_id');
    const channel = searchParams.get('channel'); // 'field' | 'call'

    let query = supabase.from('route_plans').select('*').order('created_at', { ascending: false });

    if (id) query = query.eq('id', id);
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    if (campaignId) query = query.eq('campaign_id', campaignId);
    if (channel) query = query.eq('channel', channel);

    const { data, error } = id
      ? await query.maybeSingle()
      : await query.limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? (id ? null : []));
  } catch (err) {
    console.error('[route-plans GET]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      workspace_id,
      campaign_id,
      lead_ids, // already ordered array
      distance_km,
      duration_min,
      channel, // 'field' (default) | 'call'
    } = body;

    if (!lead_ids || !Array.isArray(lead_ids)) {
      return NextResponse.json({ error: 'lead_ids (array) required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('route_plans')
      .insert({
        workspace_id: workspace_id ?? null,
        user_id: user.id,
        campaign_id: campaign_id ?? null,
        lead_ids: JSON.stringify(lead_ids),
        distance_km: distance_km ?? null,
        duration_min: duration_min ?? null,
        status: 'planned',
        channel: channel === 'call' ? 'call' : 'field',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[route-plans POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, status } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('route_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[route-plans PATCH]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
