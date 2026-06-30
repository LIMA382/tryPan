'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

function Icon({ type }) {
  if (type === 'browse') return <path d="M5 5.5h14M7 9.5h10M6 14h5M13 14h5M6 18h5M13 18h5" />;
  if (type === 'planner') return <path d="M7 3.5v3M17 3.5v3M4.5 8h15M6 12h3M11 12h3M16 12h2M6 16h3M11 16h3M16 16h2M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" />;
  if (type === 'meals') return <path d="M12 3.8c4.1 0 7.4 2.8 7.4 6.2H4.6c0-3.4 3.3-6.2 7.4-6.2ZM4 13.5h16M5.5 17.5h13" />;
  if (type === 'grocery') return <path d="M6 7h14l-1.7 7.6a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L5.2 4H3M9 20h.01M17 20h.01" />;
  if (type === 'pantry') return <path d="M6 6.5h12M7 6.5l.8 13h8.4l.8-13M9 6.5V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8v1.7M10 10v6M14 10v6" />;
  if (type === 'spending') return <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />;
  return <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z M4.8 20.1c.7-3.6 3.4-5.7 7.2-5.7s6.5 2.1 7.2 5.7" />;
}

export default function AppNav({ user }) {
  const pathname = usePathname();

  const links = [
    ['Public', '/browse', 'browse'],
    ['Planner', '/planner', 'planner'],
    ['Meals', '/meals', 'meals'],
    ['Grocery', '/grocery', 'grocery'],
    ['Pantry', '/pantry', 'pantry'],
    ['Spend', '/spending', 'spending'],
  ];

  return (
    <>
      <div className="page-shell nav-shell mobile-app-topbar">
        <nav className="nav nav-clean">
          <BrandLogo href="/" compact />
          <div className="desktop-nav-links nav-links nav-tabs">
            {links.map(([label, href]) => {
              if (!user && href !== '/browse') return null;
              const active = pathname === href || (href !== '/' && pathname?.startsWith(href));

              return (
                <Link key={href} className={`nav-tab ${active ? 'active' : ''}`} href={href}>
                  {active && (
                    <motion.span
                      className="nav-tab-bg"
                      layoutId="nav-tab-bg"
                      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
                    />
                  )}
                  <span className="nav-tab-label">{label}</span>
                </Link>
              );
            })}

            {user ? (
              <Link className="account-icon-link" href="/account" aria-label="Account">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <Icon type="account" />
                </svg>
              </Link>
            ) : (
              <Link className="primary-btn nav-action" href="/login">Log in</Link>
            )}
          </div>
        </nav>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {(user
          ? [
              ['Planner', '/planner', 'planner'],
              ['Meals', '/meals', 'meals'],
              ['Grocery', '/grocery', 'grocery'],
              ['Pantry', '/pantry', 'pantry'],
              ['Account', '/account', 'account'],
            ]
          : [
              ['Public', '/browse', 'browse'],
              ['Log in', '/login', 'account'],
            ]
        ).map(([label, href, icon]) => {
          const active = pathname === href || (href !== '/' && pathname?.startsWith(href));

          return (
            <Link key={href} className={`mobile-tab ${active ? 'active' : ''} ${!user && href === '/login' ? 'login-tab' : ''}`} href={href}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <Icon type={icon} />
              </svg>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
