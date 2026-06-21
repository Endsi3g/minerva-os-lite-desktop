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

  const { data: share, error } = await admin
    .from('lead_shares')
    .select('lead_id, expires_at, leads(id, name, company, email, phone, category, city, address, website, score)')
    .eq('share_token', token)
    .maybeSingle();

  if (error || !share) {
    return NextResponse.json({ valid: false, error: 'Lien invalide ou expiré.' }, { status: 404 });
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Lien expiré.' }, { status: 410 });
  }

  // Supabase returns related rows as array or object depending on join type
  const leadRaw = share.leads;
  const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as Record<string, unknown>;

  return NextResponse.json({
    valid: true,
    lead: {
      id: lead.id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      category: lead.category,
      city: lead.city,
      address: lead.address,
      website: lead.website,
      score: lead.score,
    },
    expiresAt: share.expires_at,
  });
}
