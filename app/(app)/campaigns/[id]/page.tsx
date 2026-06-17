import { CampaignDetailRoot } from './_components/campaign-detail-root';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return <CampaignDetailRoot id={params.id} />;
}
