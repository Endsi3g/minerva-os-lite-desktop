export interface OutreachQuotaSettings {
  outreach_daily_quota?: number | null;
  outreach_window_start?: string | null;
  outreach_window_end?: string | null;
  outreach_window_days?: string | null;
}

export function isWithinSendingWindow(
  windowStart: string,
  windowEnd: string,
  windowDays: string,
): boolean {
  const now = new Date();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayName = dayNames[now.getDay()];

  const allowedDays = windowDays.split(',').map((d) => d.trim().toLowerCase());
  if (!allowedDays.includes(todayName)) return false;

  const [startH, startM] = windowStart.split(':').map(Number);
  const [endH, endM] = windowEnd.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM;
}

export async function getRemainingQuota(
  supabase: any,
  workspaceId: string,
  ownerSettings: OutreachQuotaSettings,
): Promise<{ remaining: number; quota: number; sentToday: number }> {
  const quota = ownerSettings.outreach_daily_quota ?? 50;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString());

  const sentToday = count ?? 0;
  return { remaining: Math.max(0, quota - sentToday), quota, sentToday };
}

export async function canSendNow(
  supabase: any,
  workspaceId: string,
  ownerSettings: OutreachQuotaSettings,
): Promise<{ allowed: boolean; reason?: 'outside_window' | 'quota_reached' }> {
  const windowStart = ownerSettings.outreach_window_start ?? '09:00';
  const windowEnd = ownerSettings.outreach_window_end ?? '18:00';
  const windowDays = ownerSettings.outreach_window_days ?? 'mon,tue,wed,thu,fri';

  if (!isWithinSendingWindow(windowStart, windowEnd, windowDays)) {
    return { allowed: false, reason: 'outside_window' };
  }

  const { remaining } = await getRemainingQuota(supabase, workspaceId, ownerSettings);
  if (remaining <= 0) return { allowed: false, reason: 'quota_reached' };

  return { allowed: true };
}
