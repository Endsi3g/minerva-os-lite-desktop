import LeadDetailClient from './_components/lead-detail-client';

export const metadata = {
  title: 'Détails Prospect - Minerva Reach',
  description: 'Fiche détaillée du prospect, observations terrain, historique et notes.',
};

// Next.js output: 'export' requires generateStaticParams() to return at least one
// entry for dynamic routes (returning [] is not sufficient — the build checks
// prerenderedRoutes.length > 0). We emit a single placeholder route (/leads/_placeholder_)
// that will never be navigated to; all real navigation is client-side from SQLite/Supabase.
export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <LeadDetailClient id={params.id} />;
}
