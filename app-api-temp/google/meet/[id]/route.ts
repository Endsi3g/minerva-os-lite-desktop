import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { getMeetConferenceDetails } from '@/lib/google/google-meet-service';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const details = await getMeetConferenceDetails(token, params.id);

    return NextResponse.json(details);
  } catch (err: any) {
    console.error('[google/meet/id]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
