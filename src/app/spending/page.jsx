'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import {
  buildPantryRecap,
  loadAllVisibleMeals,
  loadPantryItemsForUser,
  loadPantryTripsForUser,
  loadPlanForUser,
} from '@/lib/dataStore';

function money(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function SpendingContent({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async function load() {
    setLoading(true);
    setError('');
    try {
      const [trips, pantryItems, meals, plan] = await Promise.all([
        loadPantryTripsForUser(user),
        loadPantryItemsForUser(user),
        loadAllVisibleMeals(user),
        loadPlanForUser(user),
      ]);
      setAnalytics(buildPantryRecap(trips, pantryItems, meals, plan));
    } catch (err) {
      setError(err.message || 'Could not load spending analytics.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const maxMonth = useMemo(() => Math.max(...(analytics?.monthlyRows || []).map((row) => Number(row.total || 0)), 1), [analytics]);
  const maxWeek = useMemo(() => Math.max(...(analytics?.weeklyRows || []).map((row) => Number(row.total || 0)), 1), [analytics]);

  return (
    <AppFrame user={user} title="Spending" subtitle="Estimate weekly and monthly food spending from supermarket trips. Free items are ignored." eyebrow="Analytics">
      {error && <div className="notice error-notice">{error}</div>}
      {loading && <div className="card skeleton-card"><div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>}

      {!loading && !error && (analytics?.weeklyRows?.length || analytics?.monthlyRows?.length || analytics?.plannedMealValue || analytics?.pantryValue) ? null : (!loading && !error ? <div className="empty-state-card card"><h3>No spending data yet</h3><p>Add a supermarket trip in Pantry. Free / already-had items will be excluded automatically.</p></div> : null)}

      <section className="analytics-cards page-transition">
        <div className="recap-card dark"><span>This week</span><strong>{money(analytics?.weekSpending)}</strong><small>Logged supermarket spend</small></div>
        <div className="recap-card"><span>This month</span><strong>{money(analytics?.monthSpending)}</strong><small>Current month estimate</small></div>
        <div className="recap-card"><span>Planned meals value</span><strong>{money(analytics?.plannedMealValue)}</strong><small>Current weekly plan</small></div>
        <div className="recap-card"><span>Pantry value</span><strong>{money(analytics?.pantryValue)}</strong><small>Current stock estimate</small></div>
        <div className="recap-card"><span>Most bought</span><strong>{analytics?.mostBoughtIngredient || 'Not enough data'}</strong><small>From supermarket trips</small></div>
        <div className="recap-card"><span>Most planned</span><strong>{analytics?.mostUsedMeal || 'Not enough data'}</strong><small>Current weekly plan</small></div>
      </section>

      <section className="analytics-grid">
        <div className="analytics-chart-card">
          <h3>Monthly spending</h3>
          {(analytics?.monthlyRows || []).map((row) => (
            <div className="bar-row" key={row.month}>
              <span>{row.month}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(4, (Number(row.total || 0) / maxMonth) * 100)}%` }} /></div>
              <strong>{money(row.total)}</strong>
            </div>
          ))}
          {!analytics?.monthlyRows?.length && <p>No monthly spending data yet.</p>}
        </div>

        <div className="analytics-chart-card">
          <h3>Weekly spending</h3>
          {(analytics?.weeklyRows || []).map((row) => (
            <div className="bar-row" key={row.week}>
              <span>{row.week}</span>
              <div className="bar-track"><div className="bar-fill alt" style={{ width: `${Math.max(4, (Number(row.total || 0) / maxWeek) * 100)}%` }} /></div>
              <strong>{money(row.total)}</strong>
            </div>
          ))}
          {!analytics?.weeklyRows?.length && <p>No weekly spending data yet.</p>}
        </div>
      </section>
    </AppFrame>
  );
}

export default function SpendingPage() {
  return <AuthGate>{(user) => <SpendingContent user={user} />}</AuthGate>;
}
