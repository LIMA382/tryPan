'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AppNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

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

  useEffect(() => {
    const active = itemRefs.current[pathname];
    const nav = navRef.current;

    if (!active || !nav) return;

    const activeRect = active.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    setIndicator({
      left: activeRect.left - navRect.left,
      width: activeRect.width,
      ready: true,
    });
  }, [pathname, user]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();

    router.push('/');
    router.refresh();
  }

  return (
    <div className="page-shell">
      <nav className="nav nav-clean">
        <Link className="logo" href="/">
          try<span>Pan</span>
        </Link>

        <div className="nav-links nav-tabs" ref={navRef}>
          {indicator.ready && (
            <span
              className="nav-indicator"
              style={{
                transform: `translateX(${indicator.left}px)`,
                width: indicator.width,
              }}
            />
          )}

          {links.map(([label, href]) => {
            if (!user && href !== '/browse') return null;

            return (
              <Link
                key={href}
                ref={(node) => {
                  if (node) itemRefs.current[href] = node;
                }}
                className={`nav-link nav-tab ${pathname === href ? 'active' : ''}`}
                href={href}
              >
                {label}
              </Link>
            );
          })}

          {user ? (
            <>
              <Link className="signed-in-pill" href="/account">
                {displayName}
              </Link>

              <button className="soft-btn" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="primary-btn" href="/login">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
