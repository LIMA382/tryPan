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
import { canonicalIngredientName, ingredientAliasesForName, ingredientIdentityKey, ingredientMatchesQuery, ingredientMatchRank, ingredientNamesMatch, normalizedAliases } from './ingredientIdentity.mjs';
import { compatibleUnitKey, fromBaseQuantity, normalizeUnit, toBaseQuantity, unitInfo } from './unitConversion.mjs';
import { buildPantryConsumptionPreview } from './pantryConsumption.mjs';
import { rankMeals } from './mealRecommendations.mjs';
import { enqueueMutation, isOffline, pendingMutations, readSnapshot, removeMutation, writeSnapshot } from './offlineState.mjs';
import { plannedMealCost } from './planMetrics.mjs';
import { isDatabaseMealId } from './mealPersistence.mjs';

export { buildPantryConsumptionPreview, rankMeals };

export { buildGroceryList };

function validUuidOrNull(value) {
  const candidate = String(value || '').trim();
  return isDatabaseMealId(candidate) ? candidate : null;
}

function offlineUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

const PERSONAL_CATALOG_KEY = 'trypan-personal-ingredient-catalog-v1';

function loadPersonalCatalog() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PERSONAL_CATALOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function savePersonalCatalog(item) {
  if (typeof window === 'undefined') return item;
  const current = loadPersonalCatalog();
  const next = [item, ...current.filter((entry) => entry.id !== item.id && (
    normalizeRegion(entry.region) !== normalizeRegion(item.region)
    || !ingredientNamesMatch(entry.name, item.name, entry.aliases, item.aliases)
  ))];
  window.localStorage.setItem(PERSONAL_CATALOG_KEY, JSON.stringify(next.slice(0, 250)));
  return item;
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

  const cleanUnitName = normalizeUnit(unit);
  const cleanPriceUnit = normalizeUnit(priceUnit);
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

function buildNeededItems(meals, plan) {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  const totals = new Map();

  Object.entries(plan?.slots || {}).forEach(([slotKey, id]) => {
    const meal = byId.get(id);
    if (!meal) return;
    const plannedServings = Math.max(1, Number(plan?.servings?.[slotKey] || 1));
    const recipeServings = Math.max(1, Number(meal.servings || 1));
    const scale = plannedServings / recipeServings;

    (meal.ingredients || []).forEach((ing) => {
      const identity = ingredientIdentityKey(ing);
      const unitKey = compatibleUnitKey(ing.unit);
      const key = `${identity}|${unitKey}`;
      const prev = totals.get(key) || {
        ingredient_id: validUuidOrNull(ing.ingredient_id),
        name: ing.name,
        unit: ing.unit || '',
        quantity: 0,
        quantityBase: 0,
        category: ing.category || 'Other',
        estimated_price: Number(ing.estimated_price || 0),
        price_unit: ing.price_unit || '',
        meals: new Set(),
      };

      prev.quantityBase += toBaseQuantity(Number(ing.quantity || 0) * scale, ing.unit);
      prev.quantity = fromBaseQuantity(prev.quantityBase, prev.unit);
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
    const identity = ingredientIdentityKey(item);
    const unitKey = compatibleUnitKey(item.unit);
    const key = `${identity}|${unitKey}`;
    const current = pantryByKey.get(key) || { quantityBase: 0, items: [], displayUnit: item.unit || '' };
    current.quantityBase += toBaseQuantity(item.quantity, item.unit);
    current.items.push(item);
    pantryByKey.set(key, current);
  }

  return needed.map((item) => {
    const identity = ingredientIdentityKey(item);
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
  return !hasSupabaseEnv() || !supabase;
}

// Keep data warm while the user moves around the client-side app. This also
// deduplicates simultaneous requests from pages that need the same meal list.
const appDataCache = new Map();
function cachedData(key, loader, maxAge = 30000) {
  const current = appDataCache.get(key);
  if (current && Date.now() - current.createdAt < maxAge) return current.promise;
  const promise = Promise.resolve().then(loader).catch((error) => { appDataCache.delete(key); throw error; });
  appDataCache.set(key, { createdAt: Date.now(), promise });
  return promise;
}
function clearMealCache() {
  for (const key of appDataCache.keys()) if (key.startsWith('meals:')) appDataCache.delete(key);
}
function clearCachedPrefix(prefix) {
  for (const key of appDataCache.keys()) if (key.startsWith(prefix)) appDataCache.delete(key);
}

function announceOfflineState(detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('trypan:offline-state', { detail }));
}

async function withOfflineSnapshot(user, resource, loader) {
  const cached = readSnapshot(user?.id, resource);
  if (isOffline() && cached) {
    announceOfflineState({ usingSnapshot: true, savedAt: cached.savedAt, pending: pendingMutations().length });
    return cached.data;
  }
  try {
    const value = await loader();
    writeSnapshot(user?.id, resource, value);
    return value;
  } catch (error) {
    const snapshot = readSnapshot(user?.id, resource);
    if (!snapshot) throw error;
    announceOfflineState({ usingSnapshot: true, savedAt: snapshot.savedAt, pending: pendingMutations().length });
    return snapshot.data;
  }
}

function cleanTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map((x) => x.trim()).filter(Boolean);
  return String(tags || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function normalizeIngredient(row) {
  const catalog = row.ingredient_catalog || row.catalog || null;
  const name = row.name || catalog?.name || '';
  const starter = starterIngredients.find((item) => ingredientNamesMatch(item.name, name, item.aliases));

  return {
    id: row.id,
    meal_id: row.meal_id,
    ingredient_id: row.ingredient_id || null,
    name,
    canonical_name: catalog?.name || name,
    aliases: normalizedAliases(catalog?.aliases),
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
    aliases: normalizedAliases([...(row.aliases || []), ...ingredientAliasesForName(row.name)]),
    created_at: row.created_at || null,
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
    map.set(canonicalIngredientName(item.name), item);
  }
  for (const row of rows || []) {
    const item = normalizeCatalogIngredient(row);
    const key = canonicalIngredientName(item.name);
    const current = map.get(key);
    // Built-in regional prices are the maintained supermarket baseline. A user's
    // own saved price still wins, while old database seed rows cannot make it stale.
    map.set(key, item.is_user_created ? item : { ...item, estimated_price: current?.estimated_price ?? item.estimated_price, price_unit: current?.price_unit || item.price_unit });
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.is_user_created !== b.is_user_created) return a.is_user_created ? -1 : 1;
    const recent = String(b.created_at || '').localeCompare(String(a.created_at || ''));
    return recent || a.name.localeCompare(b.name);
  });
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

  return cachedData(`profile:${user.id}`, async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error || !data) return fallback;
    return { ...fallback, ...data, region: normalizeRegion(data.region || data.country_region || fallback.region) };
  }, 60000);
}

export async function saveProfileForUser(user, profile) {
  clearCachedPrefix(`profile:${user.id}`);
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

  const personalCatalog = loadPersonalCatalog().filter((item) => normalizeRegion(item.region) === cleanRegion);
  let catalog = mergeCatalogRows(cleanRegion, personalCatalog);

  if (hasSupabaseEnv() && supabase) {
    try {
      const { data, error } = await supabase
        .from('ingredient_catalog')
        .select('*')
        .eq('region', cleanRegion)
        .order('name', { ascending: true });

      if (!error) catalog = mergeCatalogRows(cleanRegion, [...(data || []), ...personalCatalog]);
    } catch (_) {
      catalog = starterForRegion(cleanRegion);
    }
  }

  if (!needle) return catalog.slice(0, 80);

  return catalog
    .filter((item) => ingredientMatchesQuery(item, needle))
    .sort((a, b) => ingredientMatchRank(a, needle) - ingredientMatchRank(b, needle) || a.name.localeCompare(b.name))
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
    aliases: normalizedAliases(ingredient.aliases),
  };

  if (!payload.name) throw new Error('Ingredient name is required.');

  if (!hasSupabaseEnv() || !supabase) {
    const existing = mergeCatalogRows(payload.region, loadPersonalCatalog())
      .find((item) => ingredientNamesMatch(item.name, payload.name, item.aliases, payload.aliases));
    return existing || savePersonalCatalog(normalizeCatalogIngredient({ ...payload, id: `local-${payload.region}-${slugify(payload.name)}` }));
  }

  const { data: existingRows } = await supabase.from('ingredient_catalog').select('*').eq('region', payload.region).limit(2000);
  const existing = (existingRows || []).map(normalizeCatalogIngredient)
    .find((item) => ingredientNamesMatch(item.name, payload.name, item.aliases, payload.aliases));
  if (existing) return savePersonalCatalog(existing);

  const { data, error } = await supabase
    .from('ingredient_catalog')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return savePersonalCatalog(normalizeCatalogIngredient({ ...payload, id: `local-${payload.region}-${slugify(payload.name)}` }));
  }
  return savePersonalCatalog(normalizeCatalogIngredient(data));
}

