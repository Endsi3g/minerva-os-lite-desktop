'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import SequenceBuilderPage from '../../_components/sequence-builder-page';

// Reads campaignId client-side via useSearchParams (not an async Server
// Component awaiting `searchParams`) so this route remains static-exportable
// for the Electron/Capacitor builds — a dynamic searchParams read forces
// server rendering and breaks `next build` under EXPORT_MODE.
function NewSequencePageContent() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId') ?? undefined;
  return <SequenceBuilderPage campaignId={campaignId} />;
}

export default function NewSequencePage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
      </div>
    }>
      <NewSequencePageContent />
    </Suspense>
  );
}
