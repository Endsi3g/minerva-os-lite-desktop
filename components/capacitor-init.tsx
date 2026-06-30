'use client';

import { useEffect } from 'react';
import { isNativePlatform } from '@/lib/native-bridge';

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
    }

    init();
  }, []);

  return null;
}
