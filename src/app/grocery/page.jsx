'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { buildGroceryList, loadAllVisibleMeals, loadPlanForUser } from '@/lib/dataStore';

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
  const grouped = list.reduce((acc, item) => {
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  function copy() {
    const text = list.map((i) => `${i.name} — ${i.quantity} ${i.unit}`).join('\n');
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

      <div className="grocery-list">
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
