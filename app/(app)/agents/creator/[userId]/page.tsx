import { CreatorProfileRoot } from './_components/creator-profile-root';

export async function generateStaticParams() {
  return [];
}

export default function CreatorProfilePage({ params }: { params: { userId: string } }) {
  return <CreatorProfileRoot userId={params.userId} />;
}
