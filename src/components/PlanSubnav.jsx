'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['Week', '/plan/week'],
  ['Groceries', '/plan/groceries'],
  ['Pantry', '/plan/pantry'],
  ['Budget', '/plan/budget'],
];

export default function PlanSubnav() {
  const pathname = usePathname();
  return (
    <nav className="context-nav" aria-label="Plan sections">
      <span>Plan</span>
      {links.map(([label, href]) => <Link key={href} href={href} className={pathname === href ? 'active' : ''}>{label}</Link>)}
    </nav>
  );
}
