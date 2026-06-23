'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';

export default function AppNav({ user }) {
  const pathname = usePathname();

  const links = [
    ['Public meals', '/browse'],
    ['Planner', '/planner'],
    ['My Meals', '/meals'],
    ['Grocery', '/grocery'],
    ['Pantry', '/pantry'],
    ['Spending', '/spending'],
  ];

  return (
    <div className="page-shell nav-shell">
      <nav className="nav nav-clean">
        <BrandLogo href="/" compact />

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
                <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
                <path d="M4.8 20.1c.7-3.6 3.4-5.7 7.2-5.7s6.5 2.1 7.2 5.7" />
              </svg>
            </Link>
          ) : (
            <Link className="primary-btn nav-action" href="/login">Log in</Link>
          )}
        </div>
      </nav>
    </div>
  );
}
