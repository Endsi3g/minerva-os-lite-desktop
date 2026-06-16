import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  // Validate cron secret in production
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find leads where next_action_date is today or earlier and not closed
    const { data: overdueLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, user_id, workspace_id, business_name')
      .lte('next_action_date', today)
      .not('status', 'in', '("Won","Lost")');

    if (leadsError) throw leadsError;
    if (!overdueLeads || overdueLeads.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Group by user_id
    const byUser: Record<string, { workspaceId: string; count: number }> = {};
    for (const lead of overdueLeads) {
      if (!lead.user_id) continue;
      if (!byUser[lead.user_id]) {
        byUser[lead.user_id] = { workspaceId: lead.workspace_id || '', count: 0 };
      }
      byUser[lead.user_id].count++;
    }

    // Fetch user settings to check reminder_overdue preference
    const userIds = Object.keys(byUser);
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('user_id, workspace_id, reminder_overdue, daily_digest, weekly_report')
      .in('user_id', userIds);

    let processed = 0;
    for (const userId of userIds) {
      const setting = (settingsRows || []).find((s: any) => s.user_id === userId);
      // null = treat as not subscribed
      if (!setting || !setting.reminder_overdue) continue;

      const { count, workspaceId } = byUser[userId];
      const nowStr = new Date().toISOString();

      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: setting.workspace_id || workspaceId,
        type: 'overdue',
        title: 'Leads en retard',
        body: `${count} prospect(s) nécessitent une action aujourd'hui.`,
        link: '/leads',
        is_read: false,
        created_at: nowStr,
        updated_at: nowStr,
      });
      processed++;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error('[cron/overdue-check]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
