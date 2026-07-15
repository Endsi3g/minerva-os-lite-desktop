// GET /api/leads/assigned — Fetch leads assigned to the current user across ALL workspaces
// Used by the "Mes leads" filter to surface cross-workspace assignments.

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const TEAM_ASSIGN_VALUE = '__team__';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ leads: [] });

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .or(`assigned_to.eq.${user.id},assigned_to.eq.${TEAM_ASSIGN_VALUE}`)
    .order('created_at', { ascending: false });

  return NextResponse.json({ leads: leads || [] });
}
