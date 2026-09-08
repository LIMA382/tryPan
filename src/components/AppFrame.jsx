'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import AppNav from './AppNav';
import PlanSubnav from './PlanSubnav';
import AppWarmup from './AppWarmup';

export default function AppFrame({ user, title, subtitle, children, action, eyebrow = 'tryPan' }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <>
      <AppWarmup user={user} />
      <AppNav user={user} />

      <motion.div
        key={pathname}
        className="page-shell app-layout no-sidebar"
        initial={reduceMotion ? false : { y: 5 }}
        animate={{ y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 46, mass: 0.82 }}
      >
        <main className="main">
          {pathname?.startsWith('/plan') ? <PlanSubnav /> : null}
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
