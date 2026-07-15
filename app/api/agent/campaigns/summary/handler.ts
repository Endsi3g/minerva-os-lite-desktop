import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

function verifyServiceToken(req: NextRequest): boolean {
  const expectedToken = process.env.HERMES_SERVICE_TOKEN;
  if (!expectedToken) return false;
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = authHeader.substring(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyServiceToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, campaignId } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from('campaigns').select('*').eq('workspace_id', workspaceId);
    if (campaignId) {
      query = query.eq('id', campaignId);
    }

    const { data: campaigns, error: campError } = await query;
    if (campError) throw campError;

    const summaries = await Promise.all(
      campaigns.map(async (camp) => {
        // Count total leads in this campaign
        const { count: totalLeads } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', camp.id);

        // Count leads by status
        const { data: leads } = await supabase
          .from('leads')
          .select('status')
          .eq('campaign_id', camp.id);

        const statusCounts: Record<string, number> = {};
        leads?.forEach((l) => {
          statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
        });

        return {
          id: camp.id,
          name: camp.name,
          status: camp.status,
          totalLeads: totalLeads || 0,
          statusCounts,
        };
      })
    );

    return NextResponse.json({ campaigns: summaries });
  } catch (err: any) {
    console.error('[agent-campaigns-summary]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
