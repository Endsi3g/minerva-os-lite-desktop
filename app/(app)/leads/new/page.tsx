import NewLeadRoot from './_components/new-lead-root';

export default function NewLeadPage() {
  return <NewLeadRoot />;
}

// Required for Next.js static export (electron:build / cap:sync)
export function generateStaticParams() {
  return [{}];
}
