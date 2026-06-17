'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import AppNav from './AppNav';

export default function AppFrame({ user, title, subtitle, children, action, eyebrow = 'tryPan' }) {
  const pathname = usePathname();

  return (
    <>
      <AppNav user={user} />

      <motion.div
        key={pathname}
        className="page-shell app-layout no-sidebar"
        initial={{ opacity: 0, y: 14, filter: 'blur(5px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <main className="main">
          <div className="toolbar app-toolbar">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {action}
          </div>
          {children}
        </main>
      </motion.div>
    </>
  );
}
