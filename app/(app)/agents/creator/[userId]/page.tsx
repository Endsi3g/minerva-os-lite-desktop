import { CreatorProfileRoot } from './_components/creator-profile-root';

export async function generateStaticParams() {
  return [];
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <CreatorProfileRoot userId={userId} />;
}
