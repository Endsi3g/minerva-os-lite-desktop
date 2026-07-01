import dynamic from 'next/dynamic';

const PageClient = dynamic(() => import('./page-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <PageClient />; }
