const STORAGE_KEY = 'trypan.meal-completions.v1';

const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function mealCompletionCost(meal, portions = 1) {
  const recipePortions = Math.max(1, safeNumber(meal?.servings) || 1);
  return Math.round((safeNumber(meal?.price) / recipePortions) * Math.max(0, safeNumber(portions)) * 100) / 100;
}

export function plannedCompletionKey({ weekStartDate, day, slot, mealId }) {
  return [weekStartDate, day, slot, mealId].map((value) => String(value || '')).join('|');
}

export function readMealCompletions() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function recordMealCompletion({ key, meal, portions = 1, weekStartDate, day = '', slot = '' }) {
  if (typeof window === 'undefined') return null;
  const id = key || `cook|${Date.now()}|${meal?.id || meal?.title || 'meal'}`;
  const current = readMealCompletions();
  if (current.some((entry) => entry.id === id)) return null;
  const entry = {
    id,
    meal_id: meal?.id || null,
    title: meal?.title || 'Meal',
    portions: Math.max(0, safeNumber(portions)),
    cost: mealCompletionCost(meal, portions),
    week_start_date: weekStartDate || '',
    day,
    slot,
    completed_at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...current].slice(0, 250)));
  window.dispatchEvent(new CustomEvent('trypan:meal-completed', { detail: entry }));
  return entry;
}

export function removeMealCompletion(id) {
  if (typeof window === 'undefined' || !id) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readMealCompletions().filter((entry) => entry.id !== id)));
  window.dispatchEvent(new CustomEvent('trypan:meal-completed'));
}

export function completedMealKeys(weekStartDate) {
  return new Set(readMealCompletions().filter((entry) => entry.week_start_date === weekStartDate).map((entry) => entry.id));
}

export function completedMealSpend(weekStartDate) {
  return Math.round(readMealCompletions().filter((entry) => entry.week_start_date === weekStartDate).reduce((sum, entry) => sum + safeNumber(entry.cost), 0) * 100) / 100;
}
