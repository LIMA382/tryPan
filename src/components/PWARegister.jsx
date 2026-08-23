'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const beforeInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => null);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
    };
  }, []);

  async function install() {
    await installPrompt?.prompt();
    setInstallPrompt(null);
  }

  return <>{!online && <div className="offline-banner">Offline mode — saved pages remain available. Changes will need a connection.</div>}{installPrompt && <button type="button" className="install-app-button" onClick={install}>Install tryPan</button>}</>;
}
