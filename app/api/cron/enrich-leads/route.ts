import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret =
    req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (process.env.NODE_ENV === 'production' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all workspaces with auto_enrich_scheduled=true
  const { data: settingsList } = await supabase
    .from('settings')
    .select('user_id, workspace_id, auto_enrich_scheduled, auto_email_on_enrichment, daily_email_limit')
    .eq('auto_enrich_scheduled', true);

  if (!settingsList?.length) {
    return NextResponse.json({ processed: 0, message: 'No workspaces with scheduled enrichment enabled' });
  }

  let totalEnriched = 0;

  for (const settings of settingsList) {
    try {
      // Find leads not enriched or enriched > 7 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // We query by workspace_id when available, otherwise by user_id as fallback
      const query = supabase
        .from('leads')
        .select('id, workspace_id')
        .or(`enriched_at.is.null,enriched_at.lt.${sevenDaysAgo}`)
        .limit(50);

      if (settings.workspace_id) {
        query.eq('workspace_id', settings.workspace_id);
      } else {
        query.eq('user_id', settings.user_id);
      }

      const { data: leads } = await query;

      if (!leads?.length) continue;

      const leadIds = leads.map((l: { id: string }) => l.id);
      const workspaceId = settings.workspace_id || leads[0]?.workspace_id;

      const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      await fetch(`${origin}/api/leads/enrich-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds, workspaceId, mode: 'full' }),
      });

      totalEnriched += leadIds.length;
    } catch (err) {
      console.error(`Enrich-leads cron error for user ${settings.user_id}:`, err);
    }
  }

  return NextResponse.json({ processed: totalEnriched });
}

// Also support GET for Vercel cron triggers
export async function GET(req: NextRequest) {
  return POST(req);
}
