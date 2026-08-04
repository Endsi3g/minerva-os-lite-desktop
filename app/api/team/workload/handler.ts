import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface MemberWorkload {
  userId: string;
  fullName: string;
  avatarBase64: string | null;
  role: string;
  assignedLeads: number;
  pendingNba: number;
  slaBreached: number;
  bookingsThisWeek: number;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });

  const [membersRes, workspaceRes] = await Promise.all([
    supabase.from('team_members').select('member_user_id, role').eq('workspace_id', workspaceId),
    supabase.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle(),
  ]);

  const memberRows = (membersRes.data ?? []).filter((m) => m.member_user_id);
  const ownerId = workspaceRes.data?.owner_id;

  const allMembers: { userId: string; role: string }[] = [];
  if (ownerId) allMembers.push({ userId: ownerId, role: 'admin' });
  memberRows.forEach((m) => {
    if (m.member_user_id && !allMembers.find((a) => a.userId === m.member_user_id)) {
      allMembers.push({ userId: m.member_user_id, role: m.role });
    }
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.all(
    allMembers.map(async ({ userId, role }, idx) => {
      const [leadsRes, nbaRes, slaRes, bookingsRes, settingsRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .eq('workspace_id', workspaceId)
          .not('status', 'in', '("Won","Lost")'),
        supabase
          .from('agent_actions')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .eq('executed', false)
          .eq('suggested', true),
        supabase
          .from('agent_actions')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .lt('sla_due_at', new Date().toISOString())
          .eq('executed', false),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .eq('status', 'Meeting Booked')
          .gt('updated_at', sevenDaysAgo),
        supabase
          .from('settings')
          .select('full_name, avatar_base64')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      const member: MemberWorkload = {
        userId,
        role,
        fullName: settingsRes.data?.full_name?.trim() || `Membre #${idx + 1}`,
        avatarBase64: settingsRes.data?.avatar_base64 ?? null,
        assignedLeads: leadsRes.count ?? 0,
        pendingNba: nbaRes.count ?? 0,
        slaBreached: slaRes.count ?? 0,
        bookingsThisWeek: bookingsRes.count ?? 0,
      };
      return member;
    })
  );

  return NextResponse.json({ members: results });
}
