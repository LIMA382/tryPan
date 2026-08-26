'use client';

import { hasSupabaseEnv, supabase } from './supabaseClient';
import { enqueueMutation, isOffline } from './offlineState.mjs';
import { isDatabaseMealId } from './mealPersistence.mjs';
import { recipeSlug } from './recipeUtils';
import { mergeActivityRows } from './libraryActivityMerge.mjs';

const KEYS = { saved: 'trypan.saved-recipes.v1', cooked: 'trypan.cooked-recipes.v1', recent: 'trypan.recent-recipes.v1' };
const DATE_FIELDS = { saved: 'saved_at', cooked: 'cooked_at', recent: 'opened_at' };

function read(key) {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function activityKey(meal) { return recipeSlug(meal?.title || meal?.slug || meal?.id); }

function remember(type, meal, occurredAt = new Date().toISOString()) {
  if (!meal?.id || typeof window === 'undefined') return null;
  const key = activityKey(meal);
  const entry = { id: meal.id, meal_id: isDatabaseMealId(meal.id) ? meal.id : null, recipe_key: key, title: meal.title, slug: meal.slug || key, [DATE_FIELDS[type]]: occurredAt };
  const history = read(KEYS[type]).filter((item) => (item.recipe_key || recipeSlug(item.title || item.slug || item.id)) !== key);
  localStorage.setItem(KEYS[type], JSON.stringify([entry, ...history].slice(0, 50)));
  return entry;
}

export const getLibraryHistory = () => ({ saved: read(KEYS.saved), cooked: read(KEYS.cooked), recent: read(KEYS.recent) });
export const rememberSavedRecipe = (meal) => remember('saved', meal);
export const rememberCookedRecipe = (meal) => remember('cooked', meal);
export const rememberRecentRecipe = (meal) => remember('recent', meal);

function payloadFor(user, meal, type, occurredAt = new Date().toISOString()) {
  const key = activityKey(meal);
  return { user_id: user.id, meal_id: isDatabaseMealId(meal.id) ? meal.id : null, recipe_key: key, title: meal.title || '', slug: meal.slug || key, activity_type: type, occurred_at: occurredAt };
}

export async function recordRecipeActivity(user, meal, type) {
  const local = remember(type, meal);
  if (!user?.id || !hasSupabaseEnv() || !supabase) return local;
  const payload = payloadFor(user, meal, type, local?.[DATE_FIELDS[type]]);
  if (isOffline()) {
    enqueueMutation({ key: `${user.id}:activity:${type}:${payload.recipe_key}`, type: 'recipe-activity', userId: user.id, payload });
    return local;
  }
  const { error } = await supabase.from('recipe_activity').upsert(payload, { onConflict: 'user_id,recipe_key,activity_type' });
  if (error && error.code !== '42P01') throw error;
  return local;
}

export async function loadLibraryHistoryForUser(user) {
  const local = getLibraryHistory();
  if (!user?.id || !hasSupabaseEnv() || !supabase || isOffline()) return local;
  const { data, error } = await supabase.from('recipe_activity').select('*').eq('user_id', user.id).order('occurred_at', { ascending: false }).limit(150);
  if (error) return local;
  const localRows = Object.entries(local).flatMap(([type, entries]) => entries.map((entry) => payloadFor(user, entry, type, entry[DATE_FIELDS[type]])));
  const { rows, updates } = mergeActivityRows(data || [], localRows);
  if (updates.length) await supabase.from('recipe_activity').upsert(updates, { onConflict: 'user_id,recipe_key,activity_type' });
  const result = { saved: [], cooked: [], recent: [] };
  for (const row of rows) result[row.activity_type]?.push({ id: row.meal_id || row.recipe_key, meal_id: row.meal_id, recipe_key: row.recipe_key, title: row.title, slug: row.slug, [DATE_FIELDS[row.activity_type]]: row.occurred_at });
  for (const type of Object.keys(result)) result[type].sort((a, b) => String(b[DATE_FIELDS[type]]).localeCompare(String(a[DATE_FIELDS[type]])));
  return result;
}
