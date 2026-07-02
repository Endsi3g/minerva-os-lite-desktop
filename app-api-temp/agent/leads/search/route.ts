import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function verifyServiceToken(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.HERMES_SERVICE_TOKEN || 'hermes_service_token_secret_12345';
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  return authHeader.substring(7) === expectedToken;
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
