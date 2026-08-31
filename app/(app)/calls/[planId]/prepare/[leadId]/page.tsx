import dynamic from 'next/dynamic';

const PageClient = dynamic(() => import('./page-client'));

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes (returning [] is not sufficient) — same pattern as
// app/(app)/field/[planId]/prepare/[leadId]/page.tsx.
export function generateStaticParams() {
  return [{ planId: '_placeholder_', leadId: '_placeholder_' }];
}

export default function Page() { return <PageClient />; }
