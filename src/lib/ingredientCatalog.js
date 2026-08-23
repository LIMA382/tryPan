export const REGIONS = [
  { code: 'pt', label: 'Portugal', currency: '€' },
  { code: 'nl', label: 'Netherlands', currency: '€' },
];

// Netherlands defaults checked against regular Albert Heijn online prices on 2026-08-23.
// Values exclude temporary Bonus discounts and are normalized to price_unit.
const BASE_INGREDIENTS = [
  ['Rice', 'Pantry', 'g', 'kg', 1.55, 1.19],
  ['Basmati rice', 'Pantry', 'g', 'kg', 2.35, 1.85],
  ['Pasta', 'Pantry', 'g', 'kg', 1.45, 1.58],
  ['Spaghetti', 'Pantry', 'g', 'kg', 1.35, 1.78],
  ['Couscous', 'Pantry', 'g', 'kg', 2.15, 2.58],
  ['Noodles', 'Pantry', 'g', 'kg', 2.60, 3.98],
  ['Potatoes', 'Produce', 'g', 'kg', 1.35, 1.16],
  ['Sweet potatoes', 'Produce', 'g', 'kg', 2.20, 2.99],
  ['Tomatoes', 'Produce', 'g', 'kg', 2.20, 3.58],
  ['Cherry tomatoes', 'Produce', 'g', 'kg', 4.50, 4.36],
  ['Onion', 'Produce', 'g', 'kg', 1.20, 0.99],
  ['Garlic', 'Produce', 'g', 'kg', 5.50, 6.95],
  ['Carrots', 'Produce', 'g', 'kg', 1.10, 3.58],
  ['Broccoli', 'Produce', 'g', 'kg', 2.20, 5.58],
  ['Spinach', 'Produce', 'g', 'kg', 5.80, 7.16],
  ['Lettuce', 'Produce', 'unit', 'unit', 1.20, 1.09],
  ['Cucumber', 'Produce', 'unit', 'unit', 0.90, 0.99],
  ['Avocado', 'Produce', 'unit', 'unit', 1.45, 1.39],
  ['Lemon', 'Produce', 'unit', 'unit', 0.32, 0.70],
  ['Lime', 'Produce', 'unit', 'unit', 0.38, 0.65],
  ['Basil', 'Produce', 'bunch', 'bunch', 1.25, 1.29],
  ['Parsley', 'Produce', 'bunch', 'bunch', 0.95, 1.19],
  ['Chicken breast', 'Protein', 'g', 'kg', 7.20, 18.30],
  ['Chicken thighs', 'Protein', 'g', 'kg', 4.90, 11.98],
  ['Ground beef', 'Protein', 'g', 'kg', 8.40, 16.63],
  ['Turkey slices', 'Protein', 'g', 'kg', 10.50, 19.90],
  ['Salmon', 'Protein', 'g', 'kg', 15.50, 29.95],
  ['Shrimp', 'Protein', 'g', 'kg', 12.50, 19.98],
  ['Tuna', 'Pantry', 'can', 'can', 1.25, 1.39],
  ['Tofu', 'Protein', 'g', 'kg', 5.20, 6.63],
  ['Chickpeas', 'Pantry', 'can', 'can', 0.85, 0.79],
  ['Black beans', 'Pantry', 'can', 'can', 0.90, 0.89],
  ['Eggs', 'Dairy', 'unit', 'unit', 0.28, 0.30],
  ['Milk', 'Dairy', 'ml', 'l', 0.92, 1.39],
  ['Greek yogurt', 'Dairy', 'g', 'kg', 3.20, 2.15],
  ['Cream', 'Dairy', 'ml', 'l', 3.40, 4.95],
  ['Feta', 'Dairy', 'g', 'kg', 8.50, 11.45],
  ['Halloumi', 'Dairy', 'g', 'kg', 11.00, 15.95],
  ['Parmesan', 'Dairy', 'g', 'kg', 15.00, 20.95],
  ['Coconut milk', 'Pantry', 'can', 'can', 1.35, 1.29],
  ['Olive oil', 'Pantry', 'ml', 'l', 6.50, 9.98],
  ['Soy sauce', 'Pantry', 'ml', 'l', 4.20, 5.98],
  ['Peanut butter', 'Pantry', 'g', 'kg', 4.60, 5.18],
  ['Wraps', 'Bakery', 'unit', 'unit', 0.32, 0.33],
  ['Bread', 'Bakery', 'loaf', 'loaf', 1.65, 1.99],
  ['Sourdough', 'Bakery', 'slice', 'slice', 0.35, 0.35],
  ['Peas', 'Frozen', 'g', 'kg', 2.10, 2.78],
  ['Green beans', 'Produce', 'g', 'kg', 3.20, 7.98],
  ['Mushrooms', 'Produce', 'g', 'kg', 4.20, 5.56],
  ['Vegetable stock', 'Pantry', 'ml', 'l', 1.70, 1.98],
  ['Roasted peppers', 'Produce', 'unit', 'unit', 0.95, 1.19],
  ['Cheese', 'Dairy', 'g', 'kg', 7.50, 10.95],
  ['Bacon', 'Protein', 'g', 'kg', 8.80, 15.96],
  ['Flour', 'Pantry', 'g', 'kg', 0.95, 0.89],
  ['Whole wheat flour', 'Pantry', 'g', 'kg', 1.25, 1.29],
  ['Sugar', 'Pantry', 'g', 'kg', 1.15, 1.49],
  ['Brown sugar', 'Pantry', 'g', 'kg', 1.60, 2.58],
  ['Salt', 'Spices', 'g', 'kg', 0.70, 0.85],
  ['Black pepper', 'Spices', 'g', 'kg', 16.00, 27.80],
  ['Paprika', 'Spices', 'g', 'kg', 15.00, 20.20],
  ['Cumin', 'Spices', 'g', 'kg', 18.00, 25.51],
  ['Cinnamon', 'Spices', 'g', 'kg', 16.00, 20.20],
  ['Oregano', 'Spices', 'g', 'kg', 20.00, 29.75],
  ['Curry powder', 'Spices', 'g', 'kg', 16.00, 17.35],
  ['Chili flakes', 'Spices', 'g', 'kg', 22.00, 33.11],
  ['Baking powder', 'Pantry', 'g', 'kg', 7.00, 7.92],
  ['Yeast', 'Pantry', 'g', 'kg', 12.00, 15.80],
  ['Butter', 'Dairy', 'g', 'kg', 7.50, 12.76],
  ['Mozzarella', 'Dairy', 'g', 'kg', 8.50, 9.95],
  ['Cheddar', 'Dairy', 'g', 'kg', 9.00, 13.95],
  ['Oats', 'Pantry', 'g', 'kg', 1.45, 1.58],
  ['Corn flakes', 'Pantry', 'g', 'kg', 4.00, 4.38],
  ['Bananas', 'Produce', 'g', 'kg', 1.25, 1.45],
  ['Apples', 'Produce', 'g', 'kg', 1.80, 1.57],
  ['Oranges', 'Produce', 'g', 'kg', 1.50, 1.13],
  ['Strawberries', 'Produce', 'g', 'kg', 5.50, 7.98],
  ['Blueberries', 'Produce', 'g', 'kg', 9.50, 11.96],
  ['Zucchini', 'Produce', 'g', 'kg', 2.10, 3.18],
  ['Bell pepper', 'Produce', 'g', 'kg', 3.20, 5.98],
  ['Eggplant', 'Produce', 'g', 'kg', 2.80, 3.98],
  ['Cauliflower', 'Produce', 'g', 'kg', 2.70, 1.69],
  ['Cabbage', 'Produce', 'g', 'kg', 1.60, 1.98],
  ['Pork loin', 'Protein', 'g', 'kg', 5.80, 11.98],
  ['Pork chops', 'Protein', 'g', 'kg', 6.20, 12.98],
  ['Cod', 'Protein', 'g', 'kg', 12.00, 24.98],
  ['White fish', 'Protein', 'g', 'kg', 9.00, 13.98],
  ['Lentils', 'Pantry', 'g', 'kg', 2.40, 3.98],
  ['Red beans', 'Pantry', 'can', 'can', 0.95, 0.89],
  ['Kidney beans', 'Pantry', 'can', 'can', 0.95, 0.89],
  ['Quinoa', 'Pantry', 'g', 'kg', 5.80, 7.98],
  ['Canned tomatoes', 'Pantry', 'can', 'can', 0.85, 0.59],
  ['Tomato paste', 'Pantry', 'g', 'kg', 4.50, 7.00],
  ['Honey', 'Pantry', 'g', 'kg', 7.00, 8.98],
  ['Vinegar', 'Pantry', 'ml', 'l', 1.80, 1.78],
  ['Mayonnaise', 'Pantry', 'g', 'kg', 4.00, 4.38],
  ['Mustard', 'Pantry', 'g', 'kg', 3.50, 4.95],
  ['Frozen mixed vegetables', 'Frozen', 'g', 'kg', 2.20, 2.78],
  ['Frozen berries', 'Frozen', 'g', 'kg', 5.50, 6.98]
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
