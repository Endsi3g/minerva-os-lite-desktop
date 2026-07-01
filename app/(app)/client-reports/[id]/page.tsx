import dynamic from 'next/dynamic';

const ClientReportDetail = dynamic(() => import('./client-report-detail'));

export function generateStaticParams() { return []; }

export default function Page() { return <ClientReportDetail />; }
