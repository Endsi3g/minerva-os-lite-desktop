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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Leads added this week
    const { data: weekLeads } = await supabase
      .from('leads')
      .select('id, user_id, workspace_id, score')
      .gte('created_at', weekAgo);

    if (!weekLeads || weekLeads.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    // Aggregate by user
    const byUser: Record<string, { workspaceId: string; count: number; totalScore: number }> = {};
    for (const lead of weekLeads) {
      if (!lead.user_id) continue;
      if (!byUser[lead.user_id]) byUser[lead.user_id] = { workspaceId: lead.workspace_id || '', count: 0, totalScore: 0 };
      byUser[lead.user_id].count++;
      byUser[lead.user_id].totalScore += lead.score ?? 0;
    }

    const userIds = Object.keys(byUser);
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('user_id, workspace_id, reminder_overdue, daily_digest, weekly_report')
      .in('user_id', userIds);

    let processed = 0;
    for (const userId of userIds) {
      const setting = (settingsRows || []).find((s: any) => s.user_id === userId);
      if (!setting || !setting.weekly_report) continue;

      const { count, workspaceId } = byUser[userId];
      const nowStr = new Date().toISOString();

      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: setting.workspace_id || workspaceId,
        type: 'report',
        title: 'Rapport hebdomadaire',
        body: `Cette semaine : ${count} leads ajoutés, pipeline en bonne santé.`,
        link: '/analytics',
        is_read: false,
        created_at: nowStr,
        updated_at: nowStr,
      });
      processed++;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error('[cron/weekly-report]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
