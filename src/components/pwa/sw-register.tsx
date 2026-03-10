'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registration.update().catch(() => undefined);
      } catch (error) {
        console.error('No se pudo registrar el service worker:', error);
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
