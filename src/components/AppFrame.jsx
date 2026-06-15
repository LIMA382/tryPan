'use client';

import Link from 'next/link';
import AppNav from './AppNav';

export default function AppFrame({ user, title, subtitle, children, action }) {
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.username || user?.email;

  return (
    <>
      <AppNav user={user} />

      <div className="page-shell app-layout">
        <aside className="sidebar preview-card">
          <Link className="nav-link" href="/planner">
            Weekly planner
          </Link>

          <Link className="nav-link" href="/meals">
            My meals
          </Link>

          <Link className="nav-link" href="/grocery">
            Grocery list
          </Link>

          <Link className="nav-link" href="/browse">
            Browse public
          </Link>

          <div className="notice">
            Signed in as
            <br />
            <strong>{displayName}</strong>
          </div>
        </aside>

        <main className="main">
          <div className="toolbar">
            <div>
              <div className="eyebrow">tryPan</div>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>

            {action}
          </div>

          {children}
        </main>
      </div>
    </>
  );
}
