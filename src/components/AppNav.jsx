'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AppNav({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    ['Planner', '/planner'],
    ['My Meals', '/meals'],
    ['Grocery List', '/grocery'],
    ['Browse', '/browse'],
  ];

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="page-shell">
      <nav className="nav">
        <Link className="logo" href="/">
          try<span>Pan</span>
        </Link>

        <div className="nav-links">
          {user &&
            links.map(([label, href]) => (
              <Link
                key={href}
                className={`nav-link ${pathname === href ? 'active' : ''}`}
                href={href}
              >
                {label}
              </Link>
            ))}

          {user ? (
            <button className="soft-btn" onClick={signOut}>
              Sign out
            </button>
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
