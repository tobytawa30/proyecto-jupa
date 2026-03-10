'use client';

const DEVICE_ID_KEY = 'jupa-device-id';

export function createOfflineAttemptId() {
  return crypto.randomUUID();
}

export function getOrCreateDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}
