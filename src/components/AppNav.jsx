'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BrandLogo from '@/components/BrandLogo';

export default function AppNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    ['Public meals', '/browse'],
    ['Planner', '/planner'],
    ['My Meals', '/meals'],
    ['Grocery List', '/grocery'],
    ['Pantry', '/pantry'],
  ];

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="page-shell nav-shell">
      <nav className="nav nav-clean">
        <BrandLogo href="/" compact withMark={false} />

        <div className="nav-links nav-tabs">
          {links.map(([label, href]) => {
            if (!user && href !== '/browse') return null;
            const active = pathname === href || (href !== '/' && pathname?.startsWith(href));

            return (
              <Link key={href} className={`nav-tab ${active ? 'active' : ''}`} href={href}>
                {active && (
                  <motion.span
                    className="nav-tab-bg"
                    layoutId="nav-tab-bg"
                    transition={{ type: 'spring', stiffness: 500, damping: 38, mass: 0.82 }}
                  />
                )}
                <span className="nav-tab-label">{label}</span>
              </Link>
            );
          })}

          {user ? (
            <>
              <Link className="user-icon-pill" href="/account" aria-label="Account">
                <span aria-hidden="true">👤</span>
              </Link>
              <button className="soft-btn nav-action" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <Link className="primary-btn nav-action" href="/login">Log in</Link>
          )}
        </div>
      </nav>
    </div>
  );
}
