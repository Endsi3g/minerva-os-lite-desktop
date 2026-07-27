// GET /api/leads/assigned — Fetch leads assigned to the current user across ALL workspaces
// Used by the "Mes leads" filter to surface cross-workspace assignments.

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ leads: [] });

  // assigned_to is a uuid column — "assigned to the whole team" is tracked separately
  // via assigned_to_team (boolean), never as a literal string in assigned_to.
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .or(`assigned_to.eq.${user.id},assigned_to_team.eq.true`)
    .order('created_at', { ascending: false });

  return NextResponse.json({ leads: leads || [] });
}
