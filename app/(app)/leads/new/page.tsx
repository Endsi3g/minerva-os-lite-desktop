import dynamic from 'next/dynamic';

const NewLeadRoot = dynamic(() => import('./_components/new-lead-root'));

export function generateStaticParams() { return []; }

export default function Page() { return <NewLeadRoot />; }
