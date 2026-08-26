export function plannedMealCost(meals = [], plan = null) {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  return Math.round(Object.entries(plan?.slots || {}).reduce((sum, [key, id]) => {
    const meal = byId.get(id);
    if (!meal) return sum;
    const recipeServings = Math.max(1, Number(meal.servings || 1));
    const plannedServings = Math.max(1, Number(plan?.servings?.[key] || 1));
    return sum + Number(meal.price || 0) / recipeServings * plannedServings;
  }, 0) * 100) / 100;
}
