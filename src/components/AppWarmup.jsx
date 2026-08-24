'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES = ['/app', '/plan/week', '/discover', '/library/created', '/pantry', '/plan/groceries', '/plan/budget'];

export default function AppWarmup({ user }) {
  const router = useRouter();
  useEffect(() => {
    ROUTES.forEach((route) => router.prefetch(route));
    const warm = () => import('@/lib/dataStore').then(({ loadAllVisibleMeals, loadPantryItemsForUser, loadPlanForUser, loadProfileForUser }) => {
      Promise.allSettled([loadAllVisibleMeals(user), loadPantryItemsForUser(user), loadPlanForUser(user), loadProfileForUser(user)]);
    });
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(warm, { timeout: 900 }) : window.setTimeout(warm, 300);
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [router, user]);
  return null;
}