export async function updateCatalogIngredient(user, ingredient) {
  const payload = {
    name: String(ingredient.name || '').trim(),
    region: normalizeRegion(ingredient.region),
    category: ingredient.category || 'Other',
    default_unit: ingredient.default_unit || ingredient.unit || '',
    estimated_price: Number(ingredient.estimated_price || 0),
    price_unit: ingredient.price_unit || ingredient.default_unit || ingredient.unit || '',
    created_by: ingredient.created_by || user?.id || null,
    is_user_created: true,
    aliases: normalizedAliases(ingredient.aliases),
    created_at: ingredient.created_at || new Date().toISOString(),
  };

  if (!payload.name) throw new Error('Ingredient name is required.');

  const localResult = normalizeCatalogIngredient({ ...payload, id: ingredient.id || `local-${payload.region}-${slugify(payload.name)}` });
  if (!validUuidOrNull(ingredient.id) || !hasSupabaseEnv() || !supabase) {
    return savePersonalCatalog(localResult);
  }

  const { data, error } = await supabase
    .from('ingredient_catalog')
    .update({
      name: payload.name,
      category: payload.category,
      default_unit: payload.default_unit,
      estimated_price: payload.estimated_price,
      price_unit: payload.price_unit,
      aliases: payload.aliases,
    })
    .eq('id', ingredient.id)
    .eq('created_by', user.id)
    .select()
    .single();

  if (error) return savePersonalCatalog(localResult);
  return savePersonalCatalog(normalizeCatalogIngredient(data));
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
  if (isDemo()) {
    const own = localGetMeals();
    const ownTitles = new Set(own.map((meal) => meal.title.toLowerCase()));
    return [...own, ...localGetPublicMeals().filter((meal) => !ownTitles.has(meal.title.toLowerCase()))];
  }

  return cachedData(`meals:visible:${user.id}`, async () => {
    return withOfflineSnapshot(user, 'meals-visible', async () => {
    const data = await throwIfError(
      await supabase
        .from('meals')
        .select('*, meal_ingredients(*, ingredient_catalog(*))')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false })
    );
    const visible = (data || []).map(normalizeMeal);
    const existingTitles = new Set(visible.map((meal) => meal.title.toLowerCase()));
    const curated = localGetPublicMeals().filter((meal) => !existingTitles.has(meal.title.toLowerCase()));
    return [...visible, ...curated];
    });
  });
}

