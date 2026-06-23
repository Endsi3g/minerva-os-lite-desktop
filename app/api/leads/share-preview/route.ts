import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const admin = adminClient();

  // Two separate queries — avoid PostgREST FK join which requires schema cache refresh
  const { data: share, error: shareErr } = await admin
    .from('lead_shares')
    .select('lead_id, expires_at')
    .eq('share_token', token)
    .maybeSingle();

  if (shareErr || !share) {
    return NextResponse.json({ valid: false, error: 'Lien invalide ou expiré.' }, { status: 404 });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Ce lien de partage a expiré.' }, { status: 410 });
  }

  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('id, contact_name, business_name, contact_email, phone, niche, city, address, website, score, rating, reviews_count')
    .eq('id', share.lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ valid: false, error: 'Prospect introuvable dans le partage.' }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    lead: {
      id: lead.id,
      name: lead.contact_name || lead.business_name,
      company: lead.business_name,
      email: lead.contact_email,
      phone: lead.phone,
      category: lead.niche,
      city: lead.city,
      address: lead.address,
      website: lead.website,
      score: lead.score,
      rating: lead.rating,
      reviewsCount: lead.reviews_count,
    },
    expiresAt: share.expires_at,
  });
}
