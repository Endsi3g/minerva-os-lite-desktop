import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processQueue } from '@/app/api/cron/process-queue/route';

// POST: lets a user drain their own workspace's pending email_queue immediately
// (e.g. right after approving a batch of drafts) instead of waiting for the next
// scheduled process-queue tick. Reuses the exact same send/quota/window logic.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: settings } = await supabase.from('settings').select('workspace_id').eq('user_id', user.id).maybeSingle();
  if (!settings?.workspace_id) return NextResponse.json({ error: 'Aucun workspace' }, { status: 400 });

  const result = await processQueue(supabase, settings.workspace_id);
  return NextResponse.json({ ok: true, ...result });
}
