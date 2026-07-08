'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { reportClientError } from '@/lib/report-client-error';

// Même garde-fou que /map — la mini-carte à clusters de cette page utilise le
// même composant MapLibre sous-jacent.
export default function ProspectingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    reportClientError({
      source: 'prospecting/error-boundary',
      title: 'Erreur de prospection',
      message: error.message || String(error),
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#fafaf8] px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#059669]/10">
        <MapPin className="h-6 w-6 text-[#059669]" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-[#26251e]">La prospection a rencontré un problème</h2>
        <p className="max-w-sm text-xs text-[#7a7a76]">
          Souvent lié à la carte (coordonnées invalides ou tuiles indisponibles). Réessayez, le reste de l&apos;application n&apos;est pas affecté.
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
