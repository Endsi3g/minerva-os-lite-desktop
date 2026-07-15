import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Accepte ou rejette une suggestion de recherche web approfondie
// (leads.enrichment_review) posée par app/api/leads/enrich-batch quand la
// confiance de correspondance n'était pas assez élevée pour l'appliquer
// automatiquement.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { leadId, action } = await req.json() as { leadId?: string; action?: 'accept' | 'reject' };
  if (!leadId || !action) return NextResponse.json({ error: 'leadId et action requis' }, { status: 400 });

  const { data: lead } = await supabase
    .from('leads')
    .select('enrichment_review')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead?.enrichment_review) {
    return NextResponse.json({ error: 'Aucune suggestion en attente pour ce lead' }, { status: 404 });
  }

  const updateFields: Record<string, unknown> = { enrichment_review: null, updated_at: new Date().toISOString() };

  if (action === 'accept') {
    const candidate = lead.enrichment_review?.candidate ?? {};
    if (candidate.website) updateFields.website = candidate.website;
    if (candidate.phone) updateFields.phone = candidate.phone;
    if (candidate.address) updateFields.address = candidate.address;
    if (candidate.socialLinks) updateFields.social_links = candidate.socialLinks;
  }

  const { error } = await supabase.from('leads').update(updateFields).eq('id', leadId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
