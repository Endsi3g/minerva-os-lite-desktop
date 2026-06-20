import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  // Validate cron secret in production
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Leads created or updated in the last 24h
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, user_id, workspace_id, created_at')
      .gte('created_at', since);

    // Tasks completed today
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id, user_id, workspace_id, updated_at')
      .eq('completed', true)
      .gte('updated_at', today);

    // Aggregate by user
    const byUser: Record<string, { workspaceId: string; newLeads: number; doneTasks: number }> = {};

    for (const lead of recentLeads || []) {
      if (!lead.user_id) continue;
      if (!byUser[lead.user_id]) byUser[lead.user_id] = { workspaceId: lead.workspace_id || '', newLeads: 0, doneTasks: 0 };
      byUser[lead.user_id].newLeads++;
    }

    for (const task of completedTasks || []) {
      if (!task.user_id) continue;
      if (!byUser[task.user_id]) byUser[task.user_id] = { workspaceId: task.workspace_id || '', newLeads: 0, doneTasks: 0 };
      byUser[task.user_id].doneTasks++;
    }

    const userIds = Object.keys(byUser);
    if (userIds.length === 0) return NextResponse.json({ ok: true, processed: 0 });

    const { data: settingsRows } = await supabase
      .from('settings')
      .select('user_id, workspace_id, reminder_overdue, daily_digest, weekly_report')
      .in('user_id', userIds);

    let processed = 0;
    for (const userId of userIds) {
      const setting = (settingsRows || []).find((s: any) => s.user_id === userId);
      if (!setting || !setting.daily_digest) continue;

      const { newLeads, doneTasks, workspaceId } = byUser[userId];
      const nowStr = new Date().toISOString();

      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: setting.workspace_id || workspaceId,
        type: 'digest',
        title: 'Récapitulatif du jour',
        body: `${newLeads} nouveau(x) lead(s), ${doneTasks} tâche(s) complétée(s) aujourd'hui.`,
        link: '/today',
        is_read: false,
        created_at: nowStr,
        updated_at: nowStr,
      });
      processed++;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error('[cron/daily-digest]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
