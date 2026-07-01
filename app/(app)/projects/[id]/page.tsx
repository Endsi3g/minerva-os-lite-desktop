import dynamic from 'next/dynamic';

const ProjectDetailWrapper = dynamic(() => import('./_components/project-detail-wrapper'));

export function generateStaticParams() { return []; }

export default function Page() { return <ProjectDetailWrapper />; }
