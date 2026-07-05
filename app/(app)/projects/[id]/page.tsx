import dynamic from 'next/dynamic';

const ProjectDetailWrapper = dynamic(() => import('./_components/project-detail-wrapper'));

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes (returning [] is not sufficient). electron/main.cjs's
// findStaticFile() falls back to this _placeholder_ shell for any real id/token
// navigated to at runtime — all real data loading happens client-side.
export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default function Page() { return <ProjectDetailWrapper />; }
