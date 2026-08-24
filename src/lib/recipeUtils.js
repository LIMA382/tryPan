export function recipeSlug(value) {
  return String(value || 'recipe')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function recipeImageForMeal(meal = {}) {
  if (meal.image_url) return meal.image_url;

  const haystack = `${meal.title || ''} ${meal.meal_type || ''} ${(meal.tags || []).join(' ')}`.toLowerCase();
  if (/breakfast|pancake|porridge|oat|omelette|smoothie|toast/.test(haystack)) return '/images/recipes/student-breakfast.jpg';
  if (/soup|stew|chowder|broth/.test(haystack)) return '/images/recipes/tomato-lentil-soup.jpg';
  if (/pasta|spaghetti|lasagna|lasagne|noodle|gnocchi|macaroni|carbonara/.test(haystack)) return '/images/recipes/tomato-pasta.jpg';
  return '/images/recipes/student-rice-bowl.jpg';
}

export function recipePath(meal = {}) {
  return `/recipes/${recipeSlug(meal.title)}`;
}

