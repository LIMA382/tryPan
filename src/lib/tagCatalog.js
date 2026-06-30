export const TAG_GROUPS = [
  {
    label: 'Meal time',
    tags: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
  },
  {
    label: 'Planning help',
    tags: ['Quick', 'Cheap', 'Leftovers', 'Freezer', 'Pantry', 'Low effort', 'Batch cook'],
  },
  {
    label: 'Cooking style',
    tags: ['One pot', 'One pan', 'Comfort food', 'Fresh', 'Kid friendly', 'Meal prep'],
  },
  {
    label: 'Nutrition',
    tags: ['Vegetarian', 'Vegan', 'High protein', 'Gluten free', 'Low carb'],
  },
  {
    label: 'Region',
    tags: ['Portugal', 'Netherlands'],
  },
];

export const PRESET_TAGS = TAG_GROUPS.flatMap((group) => group.tags);

export function normalizeTags(tags) {
  const input = Array.isArray(tags) ? tags : String(tags || '').split(',');
  const seen = new Set();
  const clean = [];

  for (const tag of input) {
    const value = String(tag || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(value);
  }

  return clean;
}
