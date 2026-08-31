import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// RLS on script_templates already scopes SELECT to (owner) OR (is_shared AND
// same workspace) — see supabase/migrations/20260830120000_v14_7_call_scripting.sql —
// so this just needs to filter by workspace on top of that.
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = req.nextUrl.searchParams.get('workspace_id');
    if (!workspaceId) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 });

    const { data, error } = await supabase
      .from('script_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[script-templates GET]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { workspace_id, title, content, format, source, is_shared, file_url } = body;
    if (!workspace_id || !title || !content) {
      return NextResponse.json({ error: 'workspace_id, title et content requis' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('script_templates')
      .insert({
        workspace_id,
        owner_user_id: user.id,
        title,
        content,
        format: format === 'flowchart' ? 'flowchart' : 'text',
        source: ['manual', 'imported', 'ai_style'].includes(source) ? source : 'manual',
        is_shared: !!is_shared,
        file_url: file_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[script-templates POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
