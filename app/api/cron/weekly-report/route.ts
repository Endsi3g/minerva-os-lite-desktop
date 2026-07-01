import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: settingsList } = await admin
    .from('settings')
    .select('user_id, active_workspace_id, full_name, company_name')
    .not('active_workspace_id', 'is', null);

  if (!settingsList?.length) return NextResponse.json({ processed: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  let processed = 0;

  for (const s of settingsList) {
    if (!s.active_workspace_id) continue;
    try {
      const res = await fetch(`${appUrl}/api/insights/weekly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: s.active_workspace_id }),
      });
      if (!res.ok) continue;
      const data = await res.json();

      await admin.from('notifications').insert({
        workspace_id: s.active_workspace_id,
        user_id: s.user_id,
        type: 'report',
        title: `Bilan hebdomadaire Minerva — ${new Date().toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}`,
        body: `${data.metrics?.bookingsThisWeek ?? 0} bookings · ${data.metrics?.positiveRepliesThisWeek ?? 0} réponses positives · ${data.metrics?.nbaAcceptanceRate ?? 0}% NBA accepté`,
        link: '/cockpit',
        is_read: false,
      });

      processed++;
    } catch { continue; }
  }

  return NextResponse.json({ processed, timestamp: new Date().toISOString() });
}
