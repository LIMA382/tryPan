'use client';

import { useEffect, useState } from 'react';

function isMobileInstallSurface() {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 820px)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  return narrow && touch;
}

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!isMobileInstallSurface()) return;

    const dismissed = window.localStorage.getItem('trypan.install.dismissed') === 'yes';

    function onBeforeInstallPrompt(event) {
      if (!isMobileInstallSurface()) return;
      event.preventDefault();
      setPromptEvent(event);
      if (!dismissed) setHidden(false);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice.catch(() => null);
    setHidden(true);
  }

  function dismiss() {
    window.localStorage.setItem('trypan.install.dismissed', 'yes');
    setHidden(true);
  }

  if (hidden || !promptEvent) return null;

  return (
    <div className="install-prompt">
      <div>
        <strong>Install tryPan</strong>
        <span>Add the frying pan to your phone home screen.</span>
      </div>
      <button className="primary-btn" onClick={install}>Install</button>
      <button className="soft-btn" onClick={dismiss}>Later</button>
    </div>
  );
}
