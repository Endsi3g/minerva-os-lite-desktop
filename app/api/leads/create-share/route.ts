import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { leadId } = body;
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  // Verify access via RLS (workspace-aware) — do NOT filter by user_id, leads are workspace-scoped
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const token = randomBytes(32).toString('hex');
  const admin = adminClient();

  // Insert share token (expires in 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from('lead_shares').insert({
    lead_id: leadId,
    share_token: token,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'lead_shares table missing. Run SQL migration.' }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  return NextResponse.json({ token, link: `${baseUrl}/lead-preview/${token}` });
}
