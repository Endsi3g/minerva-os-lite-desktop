import dynamic from 'next/dynamic';

const OutcomeClient = dynamic(() => import('./outcome-client'));

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes (returning [] is not sufficient) — same pattern as
// app/(app)/field/[planId]/outcome/[leadId]/page.tsx.
export function generateStaticParams() {
  return [{ planId: '_placeholder_', leadId: '_placeholder_' }];
}

export default function Page() { return <OutcomeClient />; }
