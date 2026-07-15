import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/websites
 * Returns saved websites from Supabase.
 * Replaces: localStorage.getItem('minerva_saved_sites')
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data, error } = await supabase
      .from('settings')
      .select('saved_websites')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ websites: data?.saved_websites ?? [] });
  } catch (err: any) {
    console.error('[websites GET]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}

/**
 * PATCH /api/websites
 * Saves the full websites array to Supabase.
 * Body: { websites: any[] }
 * Replaces: localStorage.setItem('minerva_saved_sites', JSON.stringify(...))
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { websites } = await req.json();
    if (!Array.isArray(websites)) {
      return NextResponse.json({ error: 'Champ `websites` (array) requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ user_id: user.id, saved_websites: websites }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[websites PATCH]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
