import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeLeadScoreV2 } from '@/lib/lead-score';
import { Lead } from '@/lib/mock-data';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId } = await req.json();
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 });

  // Fetch the lead
  const { data: row, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !row) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Map to Lead type for the scoring function
  const lead: Partial<Lead> = {
    id: row.id,
    businessName: row.business_name || '',
    contactEmail: row.contact_email,
    phone: row.phone,
    website: row.website,
    niche: row.niche,
    city: row.city,
    latitude: row.latitude,
    temperature: row.temperature,
    status: row.status,
    replyDetectedAt: row.reply_detected_at,
    replyStatus: row.reply_status,
    nextActionDate: row.next_action_date,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    websiteDescription: row.website_description,
    decisionMakerName: row.decision_maker_name,
    dealAmount: row.deal_amount,
  };

  const scores = computeLeadScoreV2(lead as Lead);

  // Save to DB
  const { error: updateErr } = await supabase
    .from('leads')
    .update({
      score: scores.total,
      score_icp: scores.icp,
      score_engagement: scores.engagement,
      score_urgency: scores.urgency,
      score_revenue: scores.revenue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Log score_updated event
  await supabase.from('lead_events').insert({
    lead_id: leadId,
    workspace_id: row.workspace_id,
    user_id: user.id,
    event_type: 'score_updated',
    title: `Score mis à jour : ${scores.total}/100`,
    metadata: { icp: scores.icp, engagement: scores.engagement, urgency: scores.urgency, revenue: scores.revenue },
  }).then(() => undefined);

  return NextResponse.json({ ok: true, scores });
}
