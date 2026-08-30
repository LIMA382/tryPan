export function plannedMealCost(meals = [], plan = null) {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  return Math.round(Object.entries(plan?.slots || {}).reduce((sum, [key, ids]) => sum + (Array.isArray(ids) ? ids : (ids ? [ids] : [])).reduce((slotSum, id) => {
    const meal = byId.get(id);
    if (!meal) return slotSum;
    const recipeServings = Math.max(1, Number(meal.servings || 1));
    const plannedServings = Math.max(1, Number(plan?.servings?.[`${key}:${id}`] || plan?.servings?.[key] || 1));
    return slotSum + Number(meal.price || 0) / recipeServings * plannedServings;
  }, 0), 0) * 100) / 100;
}
