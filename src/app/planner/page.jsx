'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { DAYS, SLOTS } from '@/lib/date';
import { buildGroceryList, loadAllVisibleMeals, loadPlanForUser, setPlannedMealForUser } from '@/lib/dataStore';

function price(value) {
  const n = Number(value || 0);
  return `€${n.toFixed(2)}`;
}

function PlannerContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [over, setOver] = useState(null);
  const [selectedMealId, setSelectedMealId] = useState(null);
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
      setSelectedMealId(loadedMeals[0]?.id || null);
    } catch (err) {
      setError(err.message || 'Could not load planner.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  const byId = useMemo(() => new Map(meals.map((meal) => [meal.id, meal])), [meals]);
  const grocery = useMemo(() => (plan ? buildGroceryList(meals, plan).slice(0, 6) : []), [meals, plan]);
  const draggableMeals = meals.filter((meal) => !meal.user_id || meal.user_id === user.id || meal.is_public);

  const plannedMeals = useMemo(() => {
    if (!plan) return [];
    return Object.values(plan.slots || {}).map((id) => byId.get(id)).filter(Boolean);
  }, [plan, byId]);

  const weekTotal = useMemo(() => plannedMeals.reduce((sum, meal) => sum + Number(meal.price || 0), 0), [plannedMeals]);

  async function setSlot(day, slot, mealId) {
    setPlan(await setPlannedMealForUser(user, plan, day, slot, mealId));
  }

  async function drop(day, slot, event) {
    event.preventDefault();
    const id = event.dataTransfer.getData('mealId');
    if (!id) return;
    await setSlot(day, slot, id);
    setOver(null);
  }

  async function useSelected(day, slot) {
    if (!selectedMealId) return;
    await setSlot(day, slot, selectedMealId);
  }

  async function clearSlot(day, slot) {
    await setSlot(day, slot, null);
  }

  return (
    <AppFrame
      user={user}
      title="Weekly planner"
      subtitle="Choose a meal, then click a lunch or dinner slot. You can also drag meals onto the calendar."
      action={<div className="week-total"><span>Week total</span><strong>{price(weekTotal)}</strong></div>}
    >
      {error && <div className="notice error-notice">{error}</div>}
      {loading || !plan ? <div className="card">Loading planner…</div> : null}

      {!loading && plan ? (
        <div className="planner-clean">
          <section className="meal-dock panel-soft">
            <div className="section-header compact">
              <div>
                <h3>Meals</h3>
                <p>Select or drag</p>
              </div>
            </div>

            <div className="drag-list clean-drag-list">
              {draggableMeals.map((meal) => (
                <button
                  type="button"
                  key={meal.id}
                  className={`drag-meal clean-meal ${selectedMealId === meal.id ? 'selected' : ''}`}
                  draggable
                  onClick={() => setSelectedMealId(meal.id)}
                  onDragStart={(event) => event.dataTransfer.setData('mealId', meal.id)}
                >
                  <strong>{meal.title}</strong>
                  <span>{meal.prep_time} min · {meal.meal_type} · {price(meal.price)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="calendar-clean panel-soft">
            <div className="calendar-head">
              <span>Day</span>
              <span>Lunch</span>
              <span>Dinner</span>
            </div>

            {DAYS.map((day) => (
              <div className="day-row clean-day-row" key={day}>
                <div className="day-label clean-day-label">{day}</div>

                {SLOTS.map((slot) => {
                  const key = `${day}-${slot}`;
                  const meal = byId.get(plan.slots[key]);

                  return (
                    <div
                      key={slot}
                      className={`drop-slot clean-slot ${over === key ? 'over' : ''} ${meal ? 'filled' : ''}`}
                      onDragOver={(event) => { event.preventDefault(); setOver(key); }}
                      onDragLeave={() => setOver(null)}
                      onDrop={(event) => drop(day, slot, event)}
                      onClick={() => !meal && useSelected(day, slot)}
                    >
                      <span className="slot-title">{slot}</span>

                      {meal ? (
                        <div className="planned-meal clean-planned-meal">
                          <div>
                            <strong>{meal.title}</strong>
                            <small>{meal.prep_time} min · {price(meal.price)}</small>
                          </div>
                          <button className="mini-btn" onClick={(event) => { event.stopPropagation(); clearSlot(day, slot); }}>Remove</button>
                        </div>
                      ) : (
                        <div className="empty-slot">
                          {selectedMealId ? 'Click to add selected meal' : 'Choose a meal first'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>

          <aside className="planner-summary panel-soft">
            <div className="summary-tile dark">
              <span>Estimated week</span>
              <strong>{price(weekTotal)}</strong>
              <p>{plannedMeals.length} planned meals</p>
            </div>

            <div className="summary-list">
              <h3>Grocery preview</h3>
              {grocery.map((item) => (
                <div className="grocery-mini" key={`${item.name}-${item.unit}`}>
                  <span>{item.name}</span>
                  <strong>{item.quantity} {item.unit}</strong>
                </div>
              ))}
              {!grocery.length && <p>Plan meals to generate your list.</p>}
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
