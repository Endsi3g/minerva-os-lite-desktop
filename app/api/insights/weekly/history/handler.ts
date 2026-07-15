// GET /api/insights/weekly/history?workspaceId=...
// Returns list of all persisted weekly reports for a workspace (newest first).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  const { data: reports, error: dbErr } = await supabase
    .from('weekly_reports')
    .select('id, workspace_id, week_start, week_end, report, metrics, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('week_start', { ascending: false })
    .limit(52); // max 1 year of history

  if (dbErr) {
    console.error('[insights/weekly/history] DB error:', dbErr);
    return NextResponse.json({ reports: [] });
  }

  return NextResponse.json({ reports: reports ?? [] });
}
