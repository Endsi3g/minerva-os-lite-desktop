import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const AUTOMATION_TO_CRON: Record<string, string> = {
  'enrich-leads': '/api/cron/enrich-leads',
  'gmail-replies': '/api/cron/gmail-check-replies',
  'email-sequences': '/api/cron/email-sequences',
  'weekly-report': '/api/cron/weekly-report',
  'process-queue': '/api/cron/process-queue',
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { automation } = await req.json();
    const cronPath = AUTOMATION_TO_CRON[automation];
    if (!cronPath) return NextResponse.json({ error: 'Unknown automation' }, { status: 400 });

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    const result = await fetch(`${origin}${cronPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
        'authorization': `Bearer ${cronSecret}`,
      },
    });

    const data = await result.json().catch(() => ({}));
    return NextResponse.json({ success: result.ok, status: result.status, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
