import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, lead_source_type, utm_source, utm_campaign, utm_medium, status, created_at, first_contact_at, deal_amount, notes')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sourceGroups: Record<string, { total: number; contacted: number; meetings: number; won: number; pipeline: number; firstContactDelays: number[] }> = {};

  for (const lead of leads || []) {
    const source = lead.lead_source_type || lead.utm_source || 'organic';
    if (!sourceGroups[source]) {
      sourceGroups[source] = { total: 0, contacted: 0, meetings: 0, won: 0, pipeline: 0, firstContactDelays: [] };
    }
    const g = sourceGroups[source];
    g.total++;
    if (lead.status === 'Contacted' || lead.status === 'Meeting Booked' || lead.status === 'Won') g.contacted++;
    if (lead.status === 'Meeting Booked' || lead.status === 'Won') g.meetings++;
    if (lead.status === 'Won') { g.won++; g.pipeline += lead.deal_amount || 0; }

    if (lead.first_contact_at && lead.created_at) {
      const delay = new Date(lead.first_contact_at).getTime() - new Date(lead.created_at).getTime();
      if (delay > 0) g.firstContactDelays.push(delay / 1000 / 60); // minutes
    }
  }

  const bySource = Object.entries(sourceGroups).map(([source, g]) => ({
    source,
    total: g.total,
    contacted: g.contacted,
    meetings: g.meetings,
    won: g.won,
    pipeline: g.pipeline,
    contactRate: g.total > 0 ? Math.round((g.contacted / g.total) * 100) : 0,
    meetingRate: g.total > 0 ? Math.round((g.meetings / g.total) * 100) : 0,
    avgFirstContactMin: g.firstContactDelays.length > 0
      ? Math.round(g.firstContactDelays.reduce((a, b) => a + b, 0) / g.firstContactDelays.length)
      : null,
  })).sort((a, b) => b.total - a.total);

  const totalLeads = (leads || []).length;
  const totalMeetings = (leads || []).filter(l => l.status === 'Meeting Booked' || l.status === 'Won').length;
  const totalWon = (leads || []).filter(l => l.status === 'Won').length;
  const totalPipeline = (leads || []).filter(l => l.status === 'Won').reduce((sum, l) => sum + (l.deal_amount || 0), 0);
  const allDelays = (leads || [])
    .filter(l => l.first_contact_at && l.created_at)
    .map(l => (new Date(l.first_contact_at!).getTime() - new Date(l.created_at).getTime()) / 1000 / 60);
  const avgFirstContactMin = allDelays.length > 0
    ? Math.round(allDelays.reduce((a, b) => a + b, 0) / allDelays.length)
    : null;

  return NextResponse.json({
    summary: {
      totalLeads,
      totalMeetings,
      totalWon,
      totalPipeline,
      meetingRate: totalLeads > 0 ? Math.round((totalMeetings / totalLeads) * 100) : 0,
      avgFirstContactMin,
    },
    bySource,
  });
}
