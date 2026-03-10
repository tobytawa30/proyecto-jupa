'use client';

export function isBrowserOnline() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function subscribeToConnectivityChange(callback: (isOnline: boolean) => void) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
