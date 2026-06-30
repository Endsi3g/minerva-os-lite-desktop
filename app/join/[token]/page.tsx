// Static export wrapper — params resolved client-side
import PageClient from './page-client';

export function generateStaticParams() { return []; }

export default function Page() { return <PageClient />; }
