'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { DAYS, SLOTS } from '@/lib/date';
import { buildGroceryList, loadAllVisibleMeals, loadPlanForUser, setPlannedMealForUser } from '@/lib/dataStore';

function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function PlannerContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [over, setOver] = useState(null);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [loadedMeals, loadedPlan] = await Promise.all([loadAllVisibleMeals(user), loadPlanForUser(user)]);
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
  const plannedMeals = useMemo(() => {
    if (!plan) return [];
    return Object.values(plan.slots || {}).map((id) => byId.get(id)).filter(Boolean);
  }, [plan, byId]);
  const grocery = useMemo(() => (plan ? buildGroceryList(meals, plan).slice(0, 8) : []), [meals, plan]);
  const weekTotal = useMemo(() => plannedMeals.reduce((sum, meal) => sum + Number(meal.price || 0), 0), [plannedMeals]);

  const visibleMeals = useMemo(() => {
    const list = meals.filter((meal) => !meal.user_id || meal.user_id === user.id || meal.is_public);
    if (filter === 'All') return list;
    return list.filter((meal) => meal.meal_type === filter.toLowerCase() || meal.meal_type === 'both');
  }, [meals, filter, user.id]);

  const selectedMeal = byId.get(selectedMealId);

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
      subtitle="Pick a meal, then click a lunch or dinner slot. Drag-and-drop still works."
      action={<div className="week-total"><span>Week total</span><strong>{price(weekTotal)}</strong></div>}
    >
      {error && <div className="notice error-notice">{error}</div>}
      {loading || !plan ? <div className="card">Loading planner…</div> : null}

      {!loading && plan ? (
        <div className="planner-v2">
          <section className="planner-main panel-soft">
            <div className="planner-meal-tray">
              <div className="tray-header">
                <div>
                  <h3>Meal tray</h3>
                  <p>Choose one meal, then place it on the calendar.</p>
                </div>
                <div className="filter-row tray-filter">
                  {['All', 'Lunch', 'Dinner'].map((item) => (
                    <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item}</button>
                  ))}
                </div>
              </div>

              <div className="horizontal-meals no-scrollbar">
                {visibleMeals.map((meal) => (
                  <button
                    type="button"
                    key={meal.id}
                    className={`tray-meal ${selectedMealId === meal.id ? 'selected' : ''}`}
                    draggable
                    onClick={() => setSelectedMealId(meal.id)}
                    onDragStart={(event) => event.dataTransfer.setData('mealId', meal.id)}
                  >
                    <strong>{meal.title}</strong>
                    <span>{meal.prep_time} min · {price(meal.price)}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {selectedMeal && (
                  <motion.div
                    key={selectedMeal.id}
                    className="selected-meal-strip"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                  >
                    <span>Selected</span>
                    <strong>{selectedMeal.title}</strong>
                    <em>{price(selectedMeal.price)}</em>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="calendar-v2">
              <div className="calendar-v2-head">
                <span>Day</span>
                <span>Lunch</span>
                <span>Dinner</span>
              </div>

              {DAYS.map((day) => (
                <div className="calendar-v2-row" key={day}>
                  <div className="calendar-day-name">{day.slice(0, 3)}</div>

                  {SLOTS.map((slot) => {
                    const key = `${day}-${slot}`;
                    const meal = byId.get(plan.slots[key]);

                    return (
                      <div
                        key={slot}
                        className={`planner-slot ${over === key ? 'over' : ''} ${meal ? 'filled' : ''}`}
                        onDragOver={(event) => { event.preventDefault(); setOver(key); }}
                        onDragLeave={() => setOver(null)}
                        onDrop={(event) => drop(day, slot, event)}
                        onClick={() => !meal && useSelected(day, slot)}
                      >
                        <span className="slot-title">{slot}</span>
                        <AnimatePresence mode="wait">
                          {meal ? (
                            <motion.div
                              key={meal.id}
                              className="planner-slot-meal"
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ duration: 0.22 }}
                            >
                              <div>
                                <strong>{meal.title}</strong>
                                <small>{meal.prep_time} min · {price(meal.price)}</small>
                              </div>
                              <button className="mini-btn" onClick={(event) => { event.stopPropagation(); clearSlot(day, slot); }}>Remove</button>
                            </motion.div>
                          ) : (
                            <motion.div key="empty" className="empty-slot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              {selectedMeal ? `Add ${selectedMeal.title}` : 'Select a meal'}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <aside className="planner-summary-v2">
            <div className="summary-tile dark">
              <span>Estimated week</span>
              <strong>{price(weekTotal)}</strong>
              <p>{plannedMeals.length} planned meals</p>
            </div>

            <div className="panel-soft summary-list">
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
