import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAiHealth } from '@/lib/ai-health';

// Periodic background check that at least one AI provider is reachable. Notifies
// each ai_enabled user only on the transition into 'down' (not on every tick while
// still down), mirroring cron/overdue-check's per-user notification pattern.
export async function GET(req: NextRequest) {
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

  const { anyAvailable, providers } = await checkAiHealth();
  const status = anyAvailable ? 'ok' : 'down';
  const now = new Date().toISOString();

  const { data: settingsRows } = await supabase
    .from('settings')
    .select('user_id, workspace_id, ai_enabled, ai_last_health_status');

  let checked = 0;
  let notified = 0;

  for (const setting of settingsRows ?? []) {
    if (!setting.user_id) continue;
    if (setting.ai_enabled === false) continue;
    checked++;

    if (status === 'down' && setting.ai_last_health_status !== 'down') {
      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        user_id: setting.user_id,
        workspace_id: setting.workspace_id,
        type: 'ai_health',
        title: 'IA indisponible ⚠️',
        body: "Aucun provider IA n'est actuellement joignable — vérifiez vos clés API dans Paramètres → IA.",
        link: '/settings',
        is_read: false,
        created_at: now,
        updated_at: now,
      });
      notified++;
    }

    await supabase
      .from('settings')
      .update({ ai_last_health_check_at: now, ai_last_health_status: status })
      .eq('user_id', setting.user_id);
  }

  return NextResponse.json({ ok: true, checked, notified, status, providers });
}
