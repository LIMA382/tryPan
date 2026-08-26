'use client';

import { useEffect, useState } from 'react';
import { pendingMutations } from '@/lib/offlineState.mjs';

export default function PWARegister() {
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [usingSnapshot, setUsingSnapshot] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(pendingMutations().length);
    const syncNow = async () => {
      setOnline(true); setSyncing(true);
      try { const { syncOfflineChanges } = await import('@/lib/dataStore'); const result = await syncOfflineChanges(); setPending(result.pending); setSyncFailed(Boolean(result.failed)); setUsingSnapshot(false); if (result.synced) window.dispatchEvent(new CustomEvent('trypan:data-synced', { detail: result })); }
      catch { setSyncFailed(true); }
      finally { setSyncing(false); }
    };
    const goOnline = () => syncNow();
    const goOffline = () => setOnline(false);
    const stateChanged = (event) => { setPending(Number(event.detail?.pending || 0)); if (event.detail?.usingSnapshot) setUsingSnapshot(true); };
    const beforeInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('trypan:offline-state', stateChanged);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => null);
    if (navigator.onLine && pendingMutations().length) syncNow();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('trypan:offline-state', stateChanged);
    };
  }, []);

  async function install() {
    await installPrompt?.prompt();
    setInstallPrompt(null);
  }

  const showStatus = !online || syncing || pending > 0 || usingSnapshot;
  const message = !online ? `Offline — showing saved data${pending ? ` · ${pending} change${pending === 1 ? '' : 's'} waiting to sync` : ''}` : syncing ? 'Back online — syncing your changes…' : pending ? `${pending} offline change${pending === 1 ? '' : 's'} waiting to sync` : usingSnapshot ? 'Back online — refresh to check for newer data' : '';
  return <>{showStatus && <div className={`offline-banner ${online ? 'sync-banner' : ''}`}><span>{message}</span>{online && pending && !syncing ? <button type="button" onClick={() => window.dispatchEvent(new Event('online'))}>{syncFailed ? 'Retry sync' : 'Sync now'}</button> : null}</div>}{installPrompt && <button type="button" className="install-app-button" onClick={install}>Install tryPan</button>}</>;
}
