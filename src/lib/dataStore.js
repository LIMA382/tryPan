'use client';

import { supabase, hasSupabaseEnv } from './supabaseClient';
import { seedMeals, publicMeals } from './demoData';
import { starterIngredients, normalizeRegion, slugify } from './ingredientCatalog';
import {
  getMeals as localGetMeals,
  saveMeal as localSaveMeal,
  saveMeals as localSaveMeals,
  getPublicMeals as localGetPublicMeals,
  copyPublicMeal as localCopyPublicMeal,
  getPlan as localGetPlan,
  setPlannedMeal as localSetPlannedMeal,
  buildGroceryList,
  emptyPlan,
} from './localStore';
import { getMonday } from './date';

export { buildGroceryList };

function cleanUnit(unit) {
  return String(unit || '').trim().toLowerCase();
}

function unitInfo(unit) {
  const u = cleanUnit(unit);

  if (u === 'kg') return { group: 'mass', base: 'g', factor: 1000 };
  if (u === 'g' || u === 'gram' || u === 'grams') return { group: 'mass', base: 'g', factor: 1 };

  if (u === 'l' || u === 'liter' || u === 'liters' || u === 'litre' || u === 'litres') return { group: 'volume', base: 'ml', factor: 1000 };
  if (u === 'ml') return { group: 'volume', base: 'ml', factor: 1 };

  const countUnits = {
    unit: 'unit', units: 'unit', piece: 'unit', pieces: 'unit', pc: 'unit', pcs: 'unit',
    can: 'can', cans: 'can', jar: 'jar', jars: 'jar', bottle: 'bottle', bottles: 'bottle',
    head: 'head', heads: 'head', bunch: 'bunch', bunches: 'bunch', loaf: 'loaf', loaves: 'loaf',
    slice: 'slice', slices: 'slice', clove: 'clove', cloves: 'clove', egg: 'egg', eggs: 'egg',
    tbsp: 'tbsp', tsp: 'tsp', serving: 'serving', servings: 'serving', pack: 'pack', packs: 'pack',
  };

  if (countUnits[u]) return { group: countUnits[u], base: countUnits[u], factor: 1 };

  return { group: u || 'unit', base: u || 'unit', factor: 1 };
}

function toBaseQuantity(quantity, unit) {
  const info = unitInfo(unit);
  return Number(quantity || 0) * info.factor;
}