export async function loadPublicMeals(user = null) {
  if (!hasSupabaseEnv() || !supabase) return localGetPublicMeals();

  return cachedData(`meals:public:${user?.id || 'guest'}`, async () => {
    const data = await throwIfError(
      await supabase
        .from('meals')
        .select('*, meal_ingredients(*, ingredient_catalog(*))')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
    );
    const publicRows = (data || []).filter((meal) => meal.user_id !== user?.id).map(normalizeMeal);
    const existingTitles = new Set(publicRows.map((meal) => meal.title.toLowerCase()));
    const curated = localGetPublicMeals().filter((meal) => !existingTitles.has(meal.title.toLowerCase()));
    return [...publicRows, ...curated];
  });
}

export async function saveMealForUser(user, meal) {
  clearMealCache();
  const ingredients = (meal.ingredients || [])
    .filter((ing) => String(ing.name || '').trim())
    .map((ing) => ({
      ingredient_id: validUuidOrNull(ing.ingredient_id),
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
    price: calculatedPrice || Number(meal.price || 0),
    tags: cleanTags(meal.tags),
    is_public: Boolean(meal.is_public),
    updated_at: new Date().toISOString(),
  };

  let saved;
  const editableId = isDatabaseMealId(meal.id);

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
  clearMealCache();
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

  return cachedData(`plan:${user.id}:${weekStartDate}`, async () => {
    return withOfflineSnapshot(user, `plan-${weekStartDate}`, async () => {
    const planRow = await getOrCreateWeekPlan(user, weekStartDate);
    const planned = await throwIfError(await supabase.from('planned_meals').select('*').eq('weekly_plan_id', planRow.id));
    const plan = emptyPlan();
    plan.id = planRow.id;
    plan.week_start_date = planRow.week_start_date;
    for (const row of planned || []) {
      const key = `${row.day_of_week}-${row.slot}`;
      plan.slots[key] = row.meal_id;
      plan.servings[key] = Math.max(1, Number(row.servings || 1));
    }
    return plan;
    });
  });
}

export async function ensureMealForPlanning(user, meal) {
  if (!meal) throw new Error('Choose a meal before adding it to the planner.');
  if (isDemo() || isDatabaseMealId(meal.id)) return meal;

  const { data, error } = await supabase
    .from('meals')
    .select('id, user_id')
    .eq('user_id', user.id)
    .eq('title', meal.title)
    .limit(1);
  if (error) throw error;
  if (data?.[0]) return { ...meal, id: data[0].id, user_id: user.id, is_public: false };

  return saveMealForUser(user, { ...meal, id: undefined, user_id: user.id, is_public: false });
}

export async function setPlannedMealForUser(user, plan, day, slot, mealId, servingCount = null) {
  const key = `${day}-${slot}`;
  const servings = Math.max(1, Number(servingCount || plan?.servings?.[key] || 1));
  if (isDemo()) return localSetPlannedMeal(day, slot, mealId, servings);
  if (mealId && !isDatabaseMealId(mealId)) throw new Error('This built-in recipe must be saved before it can be planned.');
  clearCachedPrefix(`plan:${user.id}:`);

  const optimistic = {
    ...plan,
    slots: { ...(plan?.slots || emptyPlan().slots), [key]: mealId || null },
    servings: { ...(plan?.servings || {}), [key]: mealId ? servings : undefined },
  };
  if (isOffline()) {
    writeSnapshot(user.id, `plan-${plan?.week_start_date || getMonday()}`, optimistic);
    const queue = enqueueMutation({ key: `${user.id}:plan:${plan?.week_start_date || getMonday()}:${key}`, type: 'plan-slot', userId: user.id, weekStartDate: plan?.week_start_date || getMonday(), day, slot, mealId: mealId || null, servings });
    announceOfflineState({ pending: queue.length, savedOffline: true });
    return optimistic;
  }

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
          { weekly_plan_id: planId, meal_id: mealId, day_of_week: day, slot, servings },
          { onConflict: 'weekly_plan_id,day_of_week,slot' }
        )
    );
  }

  const savedPlan = {
    ...optimistic,
    id: planId,
  };
  writeSnapshot(user.id, `plan-${plan?.week_start_date || getMonday()}`, savedPlan);
  return savedPlan;
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

  const plannedMealValue = plannedMealCost(meals, plan);

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
  return rankMeals(meals, pantryItems)
    .filter((meal) => meal.pantry_coverage > 0 || meal.expiring_matches > 0)
    .slice(0, 6);
}

