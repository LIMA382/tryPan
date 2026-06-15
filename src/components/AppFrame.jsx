'use client';

import Link from 'next/link';
import AppNav from './AppNav';

export default function AppFrame({ user, title, subtitle, children, action }) {
  return (
    <>
      <AppNav user={user} />
      <div className="page-shell app-layout">
        <aside className="sidebar preview-card">
          <Link className="nav-link" href="/planner">Weekly planner</Link>
          <Link className="nav-link" href="/meals">My meals</Link>
          <Link className="nav-link" href="/grocery">Grocery list</Link>
          <Link className="nav-link" href="/browse">Browse public</Link>
          <div className="notice">Signed in as<br /><strong>{user.email}</strong></div>
        </aside>
        <main className="main">
          <div className="toolbar">
            <div><div className="eyebrow">tryPan</div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
