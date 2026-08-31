import dynamic from 'next/dynamic';

const CallsPageClient = dynamic(() => import('./page-client'));

export default function Page() { return <CallsPageClient />; }
