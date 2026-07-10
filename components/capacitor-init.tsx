'use client';

import { useEffect } from 'react';
import { isNativePlatform, registerPushNotifications } from '@/lib/native-bridge';
import { getApiUrl } from '@/lib/api-helper';

export function CapacitorInit() {
  useEffect(() => {
    if (!isNativePlatform()) return;

    async function init() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {}

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {}

      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        Keyboard.setAccessoryBarVisible({ isVisible: false });
      } catch {}

      try {
        const { Capacitor } = await import('@capacitor/core');
        const token = await registerPushNotifications();
        if (token) {
          await fetch(getApiUrl('/api/push/register-device'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token, platform: Capacitor.getPlatform() }),
          });
        }
      } catch (err) {
        console.error('Failed to register device for push notifications:', err);
      }
    }

    init();
  }, []);

  return null;
}
