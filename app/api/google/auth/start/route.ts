import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthorizationUrl, getAuthStatus } from '@/lib/google/google-auth-service';
import { getBaseUrl } from '@/lib/base-url';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const redirectPath = searchParams.get('redirect') || '/integrations';
    const pack = (searchParams.get('pack') || 'identity') as 'identity' | 'communication' | 'documents';
    const json = searchParams.get('json') === 'true';

    const status = await getAuthStatus(supabase, user.id);
    const existingScopes = status.scopes || [];

    const redirectUri = `${getBaseUrl()}/api/google/auth/callback`;
    const oauthUrl = getAuthorizationUrl(redirectUri, user.id, redirectPath, pack, existingScopes);

    if (json) {
      return NextResponse.json({ url: oauthUrl });
    }

    return NextResponse.redirect(oauthUrl);
  } catch (err: any) {
    console.error('[google/auth/start]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
