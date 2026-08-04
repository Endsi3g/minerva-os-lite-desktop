// GET  /api/team/roles            — List custom roles for the current owner
// POST /api/team/roles            — Create a custom role
// PUT  /api/team/roles?id=<id>    — Update a custom role
// DELETE /api/team/roles?id=<id>  — Delete a custom role

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('workspace_roles')
    .select('*')
    .eq('workspace_owner_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ roles: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roles: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, color, permissions } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('workspace_roles')
    .insert({
      workspace_owner_id: user.id,
      name: name.trim(),
      color: color || '#6366f1',
      permissions: permissions || [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'workspace_roles table missing. Run SQL migration.' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ role: data });
}

export async function PUT(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const { name, color, permissions } = body;

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('workspace_roles')
    .update({ name, color, permissions })
    .eq('id', id)
    .eq('workspace_owner_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ role: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from('workspace_roles')
    .delete()
    .eq('id', id)
    .eq('workspace_owner_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
