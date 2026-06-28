export const metadata = {
  title: 'Nouveau lead',
  description: 'Ajoutez manuellement un nouveau prospect à votre portefeuille.',
};

import NewLeadRoot from './_components/new-lead-root';

export default function NewLeadPage() {
  return <NewLeadRoot />;
}

// Required for Next.js static export (electron:build / cap:sync)
export function generateStaticParams() {
  return [{}];
}
