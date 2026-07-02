import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data } = await supabase
    .from('outbound_webhooks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const { name, url, events, secret, workspace_id } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'Nom et URL requis' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('outbound_webhooks')
    .insert({
      user_id: user.id,
      workspace_id: workspace_id || null,
      name,
      url,
      events: events ?? [],
      secret: secret || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhook: data });
}
