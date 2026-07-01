import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Public routes that never require auth
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/onboarding',
  '/welcome',
  '/update-password',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Refresh session cookies and get current user
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // 2. Root → /today
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/today', request.url));
  }

  // 3. Public paths bypass all further checks
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // 4. No session → /login
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Session but onboarding incomplete → /onboarding
  //    Check settings for full_name and company_name
  if (pathname !== '/onboarding') {
    const { data: settings } = await supabase
      .from('settings')
      .select('full_name, company_name')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!settings?.full_name || !settings?.company_name) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - api routes (handled server-side)
     * - public file extensions (svg, png, jpg, …)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
