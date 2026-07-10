import SequenceBuilderPage from '../../_components/sequence-builder-page';

export default async function NewSequencePage({ searchParams }: { searchParams: Promise<{ campaignId?: string }> }) {
  const { campaignId } = await searchParams;
  return <SequenceBuilderPage campaignId={campaignId} />;
}
