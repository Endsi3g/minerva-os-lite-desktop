import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.format !== undefined) updates.format = body.format === 'flowchart' ? 'flowchart' : 'text';
    if (body.is_shared !== undefined) updates.is_shared = !!body.is_shared;

    // RLS restricts UPDATE to owner_user_id = auth.uid() — no explicit .eq needed
    // beyond id, but scoping defensively costs nothing.
    const { data, error } = await supabase
      .from('script_templates')
      .update(updates)
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[script-templates/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('script_templates')
      .delete()
      .eq('id', id)
      .eq('owner_user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[script-templates/[id] DELETE]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
