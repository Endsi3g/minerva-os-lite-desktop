import dynamic from 'next/dynamic';

const LeadPreviewClient = dynamic(() => import('./lead-preview-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <LeadPreviewClient />; }
