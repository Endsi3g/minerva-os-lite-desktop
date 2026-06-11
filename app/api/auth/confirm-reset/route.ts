import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/confirm-reset?code=...
 *
 * Supabase sends the user here after they click the password-reset link in
 * their email. We exchange the one-time `code` for a session (PKCE flow)
 * and then redirect them to the password update page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    // No code → send back to login with an error flag
    return NextResponse.redirect(
      `${origin}/login?error=missing_reset_code`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[confirm-reset] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(
      `${origin}/login?error=invalid_reset_code`,
    );
  }

  // Session is now active — redirect to the update-password page
  return NextResponse.redirect(`${origin}/update-password`);
}
