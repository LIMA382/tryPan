'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { DAYS, SLOTS, addDays, addWeeks, formatWeekRange, getMonday } from '@/lib/date';
import { buildPantryAwareGroceryList, loadAllVisibleMeals, loadPantryItemsForUser, loadPlanForUser, setPlannedMealForUser, suggestMealsFromPantry } from '@/lib/dataStore';

function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function PlannerContent({ user }) {
  const mealTrayRef = useRef(null);
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday());

  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);
  const [over, setOver] = useState(null);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [loadedMeals, loadedPlan, loadedPantry] = await Promise.all([
        loadAllVisibleMeals(user),
        loadPlanForUser(user, weekStartDate),
        loadPantryItemsForUser(user),
      ]);

      setMeals(loadedMeals);
      setPlan(loadedPlan);
      setPantryItems(loadedPantry);
      setSelectedMealId(loadedMeals[0]?.id || null);
    } catch (err) {
      setError(err.message || 'Could not load planner.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id, weekStartDate]);

  const byId = useMemo(() => new Map(meals.map((meal) => [meal.id, meal])), [meals]);

  const plannedMeals = useMemo(() => {
    if (!plan) return [];
    return Object.values(plan.slots || []).map((id) => byId.get(id)).filter(Boolean);
  }, [plan, byId]);

  const pantryAwareGrocery = useMemo(() => (plan ? buildPantryAwareGroceryList(meals, plan, pantryItems) : []), [meals, plan, pantryItems]);
  const grocery = useMemo(() => pantryAwareGrocery.filter((item) => Number(item.missing_quantity || 0) > 0).slice(0, 6), [pantryAwareGrocery]);
  const coveredItems = pantryAwareGrocery.filter((item) => item.has_enough).length;

  const weekTotal = useMemo(
    () => plannedMeals.reduce((sum, meal) => sum + Number(meal.price || 0), 0),
    [plannedMeals]
  );

  const visibleMeals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return meals
      .filter((meal) => !meal.user_id || meal.user_id === user.id || meal.is_public)
      .filter((meal) => {
        if (filter === 'All') return true;
        return meal.meal_type === filter.toLowerCase() || meal.meal_type === 'both';
      })
      .filter((meal) => {
        if (!query) return true;
        return [meal.title, meal.description, ...(meal.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(query);
      });
  }, [meals, filter, search, user.id]);

  const selectedMeal = byId.get(selectedMealId);
  const pantrySuggestions = useMemo(() => suggestMealsFromPantry(visibleMeals, pantryItems).slice(0, 4), [visibleMeals, pantryItems]);

  function scrollMeals(direction) {
    const tray = mealTrayRef.current;
    if (!tray) return;

    tray.scrollBy({
      left: direction * Math.max(280, tray.clientWidth * 0.72),
      behavior: 'smooth',
    });
  }


  function moveWeek(direction) {
    setWeekStartDate((current) => addWeeks(current, direction));
  }

  function goToThisWeek() {
    setWeekStartDate(getMonday());
  }

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
      subtitle="Plan breakfast, lunch and dinner. Move between weeks to see what you made before and what you plan next."
      action={<div className="week-total"><span>Week total</span><strong>{price(weekTotal)}</strong></div>}
    >
      <div className="week-switcher panel-soft">
        <button type="button" className="soft-btn" onClick={() => moveWeek(-1)}>← Previous week</button>
        <div>
          <span>Planning week</span>
          <strong>{formatWeekRange(weekStartDate)}</strong>
        </div>
        <button type="button" className="soft-btn" onClick={goToThisWeek}>This week</button>
        <button type="button" className="soft-btn" onClick={() => moveWeek(1)}>Next week →</button>
      </div>

      {error && <div className="notice error-notice">{error}</div>}
      {loading || !plan ? <div className="card">Loading planner…</div> : null}

      {!loading && plan ? (
        <div className="planner-horizontal page-transition">
          <section className="meal-tray-panel panel-soft">
            <div className="tray-topline">
              <div>
                <h3>Meal tray</h3>
                <p>Search, scroll, select, then place meals in the week.</p>
              </div>

              <div className="tray-controls">
                <input
                  className="tray-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search meals…"
                />

                <div className="filter-row tray-filter">
                  {['All', 'Breakfast', 'Lunch', 'Dinner'].map((item) => (
                    <button
                      key={item}
                      className={`filter-chip ${filter === item ? 'active' : ''}`}
                      onClick={() => setFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="tray-scroll-buttons">
                  <button type="button" className="round-btn" onClick={() => scrollMeals(-1)} aria-label="Scroll meals left">←</button>
                  <button type="button" className="round-btn" onClick={() => scrollMeals(1)} aria-label="Scroll meals right">→</button>
                </div>
              </div>
            </div>

            <div className="horizontal-meals meal-tray-scroll" ref={mealTrayRef}>
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

              {!visibleMeals.length && (
                <div className="tray-empty">No meals match this search.</div>
              )}
            </div>

            {pantrySuggestions.length > 0 && (
              <div className="planner-suggestion-strip">
                <span>Good with your pantry</span>
                {pantrySuggestions.map((meal) => (
                  <button type="button" key={meal.id} onClick={() => setSelectedMealId(meal.id)}>
                    {meal.title} · {meal.pantry_coverage}%
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {selectedMeal && (
                <motion.div
                  key={selectedMeal.id}
                  className="selected-meal-strip"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <span>Selected</span>
                  <strong>{selectedMeal.title}</strong>
                  <em>{price(selectedMeal.price)}</em>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="planner-board panel-soft">
            <div className="planner-board-header">
              <div>
                <h3>Calendar</h3>
                <p>Breakfast, lunch and dinner are rows. Days run left to right.</p>
              </div>

              <div className="mini-stats">
                <span>{plannedMeals.length} planned</span>
                <strong>{price(weekTotal)}</strong>
              </div>
            </div>

            <div className="horizontal-calendar-wrap">
              <div className="horizontal-calendar">
                <div className="calendar-corner" />

                {DAYS.map((day, index) => (
                  <div className="calendar-day-header" key={day}>
                    <strong>{day.slice(0, 3)}</strong>
                    <span>{new Date(`${addDays(weekStartDate, index)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}

                {SLOTS.map((slot) => (
                  <div className="calendar-row-fragment" key={slot}>
                    <div className="calendar-slot-label">{slot}</div>

                    {DAYS.map((day) => {
                      const key = `${day}-${slot}`;
                      const meal = byId.get(plan.slots[key]);

                      return (
                        <div
                          key={key}
                          className={`planner-slot horizontal-slot ${over === key ? 'over' : ''} ${meal ? 'filled' : ''}`}
                          onDragOver={(event) => { event.preventDefault(); setOver(key); }}
                          onDragLeave={() => setOver(null)}
                          onDrop={(event) => drop(day, slot, event)}
                          onClick={() => !meal && useSelected(day, slot)}
                        >
                          <AnimatePresence mode="wait">
                            {meal ? (
                              <motion.div
                                key={meal.id}
                                className="planner-slot-meal compact-slot-meal"
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div>
                                  <strong>{meal.title}</strong>
                                  <small>{meal.prep_time} min · {price(meal.price)}</small>
                                </div>

                                <button
                                  className="mini-btn"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    clearSlot(day, slot);
                                  }}
                                >
                                  ×
                                </button>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="empty"
                                className="empty-slot"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                {selectedMeal ? 'Add selected meal' : 'Select a meal'}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="planner-bottom-summary">
            <div className="summary-tile dark">
              <span>Estimated week</span>
              <strong>{price(weekTotal)}</strong>
              <p>{plannedMeals.length} planned meals</p>
            </div>

            <div className="panel-soft summary-list compact-summary-list">
              <h3>Missing from pantry</h3>
              {pantryAwareGrocery.length ? <p>{coveredItems} of {pantryAwareGrocery.length} planned ingredients covered by your pantry.</p> : null}
              {grocery.map((item) => (
                <div className="grocery-mini" key={`${item.name}-${item.unit}`}>
                  <span>{item.name}</span>
                  <strong>{item.missing_quantity} {item.unit}</strong>
                </div>
              ))}
              {!pantryAwareGrocery.length && <p>Plan meals to generate your list.</p>}
              {pantryAwareGrocery.length > 0 && !grocery.length && <p>Your pantry covers this plan.</p>}
            </div>
          </section>
        </div>
      ) : null}
    </AppFrame>
  );
}

export default function PlannerPage() {
  return <AuthGate>{(user) => <PlannerContent user={user} />}</AuthGate>;
}
