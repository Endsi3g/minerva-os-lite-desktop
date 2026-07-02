'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Shows a one-time toast if the user explicitly denied notifications
 * so they know where to go to re-enable them in browser settings.
 * Permission requests are now handled by the bell button in the header.
 */
export function NotificationPermissionPrompt() {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;

    if (typeof window === 'undefined') return;
    if ((window as any).electron) return; // Electron handles natively
    if (!('Notification' in window)) return;

    // Only inform user if they explicitly blocked notifications
    if (Notification.permission === 'denied') {
      const timer = setTimeout(() => {
        toast.warning('Notifications bloquées', {
          description: 'Autorisez les notifications Minerva dans les paramètres de votre navigateur pour recevoir vos alertes leads, tâches et mises à jour.',
          duration: 10000,
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
