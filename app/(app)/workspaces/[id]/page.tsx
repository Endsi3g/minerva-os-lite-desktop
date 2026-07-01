import dynamic from 'next/dynamic';

const WorkspaceDetailWrapper = dynamic(() => import('./_components/workspace-detail-wrapper'));

export function generateStaticParams() { return []; }

export default function Page() { return <WorkspaceDetailWrapper />; }
