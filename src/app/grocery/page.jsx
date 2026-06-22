'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import {
  buildPantryAwareGroceryList,
  loadAllVisibleMeals,
  loadPantryItemsForUser,
  loadPlanForUser,
} from '@/lib/dataStore';

function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function GroceryContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);
  const [view, setView] = useState('missing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [loadedMeals, loadedPlan, loadedPantry] = await Promise.all([
        loadAllVisibleMeals(user),
        loadPlanForUser(user),
        loadPantryItemsForUser(user),
      ]);

      setMeals(loadedMeals);
      setPlan(loadedPlan);
      setPantryItems(loadedPantry);
    } catch (err) {
      setError(err.message || 'Could not load grocery list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  const pantryAwareList = useMemo(
    () => (plan ? buildPantryAwareGroceryList(meals, plan, pantryItems) : []),
    [meals, plan, pantryItems]
  );

  const missingList = useMemo(
    () => pantryAwareList.filter((item) => Number(item.missing_quantity || 0) > 0),
    [pantryAwareList]
  );

  const displayList = view === 'all' ? pantryAwareList : missingList;

  const plannedMeals = useMemo(() => {
    if (!plan) return [];
    const byId = new Map(meals.map((meal) => [meal.id, meal]));
    return Object.values(plan.slots || {}).map((id) => byId.get(id)).filter(Boolean);
  }, [meals, plan]);

  const weekTotal = plannedMeals.reduce((sum, meal) => sum + Number(meal.price || 0), 0);
  const coveredCount = pantryAwareList.filter((item) => item.has_enough).length;
  const coverage = pantryAwareList.length ? Math.round((coveredCount / pantryAwareList.length) * 100) : 0;

  const grouped = displayList.reduce((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  function copy() {
    const text = missingList
      .map((item) => `${item.name} — buy ${item.missing_quantity} ${item.unit} (need ${item.needed_quantity}, have ${item.pantry_quantity})`)
      .join('\n');
    navigator.clipboard?.writeText(text);
  }

  return (
    <AppFrame
      user={user}
      title="Smart grocery list"
      subtitle="tryPan compares the meals in your weekly plan against your pantry and shows only what you still need to buy."
      action={<button className="primary-btn" onClick={copy}>Copy missing list</button>}
    >
      {error && <div className="notice error-notice">{error}</div>}
      {loading ? <div className="card">Loading grocery list…</div> : null}

      <div className="grocery-summary panel-soft smart-grocery-summary">
        <div><span>Planned meals</span><strong>{plannedMeals.length}</strong></div>
        <div><span>Needed items</span><strong>{pantryAwareList.length}</strong></div>
        <div><span>Missing items</span><strong>{missingList.length}</strong></div>
        <div><span>Pantry coverage</span><strong>{coverage}%</strong></div>
        <div><span>Estimated meals</span><strong>{price(weekTotal)}</strong></div>
      </div>

      <div className="smart-grocery-toolbar">
        <div className="filter-row">
          <button className={`filter-chip ${view === 'missing' ? 'active' : ''}`} onClick={() => setView('missing')}>Only missing</button>
          <button className={`filter-chip ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>All planned ingredients</button>
        </div>

        <Link className="soft-btn" href="/pantry">Edit pantry</Link>
      </div>

      <div className="grocery-list clean-grocery-list smart-grocery-list">
        {Object.entries(grouped).map(([category, items]) => (
          <section className="card category" key={category}>
            <h3>{category}</h3>

            {items.map((item) => (
              <div className={`grocery-item smart-grocery-item ${item.has_enough ? 'covered' : 'missing'}`} key={`${item.name}-${item.unit}`}>
                <div className="grocery-status-dot" />

                <div>
                  <strong>{item.name}</strong>
                  <small>Used in: {item.meals.join(', ')}</small>
                  <div className="grocery-amount-line">
                    <span>Need {item.needed_quantity} {item.unit}</span>
                    <span>Have {item.pantry_quantity} {item.unit}</span>
                  </div>
                </div>

                <div className="grocery-buy-amount">
                  {item.has_enough ? (
                    <>
                      <strong>Enough</strong>
                      <small>{item.remaining_quantity} {item.unit} left</small>
                    </>
                  ) : (
                    <>
                      <strong>{item.missing_quantity} {item.unit}</strong>
                      <small>to buy</small>
                    </>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}

        {!loading && !displayList.length && view === 'missing' ? (
          <div className="card empty-state-card">
            <h3>Your pantry covers this plan</h3>
            <p>No missing ingredients found. You can still switch to “All planned ingredients” to see what will be used.</p>
          </div>
        ) : null}

        {!loading && !pantryAwareList.length ? (
          <div className="card">Plan meals first to generate your grocery list.</div>
        ) : null}
      </div>
    </AppFrame>
  );
}

export default function GroceryPage() {
  return <AuthGate>{(user) => <GroceryContent user={user} />}</AuthGate>;
}
