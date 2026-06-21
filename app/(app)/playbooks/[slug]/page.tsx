import { PlaybookWizard } from './_components/playbook-wizard';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [{ slug: '_placeholder_' }];
}

export default async function PlaybookSlugPage({ params }: Props) {
  const { slug } = await params;
  return <PlaybookWizard slug={slug} />;
}
