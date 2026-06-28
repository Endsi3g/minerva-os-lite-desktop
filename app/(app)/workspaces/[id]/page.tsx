import WorkspaceDetailClient from './_components/workspace-detail-client';

export const metadata = {
  title: 'Configuration espace',
  description: 'Configuration et personnalisation visuelle de l\'espace de travail.',
};

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes. We emit a single placeholder route (_placeholder_)
// that will never be navigated to; all real navigation is client-side.
export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  // Handle both Promise and synchronous params to be safe across Next.js versions
  const resolvedParams = 'then' in params ? await params : params;
  return <WorkspaceDetailClient id={resolvedParams.id} />;
}
