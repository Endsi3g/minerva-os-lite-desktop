import { EditSequenceClient } from './edit-sequence-client';

export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function EditSequencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditSequenceClient templateId={id} />;
}
