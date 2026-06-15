'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { buildGroceryList, loadAllVisibleMeals, loadPlanForUser } from '@/lib/dataStore';

function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function GroceryContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [loadedMeals, loadedPlan] = await Promise.all([
        loadAllVisibleMeals(user),
        loadPlanForUser(user),
      ]);
      setMeals(loadedMeals);
      setPlan(loadedPlan);
    } catch (err) {
      setError(err.message || 'Could not load grocery list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  const list = useMemo(() => (plan ? buildGroceryList(meals, plan) : []), [meals, plan]);
  const plannedMeals = useMemo(() => {
    if (!plan) return [];
    const byId = new Map(meals.map((meal) => [meal.id, meal]));
    return Object.values(plan.slots || {}).map((id) => byId.get(id)).filter(Boolean);
  }, [meals, plan]);
  const weekTotal = plannedMeals.reduce((sum, meal) => sum + Number(meal.price || 0), 0);

  const grouped = list.reduce((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  function copy() {
    const text = list.map((item) => `${item.name} — ${item.quantity} ${item.unit}`).join('\n');
    navigator.clipboard?.writeText(text);
  }

  return (
    <AppFrame
      user={user}
      title="Grocery list"
      subtitle="Ingredients are combined from every planned lunch and dinner."
      action={<button className="primary-btn" onClick={copy}>Copy list</button>}
    >
      {error && <div className="notice error-notice">{error}</div>}
      {loading ? <div className="card">Loading grocery list…</div> : null}

      <div className="grocery-summary panel-soft">
        <div>
          <span>Planned meals</span>
          <strong>{plannedMeals.length}</strong>
        </div>
        <div>
          <span>Combined items</span>
          <strong>{list.length}</strong>
        </div>
        <div>
          <span>Estimated week total</span>
          <strong>{price(weekTotal)}</strong>
        </div>
      </div>

      <div className="grocery-list clean-grocery-list">
        {Object.entries(grouped).map(([category, items]) => (
          <section className="card category" key={category}>
            <h3>{category}</h3>
            {items.map((item) => (
              <div className="grocery-item" key={`${item.name}-${item.unit}`}>
                <input type="checkbox" />
                <div>
                  <strong>{item.name}</strong>
                  <small>Used in: {item.meals.join(', ')}</small>
                </div>
                <span>{item.quantity} {item.unit}</span>
              </div>
            ))}
          </section>
        ))}

        {!loading && !list.length ? <div className="card">Plan meals first to generate your grocery list.</div> : null}
      </div>
    </AppFrame>
  );
}

export default function GroceryPage() {
  return <AuthGate>{(user) => <GroceryContent user={user} />}</AuthGate>;
}
