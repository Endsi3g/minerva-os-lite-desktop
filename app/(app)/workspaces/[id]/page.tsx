import dynamic from 'next/dynamic';

const WorkspaceDetailClient = dynamic(() => import('./_components/workspace-detail-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <WorkspaceDetailClient />; }
