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

    const { workspaceId, query, niche, city } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let dbQuery = supabase.from('leads').select('*').eq('workspace_id', workspaceId);

    if (niche) {
      dbQuery = dbQuery.ilike('niche', `%${niche}%`);
    }
    if (city) {
      dbQuery = dbQuery.ilike('city', `%${city}%`);
    }
    if (query) {
      dbQuery = dbQuery.or(`business_name.ilike.%${query}%,contact_name.ilike.%${query}%`);
    }

    const { data: leads, error } = await dbQuery.limit(50);
    if (error) throw error;

    return NextResponse.json({ leads });
  } catch (err: any) {
    console.error('[agent-leads-search]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
