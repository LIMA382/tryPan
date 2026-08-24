'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import AppNav from './AppNav';
import PlanSubnav from './PlanSubnav';
import { motionTokens } from '@/lib/motion';
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
        initial={reduceMotion ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : motionTokens.fast, ease: motionTokens.ease }}
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
