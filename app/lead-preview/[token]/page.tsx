// Static export wrapper — params resolved client-side
import LeadPreviewClient from './lead-preview-client';

export function generateStaticParams() { return []; }

export default function Page() { return <LeadPreviewClient />; }
