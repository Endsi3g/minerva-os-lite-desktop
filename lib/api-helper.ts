import { Capacitor } from '@capacitor/core';

export function getApiUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }

  const isElectron = !!(window as any).electron;
  const isCapacitorNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  const isFileProtocol = window.location.protocol === 'file:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if ((isElectron || isCapacitorNative || isFileProtocol) && !isLocalhost) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite.com';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  return path;
}
