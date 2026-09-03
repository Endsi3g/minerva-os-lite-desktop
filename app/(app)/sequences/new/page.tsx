import { Suspense } from 'react';
import { NewSequenceRoot } from './_components/new-sequence-root';

export default function NewSequencePage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center bg-white"><div className="h-6 w-6 border-2 border-[#1E4B33] border-t-transparent rounded-full animate-spin" /></div>}>
      <NewSequenceRoot />
    </Suspense>
  );
}