export async function saveSmartPlanForUser(user, plan, additions = []) {
  if (!additions.length) return plan;
  if (isDemo()) {
    let next = plan;
    for (const item of additions) next = localSetPlannedMeal(item.day, item.slot, item.mealId, item.servings);
    return next;
  }
  if (additions.some((item) => !isDatabaseMealId(item.mealId))) throw new Error('One or more built-in recipes must be saved before this plan can be added.');
  if (isOffline()) {
    const optimistic = { ...plan, slots: { ...(plan?.slots || {}) }, servings: { ...(plan?.servings || {}) } };
    let queue = pendingMutations();
    for (const item of additions) {
      const key = `${item.day}-${item.slot}`;
      optimistic.slots[key] = item.mealId;
      optimistic.servings[key] = item.servings;
      queue = enqueueMutation({ key: `${user.id}:plan:${plan?.week_start_date || getMonday()}:${key}`, type: 'plan-slot', userId: user.id, weekStartDate: plan?.week_start_date || getMonday(), day: item.day, slot: item.slot, mealId: item.mealId, servings: item.servings });
    }
    writeSnapshot(user.id, `plan-${plan?.week_start_date || getMonday()}`, optimistic);
    announceOfflineState({ pending: queue.length, savedOffline: true });
    return optimistic;
  }
  clearCachedPrefix(`plan:${user.id}:`);
  const planId = plan?.id || (await getOrCreateWeekPlan(user, plan?.week_start_date || getMonday())).id;
  await throwIfError(await supabase.from('planned_meals').upsert(additions.map((item) => ({
    weekly_plan_id: planId, meal_id: item.mealId, day_of_week: item.day, slot: item.slot, servings: item.servings,
  })), { onConflict: 'weekly_plan_id,day_of_week,slot' }));
  return { ...plan, id: planId };
}

