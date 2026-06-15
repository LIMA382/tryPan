'use client';

import AppNav from './AppNav';

export default function AppFrame({ user, title, subtitle, children, action, eyebrow = 'tryPan' }) {
  return (
    <>
      <AppNav user={user} />

      <div className="page-shell app-layout no-sidebar page-transition">
        <main className="main">
          <div className="toolbar">
            <div>
              <div className="eyebrow">{eyebrow}</div>
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
