import ProjectDetailRoot from './_components/project-detail-root';

export const metadata = { title: 'Projet' };

export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = 'then' in params ? await params : params;
  return <ProjectDetailRoot id={id} />;
}