function normalizePantryItem(row) {
  const catalog = row.ingredient_catalog || null;
  return {
    id: row.id,
    user_id: row.user_id,
    ingredient_id: row.ingredient_id || null,
    name: row.name || '',
    canonical_name: catalog?.name || row.name || '',
    aliases: normalizedAliases(catalog?.aliases),
    quantity: Number(row.quantity || 0),
    unit: row.unit || '',
    category: row.category || 'Other',
    estimated_price: Number(row.estimated_price || 0),
    price_unit: row.price_unit || '',
    is_free: Boolean(row.is_free),
    expiry_date: row.expiry_date || '',
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
      ingredient_id: validUuidOrNull(item.ingredient_id),
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

  return cachedData(`pantry:items:${user.id}`, async () => {
    return withOfflineSnapshot(user, 'pantry-items', async () => {
    const { data, error } = await supabase.from('pantry_items').select('*, ingredient_catalog(*)').eq('user_id', user.id).order('category', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizePantryItem);
    });
  });
}

export async function loadPantryTripsForUser(user) {
  if (!hasSupabaseEnv() || !supabase) return [];

  return cachedData(`pantry:trips:${user.id}`, async () => {
    return withOfflineSnapshot(user, 'pantry-trips', async () => {
    const { data, error } = await supabase.from('pantry_transactions').select('*, pantry_transaction_items(*)').eq('user_id', user.id).order('bought_at', { ascending: false }).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return (data || []).map(normalizePantryTrip);
    });
  });
}

export async function savePantryItemForUser(user, item) {
  clearCachedPrefix(`pantry:items:${user?.id}`);
  if (!hasSupabaseEnv() || !supabase) return normalizePantryItem({ ...item, user_id: user?.id });

  const payload = {
    user_id: user.id,
    ingredient_id: validUuidOrNull(item.ingredient_id),
    name: String(item.name || '').trim(),
    quantity: Number(item.quantity || 0),
    unit: item.unit || '',
    category: item.category || 'Other',
    estimated_price: Number(item.estimated_price || 0),
    price_unit: item.price_unit || '',
    is_free: Boolean(item.is_free),
    expiry_date: item.expiry_date || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) throw new Error('Ingredient name is required.');

  if (isOffline()) {
    const snapshot = readSnapshot(user.id, 'pantry-items');
    const current = snapshot?.data || [];
    const wasNew = !validUuidOrNull(item.id);
    const localId = validUuidOrNull(item.id) || offlineUuid();
    const saved = normalizePantryItem({ ...item, ...payload, id: localId });
    writeSnapshot(user.id, 'pantry-items', current.some((entry) => entry.id === localId) ? current.map((entry) => entry.id === localId ? saved : entry) : [saved, ...current]);
    const queue = enqueueMutation({ key: `${user.id}:pantry:${localId}`, type: 'pantry-upsert', userId: user.id, localId, isNew: wasNew, payload: { ...payload, id: localId } });
    announceOfflineState({ pending: queue.length, savedOffline: true });
    return saved;
  }

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
  clearCachedPrefix(`pantry:items:${user?.id}`);
  if (!hasSupabaseEnv() || !supabase) return;

  if (isOffline()) {
    const snapshot = readSnapshot(user.id, 'pantry-items');
    writeSnapshot(user.id, 'pantry-items', (snapshot?.data || []).filter((item) => item.id !== id));
    let queue;
    const mutationKey = `${user.id}:pantry:${id}`;
    const queuedCreate = pendingMutations().find((item) => item.key === mutationKey && item.type === 'pantry-upsert' && item.isNew);
    if (queuedCreate) queue = removeMutation(mutationKey);
    else queue = enqueueMutation({ key: mutationKey, type: 'pantry-delete', userId: user.id, id });
    announceOfflineState({ pending: queue.length, savedOffline: true });
    return;
  }

  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function syncOfflineChanges() {
  if (!supabase || isOffline()) return { synced: 0, pending: pendingMutations().length };
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { synced: 0, pending: pendingMutations().length };
  let synced = 0;
  let failed = false;
  for (const mutation of pendingMutations().filter((item) => item.userId === user.id)) {
    try {
      if (mutation.type === 'plan-slot') {
        const planRow = await getOrCreateWeekPlan(user, mutation.weekStartDate);
        if (mutation.mealId) await throwIfError(await supabase.from('planned_meals').upsert({ weekly_plan_id: planRow.id, meal_id: mutation.mealId, day_of_week: mutation.day, slot: mutation.slot, servings: mutation.servings }, { onConflict: 'weekly_plan_id,day_of_week,slot' }));
        else await throwIfError(await supabase.from('planned_meals').delete().eq('weekly_plan_id', planRow.id).eq('day_of_week', mutation.day).eq('slot', mutation.slot));
      } else if (mutation.type === 'pantry-upsert') {
        const { id, ...payload } = mutation.payload;
        await throwIfError(await supabase.from('pantry_items').upsert({ id, ...payload }, { onConflict: 'id' }));
      } else if (mutation.type === 'pantry-delete') {
        await throwIfError(await supabase.from('pantry_items').delete().eq('id', mutation.id).eq('user_id', user.id));
      } else if (mutation.type === 'pantry-trip') {
        const transaction = await throwIfError(await supabase.from('pantry_transactions').upsert({ id: mutation.trip.id, user_id: user.id, store: mutation.trip.store, bought_at: mutation.trip.bought_at, notes: mutation.trip.notes }, { onConflict: 'id' }).select().single());
        if (mutation.trip.items.length) await throwIfError(await supabase.from('pantry_transaction_items').upsert(mutation.trip.items.map((item) => ({ transaction_id: transaction.id, ...item })), { onConflict: 'id' }));
      } else if (mutation.type === 'recipe-activity') {
        await throwIfError(await supabase.from('recipe_activity').upsert(mutation.payload, { onConflict: 'user_id,recipe_key,activity_type' }));
      }
      removeMutation(mutation.key); synced += 1;
    } catch { failed = true; break; }
  }
  clearCachedPrefix('plan:'); clearCachedPrefix('pantry:');
  const pending = pendingMutations().length;
  announceOfflineState({ pending, synced });
  return { synced, pending, failed };
}

export async function consumePantryForMeal(user, meal, servingsCooked = null) {
  const pantry = await loadPantryItemsForUser(user);
  const updates = [];

  const preview = buildPantryConsumptionPreview(meal, pantry, servingsCooked);
  for (const line of preview) {
    const match = line.pantryItem;
    if (!match) continue;
    const remaining = line.remaining_quantity;
    if (remaining <= 0.000001) await deletePantryItemForUser(user, match.id);
    else await savePantryItemForUser(user, { ...match, quantity: remaining });
    updates.push({ name: match.name, before: match.quantity, after: remaining, unit: match.unit, before_item: match });
  }

  return updates;
}

export async function undoPantryConsumption(user, updates = []) {
  const restored = [];
  for (const update of updates) {
    const before = update.before_item || { name: update.name, quantity: update.before, unit: update.unit, category: 'Other' };
    const pantry = await loadPantryItemsForUser(user);
    const current = pantry.find((item) => ingredientIdentityKey(item) === ingredientIdentityKey(before)
      && compatibleUnitKey(item.unit) === compatibleUnitKey(before.unit));
    restored.push(await savePantryItemForUser(user, { ...before, id: current?.id || undefined, quantity: Number(before.quantity || update.before || 0) }));
  }
  return restored;
}

export async function saveLeftoversForUser(user, meal, portions) {
  const quantity = Math.max(0, Number(portions || 0));
  if (!quantity) return null;
  const name = `Leftover: ${meal.title}`;
  const pantry = await loadPantryItemsForUser(user);
  const existing = pantry.find((item) => String(item.name).toLowerCase() === name.toLowerCase());
  return savePantryItemForUser(user, {
    ...(existing || {}), name, quantity: Number(existing?.quantity || 0) + quantity,
    unit: 'serving', category: 'Leftovers', estimated_price: 0, price_unit: 'serving', is_free: true,
    expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  });
}

async function addToPantryItem(user, item) {
  const clean = {
    ingredient_id: validUuidOrNull(item.ingredient_id),
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
  clearCachedPrefix(`pantry:`);
  if (!hasSupabaseEnv() || !supabase) return null;

  const cleanItems = (trip.items || [])
    .filter((item) => String(item.name || '').trim() && Number(item.quantity || 0) > 0)
    .map((item) => ({
      ingredient_id: validUuidOrNull(item.ingredient_id),
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity || 0),
      unit: item.unit || '',
      category: item.category || 'Other',
      estimated_price: Number(item.estimated_price || 0),
      price_unit: item.price_unit || '',
      is_free: Boolean(item.is_free),
    }));

  if (!cleanItems.length) throw new Error('Add at least one pantry item.');

  if (isOffline()) {
    const localId = offlineUuid();
    const idempotentItems = cleanItems.map((item) => ({ ...item, id: offlineUuid() }));
    const cleanTrip = { id: localId, user_id: user.id, store: trip.store || '', bought_at: trip.bought_at || new Date().toISOString().slice(0, 10), notes: trip.notes || '', items: idempotentItems, item_count: idempotentItems.length, created_at: new Date().toISOString() };
    for (const item of idempotentItems) {
      const pantryAddition = { ...item };
      delete pantryAddition.id;
      const pantry = readSnapshot(user.id, 'pantry-items')?.data || [];
      const existing = pantry.find((stock) => ingredientIdentityKey(stock) === ingredientIdentityKey(pantryAddition) && compatibleUnitKey(stock.unit) === compatibleUnitKey(pantryAddition.unit));
      await savePantryItemForUser(user, { ...(existing || {}), ...pantryAddition, id: existing?.id, quantity: Number(existing?.quantity || 0) + pantryAddition.quantity });
    }
    const trips = readSnapshot(user.id, 'pantry-trips')?.data || [];
    writeSnapshot(user.id, 'pantry-trips', [cleanTrip, ...trips].slice(0, 20));
    const queue = enqueueMutation({ key: `${user.id}:trip:${localId}`, type: 'pantry-trip', userId: user.id, trip: cleanTrip });
    announceOfflineState({ pending: queue.length, savedOffline: true });
    return cleanTrip;
  }

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
