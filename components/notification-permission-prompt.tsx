'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function NotificationPermissionPrompt() {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;

    if (typeof window === 'undefined') return;
    if ((window as any).electron) return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'denied') {
      setTimeout(() => {
        toast.warning('Notifications bloquées', {
          description: 'Autorisez les notifications Minerva dans les paramètres de votre navigateur pour recevoir vos alertes.',
          duration: 10000,
        });
      }, 4000);
      return;
    }

    if (Notification.permission === 'default') {
      // Request permission after user has had a chance to orient themselves
      setTimeout(() => {
        toast('Activer les alertes Minerva ?', {
          description: 'Recevez vos rappels de tâches et alertes leads en temps réel.',
          duration: 12000,
          action: {
            label: 'Activer',
            onClick: () => {
              Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                  toast.success('Notifications activées ! Vous recevrez vos alertes en temps réel.');
                  // Play unlock sound via AudioContext
                  try {
                    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                    if (AudioCtx) {
                      const ctx = new AudioCtx();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.frequency.setValueAtTime(880, ctx.currentTime);
                      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
                      gain.gain.setValueAtTime(0.18, ctx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                      osc.start(ctx.currentTime);
                      osc.stop(ctx.currentTime + 0.4);
                      setTimeout(() => ctx.close().catch(() => {}), 500);
                    }
                  } catch {}
                  new Notification('Minerva OS', {
                    body: 'Les alertes de tâches et leads sont maintenant actives.',
                    icon: '/icon-192.png',
                  });
                }
              }).catch(() => {});
            },
          },
        });
      }, 5000);
    }
  }, []);

  return null;
}
