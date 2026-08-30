import { ingredientIdentityKey } from './ingredientIdentity.mjs';
import { compatibleUnitKey, toBaseQuantity } from './unitConversion.mjs';

const daysUntil = (date, now) => date ? Math.ceil((new Date(`${date}T12:00:00`) - now) / 86400000) : null;

export function rankMeals(meals = [], pantryItems = [], options = {}) {
  const now = options.now || new Date();
  const maxPrepTime = Math.max(5, Number(options.maxPrepTime || 30));
  const pantry = new Map();
  for (const item of pantryItems) {
    const key = `${ingredientIdentityKey(item)}|${compatibleUnitKey(item.unit)}`;
    const current = pantry.get(key) || { quantityBase: 0, expiring: false };
    current.quantityBase += toBaseQuantity(item.quantity, item.unit);
    const days = daysUntil(item.expiry_date, now);
    current.expiring ||= days !== null && days <= 3;
    pantry.set(key, current);
  }

  return meals.map((meal) => {
    const ingredients = meal.ingredients || [];
    let ready = 0, partial = 0, expiringMatches = 0;
    for (const ingredient of ingredients) {
      const stock = pantry.get(`${ingredientIdentityKey(ingredient)}|${compatibleUnitKey(ingredient.unit)}`);
      if (!stock) continue;
      const need = toBaseQuantity(ingredient.quantity, ingredient.unit);
      if (stock.quantityBase + 0.000001 >= need) ready += 1;
      else if (stock.quantityBase > 0) partial += 1;
      if (stock.expiring) expiringMatches += 1;
    }
    const coverage = ingredients.length ? Math.round(((ready + partial * 0.5) / ingredients.length) * 100) : 0;
    const prep = Number(meal.prep_time || 0);
    const perServing = Number(meal.price || 0) / Math.max(1, Number(meal.servings || 1));
    const timePenalty = Math.max(0, prep - maxPrepTime) * 2;
    const score = coverage * 3 + expiringMatches * 35 - timePenalty - perServing * 4;
    return { ...meal, pantry_coverage: coverage, pantry_matched: ready, pantry_partial: partial, pantry_total: ingredients.length, expiring_matches: expiringMatches, recommendation_score: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.recommendation_score - a.recommendation_score || Number(a.price || 0) - Number(b.price || 0));
}

export function buildSmartWeekPlan(meals, pantryItems, plan, settings = {}) {
  const timeLimit = settings.examMode ? Math.min(15, Number(settings.maxPrepTime || 25)) : Number(settings.maxPrepTime || 25);
  const ranked = rankMeals(meals, pantryItems, { maxPrepTime: timeLimit });
  const slots = { ...(plan?.slots || {}) };
  const servings = { ...(plan?.servings || {}) };
  const usage = new Map();
  Object.values(slots).flatMap((ids) => Array.isArray(ids) ? ids : (ids ? [ids] : [])).forEach((id) => usage.set(id, (usage.get(id) || 0) + 1));
  const additions = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const slotNames = ['Breakfast', 'Lunch', 'Dinner'];

  for (const day of days) for (const slot of slotNames) {
    const key = `${day}-${slot}`;
    if (slots[key]) continue;
    const kind = slot.toLowerCase();
    const campusFast = (settings.campusDays || []).includes(day) && slot !== 'Dinner';
    const candidates = ranked.filter((meal) => (meal.meal_type === kind || meal.meal_type === 'both') && (usage.get(meal.id) || 0) < 2);
    const withinTime = candidates.filter((item) => Number(item.prep_time || 0) <= timeLimit);
    const meal = (campusFast ? withinTime.find((item) => Number(item.prep_time || 0) <= 15) : withinTime[0])
      || withinTime[0] || candidates[0];
    if (!meal) continue;
    slots[key] = meal.id;
    servings[key] = Math.max(1, Number(settings.householdSize || 1));
    usage.set(meal.id, (usage.get(meal.id) || 0) + 1);
    additions.push({ day, slot, mealId: meal.id, servings: servings[key], score: meal.recommendation_score });
  }
  return { ...plan, slots, servings, additions };
}
