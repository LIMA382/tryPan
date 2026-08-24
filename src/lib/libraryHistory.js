'use client';

const SAVED_KEY = 'trypan.saved-recipes.v1';
const COOKED_KEY = 'trypan.cooked-recipes.v1';
const RECENT_KEY = 'trypan.recent-recipes.v1';

function read(key) {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function remember(key, meal, dateField) {
  if (!meal?.id || typeof window === 'undefined') return;
  const entry = { id: meal.id, title: meal.title, slug: meal.slug, [dateField]: new Date().toISOString() };
  const history = read(key).filter((item) => String(item.id) !== String(meal.id));
  localStorage.setItem(key, JSON.stringify([entry, ...history].slice(0, 50)));
}

export const getLibraryHistory = () => ({ saved: read(SAVED_KEY), cooked: read(COOKED_KEY), recent: read(RECENT_KEY) });
export const rememberSavedRecipe = (meal) => remember(SAVED_KEY, meal, 'saved_at');
export const rememberCookedRecipe = (meal) => remember(COOKED_KEY, meal, 'cooked_at');
export const rememberRecentRecipe = (meal) => remember(RECENT_KEY, meal, 'opened_at');

