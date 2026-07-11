// GET /api/cron/weekly-report-reminder
// Runs once a day (unlike /api/cron/weekly-report which only fires Monday and
// generates the full AI report). This is a lightweight, no-AI teaser that keeps
// the weekly bilan top of mind every day and deep-links to /weekly-report.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function cronAuth(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const authHeader = req.headers.get('authorization');
  return !!(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(req: NextRequest) {
  if (!cronAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: workspaces } = await adminClient.from('workspaces').select('id, owner_id');
  if (!workspaces || workspaces.length === 0) return NextResponse.json({ ok: true, processed: 0 });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday of this week
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  let processed = 0;

  for (const ws of workspaces) {
    try {
      const [
        { count: bookingsThisWeek },
        { count: positiveRepliesThisWeek },
        { count: leadsAdvanced },
      ] = await Promise.all([
        adminClient.from('leads').select('*', { count: 'exact', head: true })
          .eq('workspace_id', ws.id).eq('status', 'Meeting Booked').gte('updated_at', weekStartIso),
        adminClient.from('leads').select('*', { count: 'exact', head: true })
          .eq('workspace_id', ws.id).eq('reply_status', 'positive').gte('updated_at', weekStartIso),
        adminClient.from('leads').select('*', { count: 'exact', head: true })
          .eq('workspace_id', ws.id).not('status', 'in', '("New","Won","Lost")').gte('updated_at', weekStartIso),
      ]);

      const teaserParts = [
        bookingsThisWeek ? `${bookingsThisWeek} rendez-vous booké${bookingsThisWeek > 1 ? 's' : ''}` : null,
        positiveRepliesThisWeek ? `${positiveRepliesThisWeek} réponse${positiveRepliesThisWeek > 1 ? 's' : ''} positive${positiveRepliesThisWeek > 1 ? 's' : ''}` : null,
        leadsAdvanced ? `${leadsAdvanced} lead${leadsAdvanced > 1 ? 's' : ''} avancé${leadsAdvanced > 1 ? 's' : ''} dans le pipeline` : null,
      ].filter(Boolean);

      const body = teaserParts.length > 0
        ? `Cette semaine : ${teaserParts.join(' · ')}. Consultez le bilan complet.`
        : 'Consultez votre bilan de la semaine et l\'activité de votre pipeline.';

      const nowIso = new Date().toISOString();
      await adminClient.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: ws.owner_id,
        workspace_id: ws.id,
        type: 'weekly_report_reminder',
        title: '📈 Votre bilan de la semaine',
        body,
        link: '/weekly-report',
        is_read: false,
        created_at: nowIso,
        updated_at: nowIso,
      });

      processed++;
    } catch {
      // Skip workspace on error, continue with the rest
    }
  }

  return NextResponse.json({ ok: true, processed });
}
