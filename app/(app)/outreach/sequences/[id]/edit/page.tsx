import SequenceBuilderPage from '../../../_components/sequence-builder-page';

export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function EditSequencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const { id } = await params;
  const { campaignId } = await searchParams;
  return <SequenceBuilderPage templateId={id} campaignId={campaignId} />;
}