function fromBaseQuantity(quantity, unit) {
  const info = unitInfo(unit);
  const value = Number(quantity || 0) / info.factor;
  return Math.round(value * 100) / 100;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function calculateIngredientCost(ingredient) {
  const price = Number(ingredient?.estimated_price || 0);
  const quantity = Number(ingredient?.quantity || 0);
  if (!price || !quantity) return 0;

  const unit = ingredient?.unit || '';
  const priceUnit = ingredient?.price_unit || unit;
  const unitMeta = unitInfo(unit);
  const priceMeta = unitInfo(priceUnit);

  if (unitMeta.group === priceMeta.group && unitMeta.base === priceMeta.base) {
    const quantityBase = toBaseQuantity(quantity, unit);
    const priceUnitBase = toBaseQuantity(1, priceUnit);
    if (!priceUnitBase) return 0;
    return roundMoney((quantityBase / priceUnitBase) * price);
  }

  const cleanUnitName = cleanUnit(unit);
  const cleanPriceUnit = cleanUnit(priceUnit);
  if (cleanUnitName && cleanPriceUnit && cleanUnitName === cleanPriceUnit) {
    return roundMoney(quantity * price);
  }

  // Last-resort fallback for count-based items.
  return roundMoney(quantity * price);
}

export function calculateMealPrice(ingredients = []) {
  return roundMoney(
    (ingredients || []).reduce((sum, ingredient) => sum + calculateIngredientCost(ingredient), 0)
  );
}

function itemIdentity(item) {
  const id = item.ingredient_id && !String(item.ingredient_id).startsWith('starter-') ? `id:${item.ingredient_id}` : '';
  if (id) return id;
  return `name:${String(item.name || '').trim().toLowerCase()}`;
}

function compatibleUnitKey(unit) {
  const info = unitInfo(unit);
  return `${info.group}:${info.base}`;
}

function buildNeededItems(meals, plan) {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  const totals = new Map();

  Object.values(plan?.slots || {}).forEach((id) => {
    const meal = byId.get(id);
    if (!meal) return;

    (meal.ingredients || []).forEach((ing) => {
      const identity = itemIdentity(ing);
      const unitKey = compatibleUnitKey(ing.unit);
      const key = `${identity}|${unitKey}|${ing.category || 'Other'}|${ing.unit || ''}`;
      const prev = totals.get(key) || {
        ingredient_id: ing.ingredient_id || null,
        name: ing.name,
        unit: ing.unit || '',
        quantity: 0,
        quantityBase: 0,
        category: ing.category || 'Other',
        estimated_price: Number(ing.estimated_price || 0),
        price_unit: ing.price_unit || '',
        meals: new Set(),
      };

      prev.quantity += Number(ing.quantity || 0);
      prev.quantityBase += toBaseQuantity(ing.quantity, ing.unit);
      if (!prev.estimated_price && ing.estimated_price) prev.estimated_price = Number(ing.estimated_price || 0);
      if (!prev.price_unit && ing.price_unit) prev.price_unit = ing.price_unit || '';
      prev.meals.add(meal.title);
      totals.set(key, prev);
    });
  });

  return Array.from(totals.values())
    .map((item) => ({ ...item, meals: Array.from(item.meals) }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export function buildPantryAwareGroceryList(meals, plan, pantryItems = []) {
  const needed = buildNeededItems(meals, plan);
  const pantryByKey = new Map();

  for (const item of pantryItems || []) {
    const identity = itemIdentity(item);
    const unitKey = compatibleUnitKey(item.unit);
    const key = `${identity}|${unitKey}`;
    const current = pantryByKey.get(key) || { quantityBase: 0, items: [], displayUnit: item.unit || '' };
    current.quantityBase += toBaseQuantity(item.quantity, item.unit);
    current.items.push(item);
    pantryByKey.set(key, current);
  }

  return needed.map((item) => {
    const identity = itemIdentity(item);
    const unitKey = compatibleUnitKey(item.unit);
    const pantry = pantryByKey.get(`${identity}|${unitKey}`);
    const needBase = item.quantityBase ?? toBaseQuantity(item.quantity, item.unit);
    const haveBase = pantry?.quantityBase || 0;
    const missingBase = Math.max(needBase - haveBase, 0);
    const remainingBase = Math.max(haveBase - needBase, 0);

    const missingQuantity = fromBaseQuantity(missingBase, item.unit);
    const neededQuantity = fromBaseQuantity(needBase, item.unit);

    return {
      ...item,
      needed_quantity: neededQuantity,
      pantry_quantity: fromBaseQuantity(haveBase, item.unit),
      missing_quantity: missingQuantity,
      remaining_quantity: fromBaseQuantity(remainingBase, item.unit),
      needed_cost: calculateIngredientCost({ ...item, quantity: neededQuantity }),
      missing_cost: calculateIngredientCost({ ...item, quantity: missingQuantity }),
      has_enough: missingBase <= 0.000001,
      pantry_items: pantry?.items || [],
    };
  }).sort((a, b) => {
    if (a.has_enough !== b.has_enough) return a.has_enough ? 1 : -1;
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });
}

export function buildShoppingListFromPantry(meals, plan, pantryItems = []) {
  return buildPantryAwareGroceryList(meals, plan, pantryItems)
    .filter((item) => Number(item.missing_quantity || 0) > 0);
}


function isDemo() {
  return false;
}

function cleanTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map((x) => x.trim()).filter(Boolean);
  return String(tags || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function normalizeIngredient(row) {
  const catalog = row.ingredient_catalog || row.catalog || null;
  const name = row.name || catalog?.name || '';
  const starter = starterIngredients.find((item) => item.name.toLowerCase() === String(name).toLowerCase());

  return {
    id: row.id,
    meal_id: row.meal_id,
    ingredient_id: row.ingredient_id || null,
    name,
    quantity: Number(row.quantity || 0),
    unit: row.unit || catalog?.default_unit || starter?.default_unit || '',
    category: row.category || catalog?.category || starter?.category || 'Other',
    estimated_price: Number(row.estimated_price || catalog?.estimated_price || starter?.estimated_price || 0),
    price_unit: row.price_unit || catalog?.price_unit || starter?.price_unit || '',
    is_free: Boolean(row.is_free),
  };
}

function normalizeMeal(row) {
  const ingredients = (row.meal_ingredients || row.ingredients || []).map(normalizeIngredient);
  const calculatedPrice = calculateMealPrice(ingredients);

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
    price: calculatedPrice || Number(row.price || 0),
    stored_price: Number(row.price || 0),
    tags: cleanTags(row.tags || []),
    is_public: Boolean(row.is_public),
    creator: row.creator || row.profiles?.display_name || null,
    ingredients,
  };
}

function normalizeSeedMeal(seed, index) {
  return {
    ...seed,
    id: seed.id || `seed-${index}`,
    tags: cleanTags(seed.tags),
    ingredients: (seed.ingredients || []).map((ing, i) =>
      Array.isArray(ing)
        ? {
            id: `seed-${index}-ing-${i}`,
            name: ing[0],
            quantity: ing[1],
            unit: ing[2],
            category: ing[3],
            ingredient_id: null,
            estimated_price: 0,
            price_unit: '',
          }
        : ing
    ),
  };
}

function normalizeCatalogIngredient(row) {
  return {
    id: row.id,
    name: row.name || '',
    region: normalizeRegion(row.region),
    category: row.category || 'Other',
    default_unit: row.default_unit || '',
    estimated_price: Number(row.estimated_price || 0),
    price_unit: row.price_unit || row.default_unit || '',
    created_by: row.created_by || null,
    is_user_created: Boolean(row.is_user_created),
  };
}

async function throwIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

function starterForRegion(region = 'pt') {
  const cleanRegion = normalizeRegion(region);
  return starterIngredients.filter((item) => item.region === cleanRegion).map(normalizeCatalogIngredient);
}

function mergeCatalogRows(region, rows = []) {
  const map = new Map();
  for (const item of starterForRegion(region)) {
    map.set(item.name.toLowerCase(), item);
  }
  for (const row of rows || []) {
    const item = normalizeCatalogIngredient(row);
    map.set(item.name.toLowerCase(), item);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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

export async function loadProfileForUser(user) {
  const fallback = {
    id: user?.id,
    email: user?.email || '',
    display_name: user?.user_metadata?.display_name || user?.user_metadata?.username || '',
    region: normalizeRegion(user?.user_metadata?.region),
  };

  if (!user?.id || !hasSupabaseEnv() || !supabase) return fallback;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return fallback;

  return {
    ...fallback,
    ...data,
    region: normalizeRegion(data.region || data.country_region || fallback.region),
  };
}

export async function saveProfileForUser(user, profile) {
  const region = normalizeRegion(profile.region);
  const displayName = String(profile.display_name || '').trim();

  if (!hasSupabaseEnv() || !supabase) return { ...profile, region };

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      username: displayName,
      region,
    },
  });
  if (authError) throw authError;

  const basePayload = {
    id: user.id,
    email: user.email,
    display_name: displayName,
    region,
    country_region: region,
  };

  let { error } = await supabase.from('profiles').upsert(basePayload);

  if (error && /country_region/i.test(error.message || '')) {
    const fallbackPayload = {
      id: user.id,
      email: user.email,
      display_name: displayName,
      region,
    };
    const fallbackResult = await supabase.from('profiles').upsert(fallbackPayload);
    error = fallbackResult.error;
  }

  if (error && /region/i.test(error.message || '')) {
    const fallbackPayload = {
      id: user.id,
      email: user.email,
      display_name: displayName,
    };
    const fallbackResult = await supabase.from('profiles').upsert(fallbackPayload);
    error = fallbackResult.error;
  }

  if (error) throw error;
  return { id: user.id, email: user.email, display_name: displayName, region };
}

export async function loadIngredientCatalog(region = 'pt', query = '') {
  const cleanRegion = normalizeRegion(region);
  const needle = String(query || '').trim().toLowerCase();

  let catalog = starterForRegion(cleanRegion);

  if (hasSupabaseEnv() && supabase) {
    try {
      const { data, error } = await supabase
        .from('ingredient_catalog')
        .select('*')
        .eq('region', cleanRegion)
        .order('name', { ascending: true });

      if (!error) catalog = mergeCatalogRows(cleanRegion, data || []);
    } catch (_) {
      catalog = starterForRegion(cleanRegion);
    }
  }

  if (!needle) return catalog.slice(0, 80);

  return catalog
    .filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(needle))
    .slice(0, 30);
}

export async function createCatalogIngredient(user, ingredient) {
  const payload = {
    name: String(ingredient.name || '').trim(),
    region: normalizeRegion(ingredient.region),
    category: ingredient.category || 'Other',
    default_unit: ingredient.default_unit || ingredient.unit || '',
    estimated_price: Number(ingredient.estimated_price || 0),
    price_unit: ingredient.price_unit || ingredient.default_unit || ingredient.unit || '',
    created_by: user?.id || null,
    is_user_created: true,
  };

  if (!payload.name) throw new Error('Ingredient name is required.');

  if (!hasSupabaseEnv() || !supabase) {
    return normalizeCatalogIngredient({ ...payload, id: `local-${payload.region}-${slugify(payload.name)}` });
  }

  const { data, error } = await supabase
    .from('ingredient_catalog')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizeCatalogIngredient(data);
}

export async function loadMyMeals(user) {
  if (isDemo()) return localGetMeals();
  await seedAccountIfEmpty(user);

  const data = await throwIfError(
    await supabase
      .from('meals')
      .select('*, meal_ingredients(*, ingredient_catalog(*))')
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
      .select('*, meal_ingredients(*, ingredient_catalog(*))')
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
      .select('*, meal_ingredients(*, ingredient_catalog(*))')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
  );

  const publicRows = (data || [])
    .filter((meal) => meal.user_id !== user?.id)
    .map(normalizeMeal);

  return publicRows;
}

export async function saveMealForUser(user, meal) {
  const ingredients = (meal.ingredients || [])
    .filter((ing) => String(ing.name || '').trim())
    .map((ing) => ({
      ingredient_id: ing.ingredient_id && !String(ing.ingredient_id).startsWith('starter-') ? ing.ingredient_id : null,
      name: String(ing.name || '').trim(),
      quantity: Number(ing.quantity || 0),
      unit: ing.unit || '',
      category: ing.category || 'Other',
      estimated_price: Number(ing.estimated_price || 0),
      price_unit: ing.price_unit || '',
    }));

  const calculatedPrice = calculateMealPrice(ingredients);

  if (isDemo()) {
    return localSaveMeal({ ...meal, ingredients, price: calculatedPrice });
  }

  const payload = {
    user_id: user.id,
    title: meal.title,
    description: meal.description || '',
    instructions: meal.instructions || '',
    video_url: meal.video_url || '',
    meal_type: meal.meal_type || 'both',
    prep_time: Number(meal.prep_time || 20),
    servings: Number(meal.servings || 2),
    price: calculatedPrice,
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

  const ingredientRows = ingredients.map((ing) => ({
    meal_id: saved.id,
    ...ing,
  }));

  if (ingredientRows.length) {
    await throwIfError(await supabase.from('meal_ingredients').insert(ingredientRows));
  }

  return normalizeMeal({ ...saved, meal_ingredients: ingredientRows });
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

export async function loadPlanForUser(user, weekStartDate = getMonday()) {
  if (isDemo()) {
    const plan = localGetPlan();
    return plan.week_start_date === weekStartDate ? plan : { ...emptyPlan(), week_start_date: weekStartDate };
  }

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

  const planId = plan?.id || (await getOrCreateWeekPlan(user, plan?.week_start_date || getMonday())).id;

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

  return {
    ...plan,
    id: planId,
    slots: {
      ...(plan?.slots || emptyPlan().slots),
      [`${day}-${slot}`]: mealId || null,
    },
  };
}


function startOfWeekString(dateValue = new Date()) {
  if (typeof dateValue === 'string') {
    return getMonday(new Date(`${dateValue.slice(0, 10)}T00:00:00`));
  }
  return getMonday(new Date(dateValue));
}

function monthKey(dateValue = new Date()) {
  return String(dateValue || new Date().toISOString()).slice(0, 7);
}

export function estimatePantryItemValue(item) {
  if (item?.is_free) return 0;
  return calculateIngredientCost({
    quantity: item?.quantity,
    unit: item?.unit,
    estimated_price: item?.estimated_price,
    price_unit: item?.price_unit,
  });
}

export function buildPantryRecap(trips = [], pantryItems = [], meals = [], plan = null) {
  const now = new Date();
  const currentWeek = startOfWeekString(now);
  const currentMonth = monthKey(now);

  const spendingByWeek = {};
  const spendingByMonth = {};
  const boughtCounts = new Map();

  for (const trip of trips || []) {
    const week = startOfWeekString(trip.bought_at || now);
    const month = monthKey(trip.bought_at || now);

    for (const item of trip.items || []) {
      const cost = item?.is_free ? 0 : estimatePantryItemValue(item);
      spendingByWeek[week] = (spendingByWeek[week] || 0) + cost;
      spendingByMonth[month] = (spendingByMonth[month] || 0) + cost;

      const key = String(item.name || '').trim();
      if (key) boughtCounts.set(key, (boughtCounts.get(key) || 0) + Number(item.quantity || 0));
    }
  }

  const byId = new Map((meals || []).map((meal) => [meal.id, meal]));
  const mealCounts = new Map();
  Object.values(plan?.slots || {}).forEach((mealId) => {
    const meal = byId.get(mealId);
    if (!meal) return;
    mealCounts.set(meal.title, (mealCounts.get(meal.title) || 0) + 1);
  });

  const mostBoughtIngredient = Array.from(boughtCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not enough data';
  const mostUsedMeal = Array.from(mealCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not enough data';

  const monthlyRows = Object.entries(spendingByMonth)
    .map(([month, total]) => ({ month, total: roundMoney(total) }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);

  const weeklyRows = Object.entries(spendingByWeek)
    .map(([week, total]) => ({ week, total: roundMoney(total) }))
    .sort((a, b) => b.week.localeCompare(a.week))
    .slice(0, 8);

  const plannedMealValue = roundMoney(Object.values(plan?.slots || {}).reduce((sum, mealId) => {
    const meal = byId.get(mealId);
    return sum + Number(meal?.price || 0);
  }, 0));

  return {
    currentWeek,
    currentMonth,
    weekSpending: roundMoney(spendingByWeek[currentWeek] || 0),
    monthSpending: roundMoney(spendingByMonth[currentMonth] || 0),
    plannedMealValue,
    pantryValue: roundMoney((pantryItems || []).reduce((sum, item) => sum + estimatePantryItemValue(item), 0)),
    mostBoughtIngredient,
    mostUsedMeal,
    weeklyRows,
    monthlyRows,
  };
}

export function suggestMealsFromPantry(meals = [], pantryItems = []) {
  const pantryByName = new Map(
    (pantryItems || []).map((item) => [String(item.name || '').trim().toLowerCase(), item])
  );

  return (meals || [])
    .map((meal) => {
      const ingredients = meal.ingredients || [];
      const matched = ingredients.filter((ingredient) => pantryByName.has(String(ingredient.name || '').trim().toLowerCase())).length;
      const coverage = ingredients.length ? Math.round((matched / ingredients.length) * 100) : 0;
      return { ...meal, pantry_coverage: coverage, pantry_matched: matched, pantry_total: ingredients.length };
    })
    .filter((meal) => meal.pantry_coverage > 0)
    .sort((a, b) => b.pantry_coverage - a.pantry_coverage || Number(a.price || 0) - Number(b.price || 0))
    .slice(0, 6);
}

function normalizePantryItem(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    ingredient_id: row.ingredient_id || null,
    name: row.name || '',
    quantity: Number(row.quantity || 0),
    unit: row.unit || '',
    category: row.category || 'Other',
    estimated_price: Number(row.estimated_price || 0),
    price_unit: row.price_unit || '',
    is_free: Boolean(row.is_free),
    updated_at: row.updated_at || null,
  };
}

function normalizePantryTrip(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    store: row.store || '',
    bought_at: row.bought_at || '',
    notes: row.notes || '',
    item_count: Array.isArray(row.pantry_transaction_items) ? row.pantry_transaction_items.length : Number(row.item_count || 0),
    items: (row.pantry_transaction_items || []).map((item) => ({
      id: item.id,
      ingredient_id: item.ingredient_id || null,
      name: item.name || '',
      quantity: Number(item.quantity || 0),
      unit: item.unit || '',
      category: item.category || 'Other',
      estimated_price: Number(item.estimated_price || 0),
      price_unit: item.price_unit || '',
      is_free: Boolean(item.is_free),
    })),
  };
}

function pantryMatchQuery(user, item) {
  if (item.ingredient_id && !String(item.ingredient_id).startsWith('starter-')) {
    return supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('ingredient_id', item.ingredient_id)
      .maybeSingle();
  }

  return supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', user.id)
    .ilike('name', item.name)
    .eq('unit', item.unit || '')
    .maybeSingle();
}

export async function loadPantryItemsForUser(user) {
  if (!hasSupabaseEnv() || !supabase) return [];

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', user.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizePantryItem);
}

export async function loadPantryTripsForUser(user) {
  if (!hasSupabaseEnv() || !supabase) return [];

  const { data, error } = await supabase
    .from('pantry_transactions')
    .select('*, pantry_transaction_items(*)')
    .eq('user_id', user.id)
    .order('bought_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data || []).map(normalizePantryTrip);
}

export async function savePantryItemForUser(user, item) {
  if (!hasSupabaseEnv() || !supabase) return normalizePantryItem({ ...item, user_id: user?.id });

  const payload = {
    user_id: user.id,
    ingredient_id: item.ingredient_id && !String(item.ingredient_id).startsWith('starter-') ? item.ingredient_id : null,
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity || 0),
    unit: item.unit || '',
    category: item.category || 'Other',
    estimated_price: Number(item.estimated_price || 0),
    price_unit: item.price_unit || '',
    is_free: Boolean(item.is_free),
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) throw new Error('Ingredient name is required.');

  if (item.id) {
    const { data, error } = await supabase
      .from('pantry_items')
      .update(payload)
      .eq('id', item.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return normalizePantryItem(data);
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizePantryItem(data);
}

export async function deletePantryItemForUser(user, id) {
  if (!hasSupabaseEnv() || !supabase) return;

  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

async function addToPantryItem(user, item) {
  const clean = {
    ingredient_id: item.ingredient_id && !String(item.ingredient_id).startsWith('starter-') ? item.ingredient_id : null,
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity || 0),
    unit: item.unit || '',
    category: item.category || 'Other',
    estimated_price: Number(item.estimated_price || 0),
    price_unit: item.price_unit || '',
    is_free: Boolean(item.is_free),
  };

  if (!clean.name || !clean.quantity) return null;

  const { data: existing, error: existingError } = await pantryMatchQuery(user, clean);
  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from('pantry_items')
      .update({
        quantity: Number(existing.quantity || 0) + clean.quantity,
        category: clean.category || existing.category || 'Other',
        estimated_price: clean.is_free ? Number(existing.estimated_price || 0) : (clean.estimated_price || Number(existing.estimated_price || 0)),
        price_unit: clean.price_unit || existing.price_unit || '',
        is_free: Boolean(existing.is_free) && clean.is_free,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return normalizePantryItem(data);
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ user_id: user.id, ...clean })
    .select()
    .single();

  if (error) throw error;
  return normalizePantryItem(data);
}

export async function addPantryTripForUser(user, trip) {
  if (!hasSupabaseEnv() || !supabase) return null;

  const cleanItems = (trip.items || [])
    .filter((item) => String(item.name || '').trim() && Number(item.quantity || 0) > 0)
    .map((item) => ({
      ingredient_id: item.ingredient_id && !String(item.ingredient_id).startsWith('starter-') ? item.ingredient_id : null,
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity || 0),
      unit: item.unit || '',
      category: item.category || 'Other',
      estimated_price: Number(item.estimated_price || 0),
      price_unit: item.price_unit || '',
      is_free: Boolean(item.is_free),
    }));

  if (!cleanItems.length) throw new Error('Add at least one pantry item.');

  const { data: transaction, error: transactionError } = await supabase
    .from('pantry_transactions')
    .insert({
      user_id: user.id,
      store: trip.store || '',
      bought_at: trip.bought_at || new Date().toISOString().slice(0, 10),
      notes: trip.notes || '',
    })
    .select()
    .single();

  if (transactionError) throw transactionError;

  const transactionItems = cleanItems.map((item) => ({
    transaction_id: transaction.id,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from('pantry_transaction_items')
    .insert(transactionItems);

  if (itemsError) throw itemsError;

  for (const item of cleanItems) {
    await addToPantryItem(user, item);
  }

  return normalizePantryTrip({ ...transaction, pantry_transaction_items: transactionItems });
}
