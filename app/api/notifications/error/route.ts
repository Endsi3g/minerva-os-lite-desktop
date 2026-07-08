import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reportAppError } from '@/lib/error-notifications';

export const dynamic = 'force-dynamic';

// Client-side error reporting sink: the browser has no service-role key, so any
// error caught in the UI (React error boundaries, window.onerror/unhandledrejection,
// route-level error.tsx) POSTs here instead of writing to `notifications` directly.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' && body.message.trim()
      ? body.message.trim()
      : 'Erreur inconnue';

    await reportAppError({
      userId: user.id,
      source: typeof body.source === 'string' ? body.source : 'client',
      title: typeof body.title === 'string' ? body.title : undefined,
      message,
      stack: typeof body.stack === 'string' ? body.stack : undefined,
      context: body.context && typeof body.context === 'object' ? body.context : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Reporting failures should never surface as a visible error themselves.
    return NextResponse.json({ ok: false });
  }
}
