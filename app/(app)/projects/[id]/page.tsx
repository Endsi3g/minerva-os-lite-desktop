import dynamic from 'next/dynamic';

const ProjectDetailRoot = dynamic(() => import('./_components/project-detail-root'));

export function generateStaticParams() { return []; }

export default function Page() { return <ProjectDetailRoot />; }
