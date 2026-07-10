'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { NewCampaignRoot } from './_components/new-campaign-root';

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
      </div>
    }>
      <NewCampaignRoot />
    </Suspense>
  );
}
