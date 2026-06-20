import { CampaignDetailRoot } from './_components/campaign-detail-root';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignDetailRoot id={id} />;
}
