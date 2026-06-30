'use client';

import { useEffect } from 'react';

function isMobilePwaTarget() {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 820px)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  return narrow && touch;
}

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    if (!isMobilePwaTarget()) {
      navigator.serviceWorker.getRegistrations?.().then((registrations) => {
        registrations
          .filter((registration) => registration.active?.scriptURL?.includes('/sw.js'))
          .forEach((registration) => registration.unregister().catch(() => null));
      }).catch(() => null);
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    });
  }, []);

  return null;
}
