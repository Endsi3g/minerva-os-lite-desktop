import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

function verifyServiceToken(req: NextRequest): boolean {
  const expectedToken = process.env.HERMES_SERVICE_TOKEN;
  if (!expectedToken) return false;
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = authHeader.substring(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyServiceToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, userId } = await req.json();
    if (!workspaceId || !userId) {
      return NextResponse.json({ error: 'workspaceId and userId are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch active route plans for today
    const { data: routePlans, error: rError } = await supabase
      .from('route_plans')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('date', todayStr);

    if (rError) throw rError;

    // Fetch field visits outcomes recorded today
    const { data: visits, error: vError } = await supabase
      .from('field_visits')
      .select('*, leads(*)')
      .eq('user_id', userId)
      .eq('visited_at', todayStr);

    if (vError) throw vError;

    return NextResponse.json({
      date: todayStr,
      routePlans: routePlans || [],
      visits: visits || [],
    });
  } catch (err: any) {
    console.error('[agent-field-briefing]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
