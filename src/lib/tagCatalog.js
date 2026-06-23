export const TAG_GROUPS = [
  {
    label: 'Meal time',
    tags: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
  },
  {
    label: 'Speed',
    tags: ['Quick', '15 min', '30 min', 'Meal prep'],
  },
  {
    label: 'Style',
    tags: ['Budget', 'Family', 'Comfort', 'Fresh', 'One pan', 'High protein'],
  },
  {
    label: 'Diet',
    tags: ['Vegetarian', 'Vegan', 'Gluten free', 'Low carb'],
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
