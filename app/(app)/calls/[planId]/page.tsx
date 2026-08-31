import dynamic from 'next/dynamic';

const CallsPlanPageClient = dynamic(() => import('./page-client'));

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes (returning [] is not sufficient). electron/main.cjs's
// findStaticFile() falls back to this _placeholder_ shell for any real id navigated
// to at runtime — all real data loading happens client-side. (Same pattern as
// app/(app)/field/[planId]/page.tsx.)
export function generateStaticParams() {
  return [{ planId: '_placeholder_' }];
}

export default function Page() { return <CallsPlanPageClient />; }
