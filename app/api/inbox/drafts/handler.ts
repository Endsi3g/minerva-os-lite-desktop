import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: pending drafts (any source, not yet approved/rejected) for the "Brouillons" inbox tab.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id requis' }, { status: 400 });

  const { data: drafts, error } = await supabase
    .from('drafts')
    // The draft text lives in the `content` column (there is no `body` column on `drafts`) —
    // aliased to `body` to match the shape /api/outreach/approvals already returns.
    // channel='Email' excludes call-pitch drafts (e.g. enrich-contact's phone-script fallback),
    // which read like a phone opener and have no subject — confusing inside an email inbox tab.
    .select('id, lead_id, subject, body:content, intent_type, source, created_at, channel, leads(id, business_name, contact_email, rating, reviews_count, city, niche, website_description, website)')
    .eq('workspace_id', workspaceId)
    .in('channel', ['Email', 'DM'])
    .is('approved', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ drafts: drafts ?? [] });
}
