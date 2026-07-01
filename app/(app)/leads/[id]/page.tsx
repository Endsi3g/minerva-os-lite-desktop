import dynamic from 'next/dynamic';

const LeadDetailClient = dynamic(() => import('./_components/lead-detail-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <LeadDetailClient />; }
