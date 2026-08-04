'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function FieldPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/map?tab=tournee');
  }, [router]);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
      <p className="text-xs text-[#7a7a76]">Redirection vers la Carte & Mode Terrain...</p>
    </div>
  );
}

