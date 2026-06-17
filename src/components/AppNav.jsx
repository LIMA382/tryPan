'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AppNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    ['Public meals', '/browse'],
    ['Planner', '/planner'],
    ['My Meals', '/meals'],
    ['Grocery List', '/grocery'],
  ];

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    user?.email;

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="page-shell nav-shell">
      <nav className="nav nav-clean">
        <Link className="logo" href="/">
          try<span>Pan</span>
        </Link>

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
                    transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }}
                  />
                )}
                <span className="nav-tab-label">{label}</span>
              </Link>
            );
          })}

          {user ? (
            <>
              <Link className="signed-in-pill" href="/account">
                {displayName}
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
