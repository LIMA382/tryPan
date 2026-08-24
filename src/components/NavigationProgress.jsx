'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [moving, setMoving] = useState(false);

  useEffect(() => setMoving(false), [pathname]);
  useEffect(() => {
    let timer;
    function begin(event) {
      const link = event.target.closest?.('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || link.target === '_blank') return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      setMoving(true);
      clearTimeout(timer);
      timer = setTimeout(() => setMoving(false), 1200);
    }
    document.addEventListener('click', begin, true);
    return () => { document.removeEventListener('click', begin, true); clearTimeout(timer); };
  }, []);

  return <div className={`navigation-progress ${moving ? 'active' : ''}`} aria-hidden="true"><span /></div>;
}
