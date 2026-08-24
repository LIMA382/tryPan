import 'server-only';
import { publicMeals } from './demoData';
import { recipeImageForMeal, recipeSlug } from './recipeUtils';

function normalizeIngredient(item, index, mealId) {
  if (Array.isArray(item)) {
    return { id: `${mealId}-ingredient-${index}`, name: item[0], quantity: Number(item[1] || 0), unit: item[2] || '', category: item[3] || 'Other' };
  }
  const catalog = item.ingredient_catalog || {};
  return {
    id: item.id || `${mealId}-ingredient-${index}`,
    name: item.name || catalog.name || '',
    quantity: Number(item.quantity || 0),
    unit: item.unit || catalog.default_unit || '',
    category: item.category || catalog.category || 'Other',
  };
}

function normalizeRecipe(meal, index, source = 'curated') {
  const id = meal.id || `public-${index}`;
  const normalized = {
    id,
    user_id: meal.user_id || null,
    title: meal.title || 'Untitled recipe',
    description: meal.description || '',
    instructions: meal.instructions || '',
    video_url: meal.video_url || '',
    meal_type: meal.meal_type || 'both',
    prep_time: Number(meal.prep_time || 20),
    servings: Number(meal.servings || 1),
    price: Number(meal.price || 0),
    tags: Array.isArray(meal.tags) ? meal.tags : [],
    creator: meal.creator || 'tryPan Student Kitchen',
    is_public: true,
    source,
    ingredients: (meal.meal_ingredients || meal.ingredients || []).map((item, ingredientIndex) => normalizeIngredient(item, ingredientIndex, id)),
  };
  normalized.slug = recipeSlug(normalized.title);
  normalized.image = recipeImageForMeal(normalized);
  return normalized;
}

export function getCuratedRecipes() {
  return publicMeals.map((meal, index) => normalizeRecipe(meal, index));
}

async function getDatabaseRecipes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return [];

  const query = 'select=*,meal_ingredients(*,ingredient_catalog(*))&is_public=eq.true&order=created_at.desc';
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/meals?${query}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const rows = await response.json();
    return rows.map((meal, index) => normalizeRecipe(meal, index, 'database'));
  } catch {
    return [];
  }
}

export async function getPublicRecipes() {
  const database = await getDatabaseRecipes();
  const titles = new Set(database.map((meal) => meal.title.toLowerCase()));
  return [...database, ...getCuratedRecipes().filter((meal) => !titles.has(meal.title.toLowerCase()))];
}

export async function getRecipeBySlug(slugOrId) {
  const value = decodeURIComponent(String(slugOrId || '')).toLowerCase();
  const recipes = await getPublicRecipes();
  return recipes.find((meal) => meal.slug === value || String(meal.id).toLowerCase() === value) || null;
}

