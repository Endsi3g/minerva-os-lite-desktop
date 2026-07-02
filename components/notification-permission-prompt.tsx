'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { requestNotificationPermission } from '@/lib/notification-service';

const COOLDOWN_KEY = 'minerva_notif_prompt_ts';
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // re-ask every 3 days if still not granted

export function NotificationPermissionPrompt() {
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    if (typeof window === 'undefined') return;
    if ((window as any).electron) return; // Electron handles natively
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return; // already done

    // 3-day cooldown to avoid prompting on every single page load
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || '0');
    if (Date.now() - last < COOLDOWN_MS) return;

    const timer = setTimeout(() => {
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      toast(
        Notification.permission === 'denied'
          ? 'Notifications désactivées'
          : 'Activer les notifications Minerva',
        {
          description: Notification.permission === 'denied'
            ? 'Autorisez les notifications dans les paramètres de votre navigateur pour recevoir vos alertes leads, tâches et mises à jour.'
            : 'Recevez des alertes pour vos leads, tâches dues, nouvelles versions et mentions.',
          duration: 15000,
          action: Notification.permission === 'denied'
            ? undefined
            : {
                label: 'Activer',
                onClick: async () => {
                  const perm = await requestNotificationPermission();
                  if (perm === 'granted') {
                    toast.success('Notifications activées ! Vous recevrez vos alertes en temps réel.');
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
