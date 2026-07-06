'use client';

import { useEffect } from 'react';

const RELOAD_FLAG = 'minerva_chunk_reload_at';

// Après un déploiement, le navigateur peut encore avoir en mémoire les noms
// de fichiers JS de l'ancienne version — ces fichiers n'existent plus sur le
// CDN et un clic/navigation déclenche une 404 sur ce chunk (ChunkLoadError),
// perçue comme un plantage aléatoire de page (carte, prospection...).
// Recharge automatiquement une seule fois (garde-fou anti-boucle via
// sessionStorage) pour récupérer la dernière version sans action manuelle.
export function ChunkErrorRecovery() {
  useEffect(() => {
    const isChunkError = (message: string) =>
      /Loading chunk [\w-]+ failed|ChunkLoadError|failed to fetch dynamically imported module/i.test(message);

    const recentlyReloaded = () => {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      return Date.now() - last < 10_000;
    };

    const reload = () => {
      if (recentlyReloaded()) return; // évite une boucle si le rechargement ne résout rien
      sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.message || '')) reload();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || '');
      if (isChunkError(message)) reload();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
