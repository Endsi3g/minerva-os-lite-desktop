import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiHealth } from '@/lib/ai-health';

// POST: runs an immediate connectivity check across all AI providers and records
// the result on settings — called right after the user toggles ai_enabled on.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await checkAiHealth();
  const status = result.anyAvailable ? 'ok' : 'down';
  const now = new Date().toISOString();

  await supabase
    .from('settings')
    .update({ ai_last_health_check_at: now, ai_last_health_status: status })
    .eq('user_id', user.id);

  return NextResponse.json({ ...result, status, checkedAt: now });
}
