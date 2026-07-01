import dynamic from 'next/dynamic';

const OutcomeClient = dynamic(() => import('./outcome-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <OutcomeClient />; }
