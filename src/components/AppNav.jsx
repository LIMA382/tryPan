'use client';

import Link from 'next/link';
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

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.username || user?.email;

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

        <div className="nav-links">
          {links.map(([label, href]) => {
            if (!user && href !== '/browse') return null;

            return (
              <Link
                key={href}
                className={`nav-link ${pathname === href ? 'active' : ''}`}
                href={href}
              >
                {label}
              </Link>
            );
          })}

          {user ? (
            <>
              <Link className="signed-in-pill" href="/account">{displayName}</Link>
              <button className="soft-btn" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <Link className="primary-btn" href="/login">Log in</Link>
          )}
        </div>
      </nav>
    </div>
  );
}
