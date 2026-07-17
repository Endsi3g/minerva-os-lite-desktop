'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { reportClientError } from '@/lib/report-client-error';

// Limite le rayon d'un plantage de la messagerie à cette page, au lieu de
// faire remonter l'erreur jusqu'à global-error.tsx qui blanchit toute
// l'application.
export default function InboxError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    reportClientError({
      source: 'inbox/error-boundary',
      title: 'Erreur de la boîte de réception',
      message: error.message || String(error),
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#fafaf8] px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#059669]/10">
        <Mail className="h-6 w-6 text-[#059669]" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-[#26251e]">Impossible d&apos;afficher la boîte de réception</h2>
        <p className="max-w-sm text-xs text-[#7a7a76]">
          Un problème est survenu au chargement de vos emails. Réessayez — vos messages ne sont pas affectés.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#059669] px-4 text-xs font-bold text-white transition-colors hover:bg-[#047857]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Réessayer
      </button>
    </div>
  );
}
