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

    const { workspaceId, userId, playbookSlug, niche, city } = await req.json();
    if (!workspaceId || !userId || !playbookSlug) {
      return NextResponse.json({ error: 'workspaceId, userId and playbookSlug are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();
    const campaignId = crypto.randomUUID();

    // 1. Create a campaign for this playbook
    const { data: campaign, error: campError } = await supabase
      .from('campaigns')
      .insert({
        id: campaignId,
        workspace_id: workspaceId,
        user_id: userId,
        name: `Playbook ${playbookSlug} - ${niche || 'Niche'} (${city || 'Ville'})`,
        description: `Campagne automatique déployée de manière autonome par Hermes Agent.`,
        niches: niche ? [niche] : [],
        cities: city ? [city] : [],
        status: 'active',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (campError) throw campError;

    // 2. Track playbook run history
    const runId = crypto.randomUUID();
    const { error: runError } = await supabase
      .from('playbook_runs')
      .insert({
        id: runId,
        playbook_id: playbookSlug,
        workspace_id: workspaceId,
        campaign_id: campaignId,
        status: 'running',
        created_at: now,
      });

    if (runError) throw runError;

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaign.name,
      runId,
    });
  } catch (err: any) {
    console.error('[agent-playbooks-deploy]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
