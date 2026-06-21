import { CampaignDetailRoot } from './_components/campaign-detail-root';

export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignDetailRoot id={id} />;
}
