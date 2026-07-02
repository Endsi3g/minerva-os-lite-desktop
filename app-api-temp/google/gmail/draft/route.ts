import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { createGmailDraft } from '@/lib/google/google-gmail-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const body = await req.json();
    const { to, subject, emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing parameters: to, subject, and emailBody are required' }, { status: 400 });
    }

    const result = await createGmailDraft(token, to, subject, emailBody);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[google/gmail/draft]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
