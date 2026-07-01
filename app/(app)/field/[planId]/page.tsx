import dynamic from 'next/dynamic';

const FieldPlanPageClient = dynamic(() => import('./page-client'));

export function generateStaticParams() { return []; }

export default function Page() { return <FieldPlanPageClient />; }
