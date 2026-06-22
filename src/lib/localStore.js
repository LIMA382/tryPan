'use client';
import { seedMeals, publicMeals } from './demoData';
import { DAYS, SLOTS, getMonday } from './date';

const MEALS_KEY = 'trypan.meals.v1';
const PLAN_KEY = 'trypan.plan.v1';

const withIds = (items) => items.map((m, idx) => ({ ...m, id: m.id || `meal-${idx}-${Date.now()}`, ingredients: (m.ingredients || []).map((i, j) => Array.isArray(i) ? { id: `ing-${idx}-${j}`, name: i[0], quantity: i[1], unit: i[2], category: i[3] } : i) }));

export function getMeals() {
  if (typeof window === 'undefined') return withIds(seedMeals);
  const raw = localStorage.getItem(MEALS_KEY);
  if (raw) return JSON.parse(raw);
  const seeded = withIds(seedMeals);
  localStorage.setItem(MEALS_KEY, JSON.stringify(seeded));
  return seeded;
}
export function saveMeals(meals) { localStorage.setItem(MEALS_KEY, JSON.stringify(meals)); }
export function getPublicMeals() { return withIds(publicMeals).map((m, i) => ({ ...m, id: `public-${i}` })); }
export function saveMeal(meal) {
  const meals = getMeals();
  const item = { ...meal, id: meal.id || `meal-${crypto.randomUUID?.() || Date.now()}` };
  const next = meals.some(m => m.id === item.id) ? meals.map(m => m.id === item.id ? item : m) : [item, ...meals];
  saveMeals(next); return item;
}
export function copyPublicMeal(meal) {
  return saveMeal({ ...meal, id: undefined, creator: undefined, is_public: false, title: meal.title });
}
export function getPlan() {
  if (typeof window === 'undefined') return emptyPlan();
  const raw = localStorage.getItem(PLAN_KEY);
  return raw ? JSON.parse(raw) : emptyPlan();
}
export function savePlan(plan) { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); }
export function emptyPlan() {
  const slots = {};
  DAYS.forEach(d => SLOTS.forEach(s => { slots[`${d}-${s}`] = null; }));
  return { week_start_date: getMonday(), slots };
}
export function setPlannedMeal(day, slot, mealId) {
  const plan = getPlan();
  const slots = { ...plan.slots, [`${day}-${slot}`]: mealId };
  savePlan({ ...plan, slots });
  return { ...plan, slots };
}
export function buildGroceryList(meals, plan) {
  const byId = new Map(meals.map(m => [m.id, m]));
  const totals = new Map();
  Object.values(plan.slots || {}).forEach(id => {
    const meal = byId.get(id); if (!meal) return;
    (meal.ingredients || []).forEach(ing => {
      const key = `${ing.category || 'Other'}|${ing.name.toLowerCase()}|${ing.unit || ''}`;
      const prev = totals.get(key) || { name: ing.name, unit: ing.unit || '', quantity: 0, category: ing.category || 'Other', meals: new Set() };
      prev.quantity += Number(ing.quantity || 0);
      prev.meals.add(meal.title);
      totals.set(key, prev);
    });
  });
  return Array.from(totals.values()).map(x => ({ ...x, meals: Array.from(x.meals) })).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
