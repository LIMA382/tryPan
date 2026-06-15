use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { DAYS, SLOTS } from '@/lib/date';
import { buildGroceryList, loadAllVisibleMeals, loadPlanForUser, setPlannedMealForUser } from '@/lib/dataStore';

function PlannerContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [over, setOver] = useState(null);
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
      setError(err.message || 'Could not load planner.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  const byId = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals]);
  const grocery = useMemo(() => (plan ? buildGroceryList(meals, plan).slice(0, 8) : []), [meals, plan]);
  const draggableMeals = meals.filter((meal) => !meal.user_id || meal.user_id === user.id || meal.is_public);

  async function drop(day, slot, e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('mealId');
    if (!id) return;
    setPlan(await setPlannedMealForUser(user, plan, day, slot, id));
    setOver(null);
  }

  async function clearSlot(day, slot) {
    setPlan(await setPlannedMealForUser(user, plan, day, slot, null));
  }

  return (
    <AppFrame user={user} title="Weekly planner" subtitle="Drag meals into lunch and dinner slots. Your grocery list updates automatically.">
      {error && <div className="notice error-notice">{error}</div>}
      {loading || !plan ? <div className="card">Loading planner…</div> : null}

      {!loading && plan ? (
        <div className="planner">
          <aside className="preview-card">
            <h3>Meals</h3>
            <p>Drag to calendar</p>
            <div className="drag-list">
              {draggableMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="drag-meal"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('mealId', meal.id)}
                >
                  <strong>{meal.title}</strong>
                  <div className="meta">{meal.prep_time} min · {meal.meal_type}</div>
                </div>
              ))}
            </div>
          </aside>

          <section className="calendar">
            {DAYS.map((day) => (
              <div className="day-row" key={day}>
                <div className="day-label">{day}</div>
                {SLOTS.map((slot) => {
                  const key = `${day}-${slot}`;
                  const meal = byId.get(plan.slots[key]);

                  return (
                    <div
                      key={slot}
                      className={`drop-slot ${over === key ? 'over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setOver(key); }}
                      onDragLeave={() => setOver(null)}
                      onDrop={(e) => drop(day, slot, e)}
                    >
                      <span className="slot-title">{slot}</span>
                      {meal ? (
                        <div className="planned-meal">
                          <strong>{meal.title}</strong>
                          <div className="meta">{meal.prep_time} min · {(meal.tags || []).slice(0, 2).join(', ')}</div>
                          <button className="nav-link" onClick={() => clearSlot(day, slot)}>Remove</button>
                        </div>
                      ) : (
                        <div className="meta">Drop a meal here</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          <aside className="preview-card">
            <h3>Grocery preview</h3>
            <p>{grocery.length} combined items</p>
            <div className="grocery-list">
              {grocery.map((item) => (
                <div className="grocery-item" key={`${item.name}-${item.unit}`}>
                  <input type="checkbox" />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.meals.join(', ')}</small>
                  </div>
                  <span>{item.quantity} {item.unit}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </AppFrame>
  );
}

export default function PlannerPage() {
  return <AuthGate>{(user) => <PlannerContent user={user} />}</AuthGate>;
}
