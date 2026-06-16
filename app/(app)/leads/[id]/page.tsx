import LeadDetailClient from './_components/lead-detail-client';

export const metadata = {
  title: 'Détails Prospect - Minerva Reach',
  description: 'Fiche détaillée du prospect, observations terrain, historique et notes.',
};

export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDetailClient id={id} />;
}
