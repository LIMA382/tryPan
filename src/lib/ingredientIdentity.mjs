const CANONICAL_ALIASES = {
  'all purpose flour': ['all-purpose flour', 'plain flour'],
  'aubergine': ['aubergines', 'eggplant', 'eggplants'],
  'baking soda': ['bicarbonate of soda', 'sodium bicarbonate'],
  'banana': ['bananas'],
  'bell pepper': ['bell peppers', 'capsicum', 'sweet pepper', 'sweet peppers'],
  'black bean': ['black beans'],
  'carrot': ['carrots'],
  'chickpea': ['chickpeas', 'garbanzo bean', 'garbanzo beans'],
  'chilli pepper': ['chili pepper', 'chilli peppers', 'chili peppers'],
  'coriander': ['cilantro', 'coriander leaves'],
  'courgette': ['courgettes', 'zucchini', 'zucchinis'],
  'double cream': ['heavy cream', 'heavy whipping cream'],
  'egg': ['eggs'],
  'icing sugar': ['confectioners sugar', 'confectioner sugar', 'powdered sugar'],
  'green onion': ['green onions', 'scallion', 'scallions', 'spring onion', 'spring onions'],
  'ground beef': ['beef mince', 'minced beef'],
  'ground pork': ['minced pork', 'pork mince'],
  'kidney bean': ['kidney beans'],
  'maize': ['corn', 'sweetcorn', 'sweet corn'],
  'lentil': ['lentils'],
  'mushroom': ['mushrooms'],
  'onion': ['onions'],
  'potato': ['potatoes'],
  'red pepper': ['red peppers'],
  'rocket': ['arugula'],
  'shrimp': ['shrimps', 'prawn', 'prawns'],
  'soy sauce': ['soya sauce'],
  'tomato': ['tomatoes', 'fresh tomato', 'fresh tomatoes'],
  'wrap': ['wraps', 'tortilla', 'tortillas'],
  'yoghurt': ['yogurt'],
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

export function ingredientAliasesForName(value) {
  const canonical = canonicalIngredientName(value);
  return normalizedAliases(CANONICAL_ALIASES[canonical] || []);
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

export function ingredientMatchRank(item, query) {
  const needle = cleanIngredientName(query);
  if (!needle) return 4;
  const canonicalNeedle = canonicalIngredientName(needle);
  const name = cleanIngredientName(item?.name);
  const aliases = normalizedAliases(item?.aliases);
  if (name === needle) return 0;
  if (canonicalIngredientName(name) === canonicalNeedle || aliases.some((alias) => alias === needle)) return 1;
  if (name.startsWith(needle) || aliases.some((alias) => alias.startsWith(needle))) return 2;
  return 3;
}

export function ingredientIdentityKey(item = {}) {
  const name = canonicalIngredientName(item.canonical_name || item.name);
  if (name) return `name:${name}`;
  const id = item.ingredient_id && !String(item.ingredient_id).startsWith('starter-') ? item.ingredient_id : 'unknown';
  return `id:${id}`;
}
