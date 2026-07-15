import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/leads/[id]/livrables
 * Returns the client report deliverables for a given lead.
 * Replaces: localStorage.getItem(`minerva_livrables_${leadId}`)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data, error } = await supabase
      .from('leads')
      .select('lead_livrables')
      .eq('id', leadId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ livrables: data?.lead_livrables ?? {} });
  } catch (err: any) {
    console.error('[livrables GET]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}

/**
 * PATCH /api/leads/[id]/livrables
 * Updates the deliverables for a lead.
 * Body: { livrables: Record<string, any> }
 * Replaces: localStorage.setItem(`minerva_livrables_${leadId}`, JSON.stringify(...))
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { livrables } = await req.json();
    if (livrables === undefined) {
      return NextResponse.json({ error: 'Champ `livrables` requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('leads')
      .update({ lead_livrables: livrables })
      .eq('id', leadId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[livrables PATCH]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
