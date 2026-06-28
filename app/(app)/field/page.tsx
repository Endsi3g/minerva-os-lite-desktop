'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FieldRoot } from './_components/field-root';
import { Loader2 } from 'lucide-react';

function FieldPageContent() {
  useEffect(() => { document.title = 'Mode Terrain — Minerva'; }, []);
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || 'default';
  return <FieldRoot planId={planId} />;
}

export default function FieldPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
      </div>
    }>
      <FieldPageContent />
    </Suspense>
  );
}

