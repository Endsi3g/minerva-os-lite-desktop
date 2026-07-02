import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Most-complete lead wins: compare field counts and pick the primary
function pickPrimary(leads: Array<{ id: string; fields: Record<string, unknown> }>): string {
  let best = leads[0];
  let bestCount = 0;
  for (const lead of leads) {
    const count = Object.values(lead.fields).filter(v => v !== null && v !== undefined && v !== '').length;
    if (count > bestCount) {
      bestCount = count;
      best = lead;
    }
  }
  return best.id;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadIds, workspaceId } = await req.json() as { leadIds: string[]; workspaceId: string };
  if (!leadIds || leadIds.length < 2) return NextResponse.json({ error: 'At least 2 leadIds required' }, { status: 400 });

  // Fetch all leads
  const { data: rows, error } = await supabase
    .from('leads')
    .select('*')
    .in('id', leadIds)
    .eq('workspace_id', workspaceId);

  if (error || !rows?.length) return NextResponse.json({ error: 'Leads not found' }, { status: 404 });

  const leadsWithFields = rows.map(r => ({ id: r.id, fields: r }));
  const primaryId = pickPrimary(leadsWithFields);
  const secondary = rows.filter(r => r.id !== primaryId);

  // Merge fields from all secondaries into primary (primary wins on conflict)
  const primary = rows.find(r => r.id === primaryId)!;
  const merged: Record<string, unknown> = { ...primary };

  const mergeFields = [
    'contact_email', 'phone', 'website', 'website_description',
    'rating', 'reviews_count', 'maps_url', 'photos', 'social_links',
    'latitude', 'longitude', 'contact_name', 'niche', 'city',
    'deal_amount', 'deal_probability', 'utm_source', 'utm_medium',
    'utm_campaign', 'utm_content', 'lead_source_type',
    'fb_adset_id', 'fb_ad_id', 'fb_form_id', 'fb_campaign_id',
    'gclid', 'google_campaign_id', 'google_ad_group_id',
    'enriched_logo', 'company_size_estimate', 'tech_stack', 'web_presence_score',
  ];

  for (const sec of secondary) {
    for (const field of mergeFields) {
      if ((merged[field] === null || merged[field] === undefined || merged[field] === '') && sec[field]) {
        merged[field] = sec[field];
      }
    }
  }

  // Track merged IDs
  const previousMergedIds: string[] = typeof primary.merged_from_ids === 'string'
    ? JSON.parse(primary.merged_from_ids)
    : (Array.isArray(primary.merged_from_ids) ? primary.merged_from_ids : []);
  const allMergedIds = [...new Set([...previousMergedIds, ...secondary.map(s => s.id)])];
  merged['merged_from_ids'] = JSON.stringify(allMergedIds);
  merged['updated_at'] = new Date().toISOString();

  // Update primary
  const { error: updateErr } = await supabase
    .from('leads')
    .update(merged)
    .eq('id', primaryId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Mark secondaries as duplicate (status Lost + is_duplicate flag)
  const secIds = secondary.map(s => s.id);
  const { error: markErr } = await supabase
    .from('leads')
    .update({ status: 'Lost', is_duplicate: true, duplicate_group_id: primaryId, updated_at: new Date().toISOString() })
    .in('id', secIds);

  if (markErr) return NextResponse.json({ error: markErr.message }, { status: 500 });

  return NextResponse.json({ primaryId, mergedIds: secIds, ok: true });
}
