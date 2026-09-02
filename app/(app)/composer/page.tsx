import React, { Suspense } from 'react';
import { ComposerStudioRoot } from './_components/composer-studio-root';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Studio Composer — Minerva OS',
  description: 'Studio de composition de prospection haute densité : variables dynamiques, bibliothèque d\'accroches et assistance IA.',
};

export default function ComposerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center bg-[#fafaf8]">
          <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
        </div>
      }
    >
      <ComposerStudioRoot />
    </Suspense>
  );
}
