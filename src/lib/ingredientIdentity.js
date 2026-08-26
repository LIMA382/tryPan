const CANONICAL_ALIASES = {
  'bell pepper': ['bell peppers', 'capsicum', 'sweet pepper', 'sweet peppers'],
  'black bean': ['black beans'],
  'chickpea': ['chickpeas', 'garbanzo bean', 'garbanzo beans'],
  'coriander': ['cilantro', 'coriander leaves'],
  'courgette': ['courgettes', 'zucchini', 'zucchinis'],
  'egg': ['eggs'],
  'green onion': ['green onions', 'scallion', 'scallions', 'spring onion', 'spring onions'],
  'ground beef': ['beef mince', 'minced beef'],
  'kidney bean': ['kidney beans'],
  'lentil': ['lentils'],
  'red pepper': ['red peppers'],
  'shrimp': ['shrimps', 'prawn', 'prawns'],
  'tomato': ['tomatoes', 'fresh tomato', 'fresh tomatoes'],
  'wrap': ['wraps', 'tortilla', 'tortillas'],
};

const aliasToCanonical = new Map();
for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES)) {
  aliasToCanonical.set(canonical, canonical);
  for (const alias of aliases) aliasToCanonical.set(alias, canonical);
}

export function cleanIngredientName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function canonicalIngredientName(value) {
  const clean = cleanIngredientName(value);
  return aliasToCanonical.get(clean) || clean;
}

export function normalizedAliases(values = []) {
  const source = Array.isArray(values) ? values : String(values || '').split(',');
  return [...new Set(source.map(cleanIngredientName).filter(Boolean))];
}

export function ingredientNamesMatch(left, right, leftAliases = [], rightAliases = []) {
  const leftNames = [left, ...normalizedAliases(leftAliases)].map(canonicalIngredientName);
  const rightNames = new Set([right, ...normalizedAliases(rightAliases)].map(canonicalIngredientName));
  return leftNames.some((name) => rightNames.has(name));
}

export function ingredientMatchesQuery(item, query) {
  const needle = cleanIngredientName(query);
  if (!needle) return true;
  const canonicalNeedle = canonicalIngredientName(needle);
  const names = [item?.name, ...(item?.aliases || [])].map(cleanIngredientName);
  return names.some((name) => name.includes(needle) || canonicalIngredientName(name).includes(canonicalNeedle))
    || cleanIngredientName(item?.category).includes(needle);
}

export function ingredientIdentityKey(item = {}) {
  const name = canonicalIngredientName(item.canonical_name || item.name);
  if (name) return `name:${name}`;
  const id = item.ingredient_id && !String(item.ingredient_id).startsWith('starter-') ? item.ingredient_id : 'unknown';
  return `id:${id}`;
}
