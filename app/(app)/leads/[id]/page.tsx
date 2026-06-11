import LeadDetailClient from './_components/lead-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Détails Prospect - Minerva Reach',
  description: 'Fiche détaillée du prospect, observations terrain, historique et notes.',
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <LeadDetailClient id={id} />;
}
