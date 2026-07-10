import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: fetch sequence templates for workspace, or a single one via ?id=
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: settings } = await supabase.from('settings').select('workspace_id').eq('user_id', user.id).single();
  if (!settings) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const { data, error } = await supabase
      .from('sequence_templates')
      .select('*')
      .eq('workspace_id', settings.workspace_id)
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Séquence introuvable' }, { status: 404 });
    return NextResponse.json(data);
  }

  const status = req.nextUrl.searchParams.get('status') || 'active';
  const { data, error } = await supabase
    .from('sequence_templates')
    .select('*')
    .eq('workspace_id', settings.workspace_id)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: create sequence template
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: settings } = await supabase.from('settings').select('workspace_id').eq('user_id', user.id).single();
  if (!settings) return NextResponse.json({ error: 'No workspace' }, { status: 400 });
  const body = await req.json();
  const { data, error } = await supabase.from('sequence_templates').insert({
    workspace_id: settings.workspace_id,
    name: body.name,
    description: body.description,
    steps: body.steps || [],
    status: 'active',
    tags: body.tags || [],
    created_by: user.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH: update sequence template (steps, status)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase
    .from('sequence_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: archive sequence template
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const { error } = await supabase
    .from('sequence_templates')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
