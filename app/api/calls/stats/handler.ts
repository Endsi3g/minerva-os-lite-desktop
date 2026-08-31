import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CallOutcome = 'visited' | 'absent' | 'meeting_booked' | 'not_interested';

interface CallStatRow {
  outcome: CallOutcome;
  interest_level: string | null;
  call_duration_seconds: number | null;
  visited_at: string;
  user_id: string | null;
}

interface MemberStat {
  totalCalls: number;
  connected: number;
  meetingsBooked: number;
  totalDuration: number;
  durationCount: number;
}

function periodStart(period: string): string | null {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return null; // 'all'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  const period = req.nextUrl.searchParams.get('period') || 'all';
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  let query = supabase
    .from('field_visits')
    .select('outcome, interest_level, call_duration_seconds, visited_at, user_id')
    .eq('workspace_id', workspaceId)
    .eq('channel', 'call');

  const start = periodStart(period);
  if (start) query = query.gte('visited_at', start);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as CallStatRow[];
  const totalCalls = rows.length;
  const absent = rows.filter((r) => r.outcome === 'absent').length;
  const meetingsBooked = rows.filter((r) => r.outcome === 'meeting_booked').length;
  const notInterested = rows.filter((r) => r.outcome === 'not_interested').length;
  const visitedOnly = rows.filter((r) => r.outcome === 'visited').length;
  const connected = totalCalls - absent;
  const hotLeads = rows.filter((r) => r.interest_level === 'Hot').length;

  const durations = rows
    .map((r) => r.call_duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const avgDurationSeconds = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const totalDurationSeconds = durations.reduce((a, b) => a + b, 0);

  // Tendance par jour (utile surtout pour 7j / 30j)
  const dailyMap = new Map<string, { count: number; connected: number }>();
  for (const r of rows) {
    const day = (r.visited_at || '').slice(0, 10);
    if (!day) continue;
    const entry = dailyMap.get(day) || { count: 0, connected: 0 };
    entry.count += 1;
    if (r.outcome !== 'absent') entry.connected += 1;
    dailyMap.set(day, entry);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Classement par membre de l'équipe
  const perUser = new Map<string, MemberStat>();
  for (const r of rows) {
    if (!r.user_id) continue;
    const entry = perUser.get(r.user_id) || { totalCalls: 0, connected: 0, meetingsBooked: 0, totalDuration: 0, durationCount: 0 };
    entry.totalCalls += 1;
    if (r.outcome !== 'absent') entry.connected += 1;
    if (r.outcome === 'meeting_booked') entry.meetingsBooked += 1;
    if (typeof r.call_duration_seconds === 'number' && r.call_duration_seconds > 0) {
      entry.totalDuration += r.call_duration_seconds;
      entry.durationCount += 1;
    }
    perUser.set(r.user_id, entry);
  }

  const userIds = Array.from(perUser.keys());
  let leaderboard: Array<{
    userId: string;
    fullName: string;
    avatarBase64: string | null;
    totalCalls: number;
    connected: number;
    meetingsBooked: number;
    connectRate: number;
    avgDurationSeconds: number;
  }> = [];

  if (userIds.length > 0) {
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('user_id, full_name, avatar_base64')
      .in('user_id', userIds);
    const nameMap = new Map((settingsRows ?? []).map((s) => [s.user_id as string, s]));

    leaderboard = userIds
      .map((uid) => {
        const stats = perUser.get(uid)!;
        const s = nameMap.get(uid);
        return {
          userId: uid,
          fullName: (s?.full_name as string | undefined)?.trim() || 'Membre',
          avatarBase64: (s?.avatar_base64 as string | null | undefined) ?? null,
          totalCalls: stats.totalCalls,
          connected: stats.connected,
          meetingsBooked: stats.meetingsBooked,
          connectRate: stats.totalCalls > 0 ? Math.round((stats.connected / stats.totalCalls) * 100) : 0,
          avgDurationSeconds: stats.durationCount > 0 ? Math.round(stats.totalDuration / stats.durationCount) : 0,
        };
      })
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }

  return NextResponse.json({
    totals: {
      totalCalls,
      connected,
      connectRate: totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0,
      meetingsBooked,
      meetingRate: totalCalls > 0 ? Math.round((meetingsBooked / totalCalls) * 100) : 0,
      closeRate: connected > 0 ? Math.round((meetingsBooked / connected) * 100) : 0,
      notInterested,
      absent,
      visitedOnly,
      hotLeads,
      avgDurationSeconds,
      totalDurationSeconds,
    },
    daily,
    leaderboard,
  });
}
