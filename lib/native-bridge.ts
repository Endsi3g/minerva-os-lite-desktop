import { Capacitor } from '@capacitor/core';

// Helper to check if running in a client context
const isClient = typeof window !== 'undefined';

export const isNativePlatform = (): boolean => {
  return isClient && Capacitor.isNativePlatform();
};

export async function takePhoto(): Promise<string | null> {
  if (!isClient) return null;

  if (isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });
      return `data:image/jpeg;base64,${photo.base64String}`;
    } catch (err) {
      console.error('Error taking photo with native camera:', err);
      return null;
    }
  } else {
    // Web fallback: programmatically trigger file input and read as Base64 Data URL
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            resolve(null);
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
}

export async function registerPushNotifications(): Promise<string | null> {
  if (!isClient) return null;

  if (isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied push notification permissions.');
      }

      await PushNotifications.register();

      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          console.log('Push notification token received:', token.value);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('Error registering push notifications:', err);
          resolve(null);
        });
      });
    } catch (err) {
      console.error('Push notification registration failed:', err);
      return null;
    }
  } else {
    console.log('Web environment: Push notification simulation registration.');
    return 'web-dummy-token-' + Math.random().toString(36).substring(7);
  }
}

export async function setPersistentItem(key: string, value: string): Promise<void> {
  if (!isClient) return;

  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    } catch (err) {
      console.error('Error setting persistent preference:', err);
    }
  } else {
    localStorage.setItem(key, value);
  }
}

export async function getPersistentItem(key: string): Promise<string | null> {
  if (!isClient) return null;

  if (isNativePlatform()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch (err) {
      console.error('Error getting persistent preference:', err);
      return null;
    }
  } else {
    return localStorage.getItem(key);
  }
}

declare global {
  interface Window {
    electron?: {
      isElectron: boolean;
      exportAudit: (fileName: string, content: string) => Promise<{ success: boolean; filePath?: string }>;
      sendNotification: (title: string, body: string) => Promise<boolean>;
      updateScrapingStatus: (status: 'idle' | 'running', niche?: string, city?: string) => void;
      getDiagnostics: () => Promise<any>;
      triggerUpdateCheck: () => void;
      onUpdateStatus: (callback: (status: string, details?: string) => void) => () => void;
    };
  }
}
