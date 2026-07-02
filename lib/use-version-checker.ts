'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { getApiUrl } from './api-helper';

const POLL_INTERVAL = 5 * 60 * 1000; // every 5 minutes
const STORAGE_KEY = 'minerva_known_version';

export function useVersionChecker() {
  const knownVersion = useRef<string | null>(null);
  const toastShown = useRef(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/version'), { cache: 'no-store' });
      if (!res.ok) return;
      const { version } = await res.json() as { version: string };

      // First load — store the current version
      if (!knownVersion.current) {
        const stored = localStorage.getItem(STORAGE_KEY);
        knownVersion.current = stored || version;
        if (!stored) localStorage.setItem(STORAGE_KEY, version);
        return;
      }

      // New version detected
      if (version !== knownVersion.current && !toastShown.current) {
        toastShown.current = true;
        localStorage.setItem(STORAGE_KEY, version);
        toast(
          `Nouvelle version disponible (v${version})`,
          {
            description: 'Cliquez pour rafraîchir et profiter des dernières améliorations.',
            duration: Infinity,
            action: {
              label: 'Rafraîchir',
              onClick: () => window.location.reload(),
            },
          }
        );
      }
    } catch { /* network unavailable — ignore */ }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [check]);
}
