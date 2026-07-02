'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { requestNotificationPermission } from '@/lib/notification-service';

const STORAGE_KEY = 'minerva_notif_prompted';

export function NotificationPermissionPrompt() {
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    if (typeof window === 'undefined') return;
    if ((window as any).electron) return; // Electron handles this natively
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Delay slightly so the user has a chance to see the app first
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      toast(
        'Activer les notifications',
        {
          description: 'Recevez des alertes pour vos leads, tâches et nouvelles versions.',
          duration: 12000,
          action: {
            label: 'Activer',
            onClick: async () => {
              const perm = await requestNotificationPermission();
              if (perm === 'granted') {
                toast.success('Notifications activées !');
              } else {
                toast.error('Permission refusée. Modifiez les paramètres de votre navigateur.');
              }
            },
          },
        }
      );
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
