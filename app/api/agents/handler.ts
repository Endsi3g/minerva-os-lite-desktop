import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const category = request.nextUrl.searchParams.get('category');
  const sort = request.nextUrl.searchParams.get('sort') || 'popular';

  let query = supabase.from('agents').select('*').eq('is_public', true);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (sort === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('usage_count', { ascending: false });
  }

  const { data: agents, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ agents: agents || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, description, systemPrompt, category, icon, authorName } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Le nom de l'agent est requis" }, { status: 400 });
  }

  const { data: agent, error: insertError } = await supabase
    .from('agents')
    .insert({
      name: name.trim(),
      description: description?.trim() || '',
      system_prompt: systemPrompt?.trim() || '',
      category: category || 'Prospection',
      icon: icon || 'minerva',
      author_id: user.id,
      author_name: authorName?.trim() || 'Anonyme',
      is_public: true,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, agent }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('usage_count')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Agent non trouvé' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('agents')
    .update({ usage_count: (existing.usage_count || 0) + 1 })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
