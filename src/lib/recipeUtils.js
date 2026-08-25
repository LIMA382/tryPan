export function recipeSlug(value) {
  return String(value || 'recipe')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const realRecipeImages = new Set([
  'salmon-pasta', 'greek-salad-bowl', 'tomato-basil-soup', 'lemon-chicken-tray-bake',
  'peanut-tofu-noodles', 'tuna-avocado-toast', 'mushroom-risotto', 'beef-taco-bowls',
  'halloumi-couscous-salad', 'shrimp-fried-rice', 'smoky-chickpeas-on-toast',
  'microwave-shakshuka', 'fifteen-minute-veggie-ramen', 'cheesy-tuna-pesto-pasta',
  'spinach-and-red-lentil-dhal', 'freezer-black-bean-quesadillas',
  'one-pot-tomato-chickpea-pasta', 'fluffy-everyday-pancakes',
  'red-lentil-tomato-soup', 'chickpea-curry',
]);

export function recipeImageForMeal(meal = {}) {
  if (meal.image_url) return meal.image_url;

  const slug = recipeSlug(meal.title);
  if (realRecipeImages.has(slug)) return `/images/recipes/real/${slug}.jpg`;

  const haystack = `${meal.title || ''} ${meal.meal_type || ''} ${(meal.tags || []).join(' ')}`.toLowerCase();
  if (/breakfast|pancake|porridge|oat|omelette|smoothie|toast/.test(haystack)) return '/images/recipes/student-breakfast.jpg';
  if (/soup|stew|chowder|broth/.test(haystack)) return '/images/recipes/tomato-lentil-soup.jpg';
  if (/pasta|spaghetti|lasagna|lasagne|noodle|gnocchi|macaroni|carbonara/.test(haystack)) return '/images/recipes/tomato-pasta.jpg';
  return '/images/recipes/student-rice-bowl.jpg';
}

export function recipePath(meal = {}) {
  return `/recipes/${recipeSlug(meal.title)}`;
}
