import dynamic from 'next/dynamic';

const LeadDetailWrapper = dynamic(() => import('./_components/lead-detail-wrapper'));

export function generateStaticParams() { return []; }

export default function Page() { return <LeadDetailWrapper />; }
