'use client';

import { supabase, hasSupabaseEnv } from './supabaseClient';
import { seedMeals, publicMeals } from './demoData';
import {
  getMeals as localGetMeals,
  saveMeal as localSaveMeal,
  saveMeals as localSaveMeals,
  getPublicMeals as localGetPublicMeals,
  copyPublicMeal as localCopyPublicMeal,
  getPlan as localGetPlan,
  savePlan as localSavePlan,
  setPlannedMeal as localSetPlannedMeal,
  buildGroceryList,
  emptyPlan,
} from './localStore';
import { getMonday } from './date';

export { buildGroceryList };

function isDemo() {
  return false;
}

function cleanTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map((x) => x.trim()).filter(Boolean);
  return String(tags || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function normalizeIngredient(row) {
  return {
    id: row.id,
    meal_id: row.meal_id,
    name: row.name || '',
    quantity: Number(row.quantity || 0),
    unit: row.unit || '',
    category: row.category || 'Other',
  };
}

function normalizeMeal(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title || '',
    description: row.description || '',
    instructions: row.instructions || '',
    video_url: row.video_url || '',
    meal_type: row.meal_type || 'both',
    prep_time: Number(row.prep_time || 20),
    servings: Number(row.servings || 2),
    price: Number(row.price || 0),
    tags: cleanTags(row.tags || []),
    is_public: Boolean(row.is_public),
    creator: row.creator || row.profiles?.display_name || null,
    ingredients: (row.meal_ingredients || row.ingredients || []).map(normalizeIngredient),
  };
}

function normalizeSeedMeal(seed, index) {
  return {
    ...seed,
    id: seed.id || `seed-${index}`,
    tags: cleanTags(seed.tags),
    ingredients: (seed.ingredients || []).map((ing, i) =>
      Array.isArray(ing)
        ? { id: `seed-${index}-ing-${i}`, name: ing[0], quantity: ing[1], unit: ing[2], category: ing[3] }
        : ing
    ),
  };
}

async function throwIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function seedAccountIfEmpty(user) {
  if (isDemo() || !user?.id || !hasSupabaseEnv() || !supabase) return;

  const { count, error } = await supabase
    .from('meals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error || count !== 0) return;

  for (const [index, seed] of seedMeals.entries()) {
    const normalized = normalizeSeedMeal(seed, index);
    await saveMealForUser(user, { ...normalized, id: undefined, is_public: Boolean(seed.is_public) });
  }
}

export async function loadMyMeals(user) {
  if (isDemo()) return localGetMeals();
  await seedAccountIfEmpty(user);

  const data = await throwIfError(
    await supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  );

  return (data || []).map(normalizeMeal);
}

export async function loadAllVisibleMeals(user) {
  if (isDemo()) return localGetMeals();

  const data = await throwIfError(
    await supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false })
  );

  return (data || []).map(normalizeMeal);
}

export async function loadPublicMeals(user = null) {
  if (!hasSupabaseEnv() || !supabase) return localGetPublicMeals();

  const data = await throwIfError(
    await supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
  );

  const publicRows = (data || [])
    .filter((meal) => meal.user_id !== user?.id)
    .map(normalizeMeal);

  if (publicRows.length) return publicRows;

  return publicMeals.map((meal, index) => normalizeSeedMeal({ ...meal, id: `starter-public-${index}` }, index));
}

export async function saveMealForUser(user, meal) {
  if (isDemo()) return localSaveMeal(meal);

  const payload = {
    user_id: user.id,
    title: meal.title,
    description: meal.description || '',
    instructions: meal.instructions || '',
    video_url: meal.video_url || '',
    meal_type: meal.meal_type || 'both',
    prep_time: Number(meal.prep_time || 20),
    servings: Number(meal.servings || 2),
    price: Number(meal.price || 0),
    tags: cleanTags(meal.tags),
    is_public: Boolean(meal.is_public),
    updated_at: new Date().toISOString(),
  };

  let saved;
  const editableId =
    meal.id &&
    !String(meal.id).startsWith('seed-') &&
    !String(meal.id).startsWith('public-') &&
    !String(meal.id).startsWith('starter-public-');

  if (editableId) {
    const data = await throwIfError(
      await supabase
        .from('meals')
        .update(payload)
        .eq('id', meal.id)
        .eq('user_id', user.id)
        .select()
        .single()
    );
    saved = data;
  } else {
    const data = await throwIfError(
      await supabase.from('meals').insert(payload).select().single()
    );
    saved = data;
  }

  await throwIfError(await supabase.from('meal_ingredients').delete().eq('meal_id', saved.id));

  const ingredients = (meal.ingredients || [])
    .filter((ing) => String(ing.name || '').trim())
    .map((ing) => ({
      meal_id: saved.id,
      name: String(ing.name || '').trim(),
      quantity: Number(ing.quantity || 0),
      unit: ing.unit || '',
      category: ing.category || 'Other',
    }));

  if (ingredients.length) await throwIfError(await supabase.from('meal_ingredients').insert(ingredients));

  return normalizeMeal({ ...saved, meal_ingredients: ingredients });
}

export async function deleteMealForUser(user, id) {
  if (isDemo()) {
    const next = localGetMeals().filter((m) => m.id !== id);
    localSaveMeals(next);
    return;
  }

  await throwIfError(await supabase.from('meals').delete().eq('id', id).eq('user_id', user.id));
}

export async function copyPublicMealForUser(user, meal) {
  if (isDemo()) return localCopyPublicMeal(meal);
  return saveMealForUser(user, { ...meal, id: undefined, user_id: user.id, is_public: false });
}

async function getOrCreateWeekPlan(user, weekStartDate = getMonday()) {
  const existing = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  return throwIfError(
    await supabase.from('weekly_plans').insert({ user_id: user.id, week_start_date: weekStartDate }).select().single()
  );
}

export async function loadPlanForUser(user) {
  if (isDemo()) return localGetPlan();

  const weekStartDate = getMonday();
  const planRow = await getOrCreateWeekPlan(user, weekStartDate);

  const planned = await throwIfError(
    await supabase.from('planned_meals').select('*').eq('weekly_plan_id', planRow.id)
  );

  const plan = emptyPlan();
  plan.id = planRow.id;
  plan.week_start_date = planRow.week_start_date;

  for (const row of planned || []) {
    plan.slots[`${row.day_of_week}-${row.slot}`] = row.meal_id;
  }

  return plan;
}

export async function setPlannedMealForUser(user, plan, day, slot, mealId) {
  if (isDemo()) return localSetPlannedMeal(day, slot, mealId);

  const planId = plan?.id || (await getOrCreateWeekPlan(user)).id;

  if (!mealId) {
    await throwIfError(
      await supabase
        .from('planned_meals')
        .delete()
        .eq('weekly_plan_id', planId)
        .eq('day_of_week', day)
        .eq('slot', slot)
    );
  } else {
    await throwIfError(
      await supabase
        .from('planned_meals')
        .upsert(
          { weekly_plan_id: planId, meal_id: mealId, day_of_week: day, slot, servings: 1 },
          { onConflict: 'weekly_plan_id,day_of_week,slot' }
        )
    );
  }

  const next = {
    ...plan,
    id: planId,
    slots: { ...(plan?.slots || emptyPlan().slots), [`${day}-${slot}`]: mealId || null },
  };

  if (isDemo()) localSavePlan(next);
  return next;
}
