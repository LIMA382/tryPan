'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { DAYS, SLOTS, addDays, addWeeks, formatWeekRange, getMonday } from '@/lib/date';
import { buildPantryAwareGroceryList, ensureMealForPlanning, loadAllVisibleMeals, loadPantryItemsForUser, loadPlanForUser, saveSmartPlanForUser, setPlannedMealForUser, suggestMealsFromPantry } from '@/lib/dataStore';
import { buildSmartWeekPlan } from '@/lib/mealRecommendations.mjs';
import { loadStudentSettings } from '@/lib/studentStore';
import { plannedMealCost } from '@/lib/planMetrics.mjs';
import { recipeImageForMeal, recipeSlug } from '@/lib/recipeUtils';

function price(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function servingPrice(meal, servings = 1) {
  return Number(meal?.price || 0) / Math.max(1, Number(meal?.servings || 1)) * Math.max(1, Number(servings || 1));
}

const slotMealIds = (plan, key) => {
  const value = plan?.slots?.[key];
  return Array.isArray(value) ? value : (value ? [value] : []);
};

function PlannerContent({ user }) {
  const searchParams = useSearchParams();
  const mealTrayRef = useRef(null);
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const requestedWeek = searchParams.get('week');
    return /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek || '') ? requestedWeek : getMonday();
  });
  const [mobileDayIndex, setMobileDayIndex] = useState(() => (new Date().getDay() + 6) % 7);

  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);
  const [over, setOver] = useState(null);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoPlanning, setAutoPlanning] = useState(false);
  const [planPreview, setPlanPreview] = useState(null);

  const load = useCallback(async function load() {
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
      const requestedMeal = searchParams.get('recipe');
      setSelectedMealId(loadedMeals.some((meal) => String(meal.id) === requestedMeal) ? requestedMeal : loadedMeals[0]?.id || null);
    } catch (err) {
      setError(err.message || 'Could not load planner.');
    } finally {
      setLoading(false);
    }
  }, [user, weekStartDate, searchParams]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => { window.addEventListener('trypan:data-synced', load); return () => window.removeEventListener('trypan:data-synced', load); }, [load]);

  const byId = useMemo(() => new Map(meals.map((meal) => [meal.id, meal])), [meals]);

  const plannedMeals = useMemo(() => {
    if (!plan) return [];
    return Object.values(plan.slots || []).flatMap((ids) => Array.isArray(ids) ? ids : (ids ? [ids] : [])).map((id) => byId.get(id)).filter(Boolean);
  }, [plan, byId]);

  const pantryAwareGrocery = useMemo(() => (plan ? buildPantryAwareGroceryList(meals, plan, pantryItems) : []), [meals, plan, pantryItems]);
  const grocery = useMemo(() => pantryAwareGrocery.filter((item) => Number(item.missing_quantity || 0) > 0).slice(0, 6), [pantryAwareGrocery]);
  const coveredItems = pantryAwareGrocery.filter((item) => item.has_enough).length;

  const weekTotal = useMemo(() => plannedMealCost(meals, plan), [meals, plan]);

  const dayTotals = useMemo(() => Object.fromEntries(DAYS.map((day) => {
    const dayPlan = {
      ...plan,
      slots: Object.fromEntries(Object.entries(plan?.slots || {}).filter(([key]) => key.startsWith(`${day}-`))),
    };
    return [day, plannedMealCost(meals, dayPlan)];
  })), [meals, plan]);

  const plannedServingsByMeal = useMemo(() => {
    const totals = new Map();
    Object.entries(plan?.slots || {}).forEach(([key]) => {
      slotMealIds(plan, key).forEach((id) => {
        const count = Math.max(1, Number(plan?.servings?.[`${key}:${id}`] || plan?.servings?.[key] || 1));
        totals.set(id, (totals.get(id) || 0) + count);
      });
    });
    return totals;
  }, [plan]);

  function portionStatus(meal) {
    const batch = Math.max(1, Number(meal?.servings || 1));
    const used = plannedServingsByMeal.get(meal.id) || 0;
    if (!used) return `${batch} ${batch === 1 ? 'portion' : 'portions'} per recipe`;
    const remainder = used % batch;
    const left = remainder ? batch - remainder : 0;
    return left ? `${left} ${left === 1 ? 'portion' : 'portions'} left in this batch` : 'Batch fully planned · cook again to add more';
  }

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
    setMobileDayIndex((new Date().getDay() + 6) % 7);
  }

  async function setSlot(day, slot, mealId, mode = 'replace') {
    setError('');
    try {
      let resolvedId = mealId;
      if (mealId) {
        const original = byId.get(mealId);
        const persisted = await ensureMealForPlanning(user, original);
        resolvedId = persisted.id;
        if (resolvedId !== mealId) {
          setMeals((current) => [persisted, ...current.filter((item) => item.id !== mealId && item.id !== resolvedId)]);
          setSelectedMealId(resolvedId);
        }
      }
      setPlan(await setPlannedMealForUser(user, plan, day, slot, resolvedId, null, { mode }));
    } catch (err) { setError(err.message || 'Could not add this meal to the timetable.'); }
  }

  async function drop(day, slot, event) {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/trypan-meal');
    let source = null;
    try { source = raw ? JSON.parse(raw) : null; } catch (_) { source = null; }
    const id = source?.mealId || event.dataTransfer.getData('mealId');
    if (!id) return;
    const targetKey = `${day}-${slot}`;
    const sourceKey = source?.day && source?.slot ? `${source.day}-${source.slot}` : null;
    if (sourceKey === targetKey) return setOver(null);

    try {
      const sourceServings = sourceKey ? Math.max(1, Number(plan?.servings?.[`${sourceKey}:${id}`] || 1)) : null;
      let nextPlan = await setPlannedMealForUser(user, plan, day, slot, id, sourceServings, { mode: 'add' });
      if (sourceKey) {
        nextPlan = await setPlannedMealForUser(user, nextPlan, source.day, source.slot, null, null, { mode: 'remove', removeMealId: id });
      }
      setPlan(nextPlan);
    } catch (err) {
      setError(err.message || 'Could not move this meal.');
    } finally {
      setOver(null);
    }
  }

  async function placeSelectedMeal(day, slot) {
    if (!selectedMealId) return;
    await setSlot(day, slot, selectedMealId, 'add');
  }

  async function clearSlot(day, slot) {
    await setSlot(day, slot, null);
  }

  async function removeSlotMeal(day, slot, mealId) {
    setPlan(await setPlannedMealForUser(user, plan, day, slot, null, null, { mode: 'remove', removeMealId: mealId }));
  }

  async function changeServings(day, slot, mealId, change) {
    const key = `${day}-${slot}`;
    if (!mealId) return;
    const current = Math.max(1, Number(plan.servings?.[`${key}:${mealId}`] || plan.servings?.[key] || 1));
    await setPlan(await setPlannedMealForUser(user, plan, day, slot, mealId, Math.max(1, Math.min(12, current + change)), { mode: 'add' }));
  }

  async function autoPlanWeek() {
    setError('');
    const preview = buildSmartWeekPlan(meals, pantryItems, plan, loadStudentSettings());
    if (!preview.additions.length) return setError('Every available slot is already planned.');
    setPlanPreview(preview);
  }

  async function applySmartPlan() {
    setAutoPlanning(true); setError('');
    try {
      const selectedIds = [...new Set(planPreview.additions.map((item) => item.mealId))];
      const persistedMeals = await Promise.all(selectedIds.map((id) => ensureMealForPlanning(user, byId.get(id))));
      const resolved = new Map(selectedIds.map((id, index) => [id, persistedMeals[index]]));
      const additions = planPreview.additions.map((item) => ({ ...item, mealId: resolved.get(item.mealId)?.id || item.mealId }));
      const slots = Object.fromEntries(Object.entries(planPreview.slots).map(([key, id]) => [key, resolved.get(id)?.id || id]));
      const resolvedPreview = { ...planPreview, slots, additions };
      await saveSmartPlanForUser(user, plan, additions);
      setMeals((current) => [...persistedMeals, ...current.filter((item) => !selectedIds.includes(item.id) && !persistedMeals.some((saved) => saved.id === item.id))]);
      setPlan({ ...resolvedPreview, additions: undefined }); setPlanPreview(null);
    }
    catch (err) { setError(err.message || 'Could not save the smart plan.'); }
    finally { setAutoPlanning(false); }
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
        <button type="button" className="primary-btn" onClick={autoPlanWeek} disabled={autoPlanning || loading}>{autoPlanning ? 'Saving…' : 'Build smart plan'}</button>
      </div>

      {planPreview ? <section className="smart-plan-preview panel-soft"><div><span className="student-kicker">Preview first</span><h3>{planPreview.additions.length} meals ready to add</h3><p>Prioritized pantry coverage, expiring food, your cooking-time limit and variety. Nothing has been saved yet.</p></div><div className="smart-plan-preview-list">{planPreview.additions.slice(0, 6).map((item) => <span key={`${item.day}-${item.slot}`}><strong>{item.day.slice(0, 3)} {item.slot}</strong>{byId.get(item.mealId)?.title}</span>)}{planPreview.additions.length > 6 ? <em>+{planPreview.additions.length - 6} more</em> : null}</div><div className="cook-complete-actions"><button type="button" className="primary-btn" onClick={applySmartPlan} disabled={autoPlanning}>{autoPlanning ? 'Saving plan…' : 'Add to my week'}</button><button type="button" className="soft-btn" onClick={() => setPlanPreview(null)} disabled={autoPlanning}>Cancel</button></div></section> : null}

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
                  <span>{meal.prep_time} min · {price(servingPrice(meal))} per portion</span>
                  <small>{portionStatus(meal)}</small>
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
                  <em>{price(servingPrice(selectedMeal))} per portion</em>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="mobile-planner-panel panel-soft">
            <div className="mobile-planner-head">
              <div>
                <h3>Week plan</h3>
                <p>Tap a meal, then tap a slot. Swipe through the meal tray when you need more options.</p>
              </div>
              <span>{plannedMeals.length} meals</span>
            </div>

            {selectedMeal && (
              <div className="mobile-selected-meal">
                <span>Selected meal</span>
                <strong>{selectedMeal.title}</strong>
                <em>{price(servingPrice(selectedMeal))} per portion</em>
              </div>
            )}

            <div className="mobile-day-tabs" role="tablist" aria-label="Choose day">
              {DAYS.map((day, index) => {
                const dateLabel = new Date(`${addDays(weekStartDate, index)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric' });
                const dayMealCount = SLOTS.reduce((count, slot) => count + slotMealIds(plan, `${day}-${slot}`).length, 0);

                return (
                  <button
                    type="button"
                    key={day}
                    className={`mobile-day-tab ${mobileDayIndex === index ? 'active' : ''}`}
                    onClick={() => setMobileDayIndex(index)}
                    aria-current={mobileDayIndex === index ? 'date' : undefined}
                  >
                    <strong>{day.slice(0, 3)}</strong>
                    <span>{dateLabel}</span>
                    {dayMealCount ? <em>{dayMealCount}</em> : null}
                  </button>
                );
              })}
            </div>

            <div className="mobile-week-stack single-day">
              {(() => {
                const day = DAYS[mobileDayIndex] || DAYS[0];
                const date = new Date(`${addDays(weekStartDate, mobileDayIndex)}T00:00:00`);

                return (
                  <article className="mobile-day-card mobile-day-card-active">
                    <header>
                      <div>
                        <strong>{day}</strong>
                        <span>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </header>

                    <div className="mobile-slot-list">
                      {SLOTS.map((slot) => {
                        const key = `${day}-${slot}`;
                        const slotMeals = slotMealIds(plan, key).map((id) => byId.get(id)).filter(Boolean);

                        return (
                          <div
                            key={key}
                            className={`mobile-slot-card ${slotMeals.length ? 'filled multi-meal' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => placeSelectedMeal(day, slot)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') placeSelectedMeal(day, slot);
                            }}
                          >
                            <span className="mobile-slot-name">{slot}</span>

                            {slotMeals.length ? (
                              <div className="mobile-slot-meals">{slotMeals.map((meal) => { const count = plan.servings?.[`${key}:${meal.id}`] || plan.servings?.[key] || 1; return <div className="mobile-slot-meal" key={meal.id}><div><strong>{meal.title}</strong><small>{meal.prep_time} min · {price(servingPrice(meal, count))} for {count} {Number(count) === 1 ? 'portion' : 'portions'}</small><div className="serving-stepper"><button type="button" onClick={(event) => { event.stopPropagation(); changeServings(day, slot, meal.id, -1); }}>−</button><span>{count}</span><button type="button" onClick={(event) => { event.stopPropagation(); changeServings(day, slot, meal.id, 1); }}>+</button></div></div><button type="button" className="mini-btn" onClick={(event) => { event.stopPropagation(); removeSlotMeal(day, slot, meal.id); }}>×</button></div>; })}<div className="mobile-add-another">＋ Tap to add selected meal</div></div>
                            ) : (
                              <div className="mobile-empty-slot">
                                {selectedMeal ? `Add ${selectedMeal.title}` : 'Choose a meal first'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })()}
            </div>
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
                      const slotMeals = slotMealIds(plan, key).map((id) => byId.get(id)).filter(Boolean);

                      return (
                        <div
                          key={key}
                          className={`planner-slot horizontal-slot ${over === key ? 'over' : ''} ${slotMeals.length ? 'filled' : ''}`}
                          onDragOver={(event) => { event.preventDefault(); setOver(key); }}
                          onDragLeave={() => setOver(null)}
                          onDrop={(event) => drop(day, slot, event)}
                          onClick={() => placeSelectedMeal(day, slot)}
                        >
                          <AnimatePresence mode="wait">
                            {slotMeals.length ? (
                              <motion.div
                                key={slotMeals.map((meal) => meal.id).join('-')}
                                className="planner-slot-meal compact-slot-meal"
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="calendar-meal-cards">{slotMeals.map((meal) => {
                                  const count = plan.servings?.[`${key}:${meal.id}`] || plan.servings?.[key] || 1;
                                  return <div
                                    className="calendar-recipe-card"
                                    key={meal.id}
                                    draggable
                                    style={{ backgroundImage: `linear-gradient(180deg, rgba(24,28,25,.12), rgba(24,28,25,.92)), url("${recipeImageForMeal(meal)}")` }}
                                    onDragStart={(event) => {
                                      event.stopPropagation();
                                      const payload = JSON.stringify({ mealId: meal.id, day, slot });
                                      event.dataTransfer.setData('application/trypan-meal', payload);
                                      event.dataTransfer.setData('mealId', meal.id);
                                      event.dataTransfer.effectAllowed = 'move';
                                    }}
                                  >
                                    <a href={`/recipes/${recipeSlug(meal.title)}`} draggable={false} onDragStart={(event) => event.preventDefault()} onClick={(event) => event.stopPropagation()}>
                                      <strong>{meal.title}</strong>
                                      <small>{count} {Number(count) === 1 ? 'portion' : 'portions'} · {price(servingPrice(meal, count))}</small>
                                    </a>
                                    <div className="calendar-card-portions" aria-label={`Portions of ${meal.title} planned for ${day} ${slot}`}>
                                      <button type="button" aria-label={`Use one fewer portion of ${meal.title}`} disabled={Number(count) <= 1} onClick={(event) => { event.stopPropagation(); changeServings(day, slot, meal.id, -1); }}>−</button>
                                      <span>{count}</span>
                                      <button type="button" aria-label={`Use one more portion of ${meal.title}`} onClick={(event) => { event.stopPropagation(); changeServings(day, slot, meal.id, 1); }}>+</button>
                                    </div>
                                    <button className="mini-btn" aria-label={`Remove ${meal.title}`} onClick={(event) => { event.stopPropagation(); removeSlotMeal(day, slot, meal.id); }}>×</button>
                                  </div>;
                                })}</div>
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

                <div className="calendar-total-label">Day total</div>
                {DAYS.map((day) => <div className="calendar-day-total" key={`${day}-total`}><span>{day.slice(0, 3)}</span><strong>{price(dayTotals[day])}</strong></div>)}
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
