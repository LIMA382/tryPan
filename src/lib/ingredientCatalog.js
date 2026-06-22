export const REGIONS = [
  { code: 'pt', label: 'Portugal', currency: '€' },
  { code: 'nl', label: 'Netherlands', currency: '€' },
];

const BASE_INGREDIENTS = [
  ['Rice', 'Pantry', 'g', 'kg', 1.55, 1.85],
  ['Basmati rice', 'Pantry', 'g', 'kg', 2.35, 2.75],
  ['Pasta', 'Pantry', 'g', 'kg', 1.45, 1.75],
  ['Spaghetti', 'Pantry', 'g', 'kg', 1.35, 1.65],
  ['Couscous', 'Pantry', 'g', 'kg', 2.15, 2.55],
  ['Noodles', 'Pantry', 'g', 'kg', 2.60, 3.10],
  ['Potatoes', 'Produce', 'g', 'kg', 1.35, 1.65],
  ['Sweet potatoes', 'Produce', 'g', 'kg', 2.20, 2.70],
  ['Tomatoes', 'Produce', 'g', 'kg', 2.20, 2.95],
  ['Cherry tomatoes', 'Produce', 'g', 'kg', 4.50, 5.20],
  ['Onion', 'Produce', 'g', 'kg', 1.20, 1.45],
  ['Garlic', 'Produce', 'g', 'kg', 5.50, 6.20],
  ['Carrots', 'Produce', 'g', 'kg', 1.10, 1.40],
  ['Broccoli', 'Produce', 'g', 'kg', 2.20, 2.80],
  ['Spinach', 'Produce', 'g', 'kg', 5.80, 6.70],
  ['Lettuce', 'Produce', 'unit', 'unit', 1.20, 1.40],
  ['Cucumber', 'Produce', 'unit', 'unit', 0.90, 1.05],
  ['Avocado', 'Produce', 'unit', 'unit', 1.45, 1.65],
  ['Lemon', 'Produce', 'unit', 'unit', 0.32, 0.42],
  ['Lime', 'Produce', 'unit', 'unit', 0.38, 0.48],
  ['Basil', 'Produce', 'bunch', 'bunch', 1.25, 1.55],
  ['Parsley', 'Produce', 'bunch', 'bunch', 0.95, 1.15],
  ['Chicken breast', 'Protein', 'g', 'kg', 7.20, 8.60],
  ['Chicken thighs', 'Protein', 'g', 'kg', 4.90, 6.10],
  ['Ground beef', 'Protein', 'g', 'kg', 8.40, 9.80],
  ['Turkey slices', 'Protein', 'g', 'kg', 10.50, 12.00],
  ['Salmon', 'Protein', 'g', 'kg', 15.50, 18.50],
  ['Shrimp', 'Protein', 'g', 'kg', 12.50, 15.00],
  ['Tuna', 'Pantry', 'can', 'can', 1.25, 1.55],
  ['Tofu', 'Protein', 'g', 'kg', 5.20, 6.20],
  ['Chickpeas', 'Pantry', 'can', 'can', 0.85, 1.05],
  ['Black beans', 'Pantry', 'can', 'can', 0.90, 1.15],
  ['Eggs', 'Dairy', 'unit', 'unit', 0.28, 0.34],
  ['Milk', 'Dairy', 'ml', 'l', 0.92, 1.10],
  ['Greek yogurt', 'Dairy', 'g', 'kg', 3.20, 3.80],
  ['Cream', 'Dairy', 'ml', 'l', 3.40, 3.90],
  ['Feta', 'Dairy', 'g', 'kg', 8.50, 9.80],
  ['Halloumi', 'Dairy', 'g', 'kg', 11.00, 12.50],
  ['Parmesan', 'Dairy', 'g', 'kg', 15.00, 17.00],
  ['Coconut milk', 'Pantry', 'can', 'can', 1.35, 1.55],
  ['Olive oil', 'Pantry', 'ml', 'l', 6.50, 7.90],
  ['Soy sauce', 'Pantry', 'ml', 'l', 4.20, 4.80],
  ['Peanut butter', 'Pantry', 'g', 'kg', 4.60, 5.30],
  ['Wraps', 'Bakery', 'unit', 'unit', 0.32, 0.38],
  ['Bread', 'Bakery', 'loaf', 'loaf', 1.65, 2.10],
  ['Sourdough', 'Bakery', 'slice', 'slice', 0.35, 0.42],
  ['Peas', 'Frozen', 'g', 'kg', 2.10, 2.45],
  ['Green beans', 'Produce', 'g', 'kg', 3.20, 3.80],
  ['Mushrooms', 'Produce', 'g', 'kg', 4.20, 4.90],
  ['Vegetable stock', 'Pantry', 'ml', 'l', 1.70, 2.10],
  ['Roasted peppers', 'Produce', 'unit', 'unit', 0.95, 1.15],
  ['Cheese', 'Dairy', 'g', 'kg', 7.50, 8.80],
  ['Bacon', 'Protein', 'g', 'kg', 8.80, 10.20],
];

export const starterIngredients = BASE_INGREDIENTS.flatMap(([name, category, defaultUnit, priceUnit, ptPrice, nlPrice]) => ([
  {
    id: `starter-pt-${slugify(name)}`,
    name,
    region: 'pt',
    category,
    default_unit: defaultUnit,
    price_unit: priceUnit,
    estimated_price: ptPrice,
    is_starter: true,
  },
  {
    id: `starter-nl-${slugify(name)}`,
    name,
    region: 'nl',
    category,
    default_unit: defaultUnit,
    price_unit: priceUnit,
    estimated_price: nlPrice,
    is_starter: true,
  },
]));

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function regionLabel(region) {
  return REGIONS.find((item) => item.code === region)?.label || 'Portugal';
}

export function normalizeRegion(value) {
  return value === 'nl' ? 'nl' : 'pt';
}
