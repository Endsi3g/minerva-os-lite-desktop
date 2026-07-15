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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all users settings
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('user_id, workspace_id, reminder_overdue');

    if (!settingsRows || settingsRows.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;

    for (const setting of settingsRows) {
      if (!setting.user_id) continue;
      // Default to true if not explicitly set to false
      if (setting.reminder_overdue === false) continue;

      const userId = setting.user_id;
      const workspaceId = setting.workspace_id;
      const nowStr = new Date().toISOString();

      // 1. Check for overdue leads (tasks / follow-ups overdue)
      const { data: overdueLeads } = await supabase
        .from('leads')
        .select('id, business_name')
        .eq('user_id', userId)
        .lte('next_action_date', today)
        .not('status', 'in', '("Won","Lost")');

      if (overdueLeads && overdueLeads.length > 0) {
        await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          workspace_id: workspaceId,
          type: 'overdue',
          title: 'Prospects en retard ⏳',
          body: `${overdueLeads.length} prospect(s) en attente de relance aujourd'hui.`,
          link: '/leads',
          is_read: false,
          created_at: nowStr,
          updated_at: nowStr,
        });
      }

      // 2. Check for stagnant/rotting leads (no updates in > 7 days)
      const { data: rottingLeads } = await supabase
        .from('leads')
        .select('id, business_name')
        .eq('user_id', userId)
        .lt('updated_at', sevenDaysAgo)
        .in('status', ['Contacted', 'Proposal Sent', 'Negotiation']);

      if (rottingLeads && rottingLeads.length > 0) {
        // Create individual or aggregated notification
        const names = rottingLeads.slice(0, 2).map(l => l.business_name).join(', ');
        const suffix = rottingLeads.length > 2 ? ` et ${rottingLeads.length - 2} autres` : '';
        await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          workspace_id: workspaceId,
          type: 'stale',
          title: 'Prospects stagnants ⚠️',
          body: `Attention, certains leads refroidissent (${names}${suffix}). Pas d'activité depuis 7 jours.`,
          link: '/leads',
          is_read: false,
          created_at: nowStr,
          updated_at: nowStr,
        });
      }

      // 3. Inactivity reminder (no new/updated leads in last 3 days)
      const { data: recentLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', userId)
        .gte('updated_at', threeDaysAgo)
        .limit(1);

      if (!recentLeads || recentLeads.length === 0) {
        await supabase.from('notifications').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          workspace_id: workspaceId,
          type: 'reminder',
          title: 'C’est le moment de prospecter ! 🚀',
          body: "Vous n'avez pas qualifié de nouveaux leads depuis 3 jours. Lancez un scan de prospection.",
          link: '/prospecting',
          is_read: false,
          created_at: nowStr,
          updated_at: nowStr,
        });
      }

      processed++;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error('[cron/overdue-check]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
