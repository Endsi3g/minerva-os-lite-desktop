import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Allow static files, favicons, public assets to bypass middleware checks
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname === '/favicon.ico' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.startsWith('/api/') // Let API routes handle their own authentication/redirect logic
  ) {
    return NextResponse.next();
  }

  // Update session and fetch user
  let updateResult;
  try {
    updateResult = await updateSession(request);
  } catch {
    // If Supabase keys are placeholders or not configured, let request through to avoid crashing local build/test
    return NextResponse.next();
  }

  const { supabaseResponse, user, supabase } = updateResult;
  // Public pages that don't require authentication
  const isPublicPage =
    url.pathname === '/login' ||
    url.pathname.startsWith('/invite/') ||
    url.pathname.startsWith('/join/') ||
    url.pathname.startsWith('/lead-preview/') ||
    url.pathname.startsWith('/book/');

  const isLoginPage = url.pathname === '/login';

  // If user is not logged in
  if (!user) {
    if (!isPublicPage) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // If user is logged in and hits /login, redirect to ?next or /welcome
  if (isLoginPage) {
    const next = url.searchParams.get('next');
    url.pathname = (next && next.startsWith('/')) ? next : '/welcome';
    url.searchParams.delete('next');
    return NextResponse.redirect(url);
  }

  // Check if onboarding is completed from public.settings
  let onboardingComplete = false;
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('full_name, company_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settings && settings.full_name && settings.company_name) {
      onboardingComplete = true;
    }
  } catch {
    // Fail-safe to avoid blocking application if DB is in migration or offline during build
    onboardingComplete = true;
  }

  const isOnboardingPage = url.pathname === '/onboarding';
  const isWelcomePage = url.pathname === '/welcome';
  // Allow authenticated users to access the password-reset page regardless of onboarding state
  const isUpdatePasswordPage = url.pathname === '/update-password';

  if (!onboardingComplete) {
    // Logged in but not onboarded: force redirect to /onboarding
    // Allow /welcome so users can land there right after the finalizing step completes
    if (!isOnboardingPage && !isWelcomePage && !isUpdatePasswordPage) {
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  } else {
    // Onboarded: don't let them go back to onboarding page
    if (isOnboardingPage) {
      url.pathname = '/welcome';
      return NextResponse.redirect(url);
    }
  }

  // Root redirect
  if (url.pathname === '/') {
    url.pathname = '/welcome';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
