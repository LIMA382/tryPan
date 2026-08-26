const DEFINITIONS = {
  mg: { group: 'mass', base: 'g', factor: 0.001 },
  g: { group: 'mass', base: 'g', factor: 1 },
  kg: { group: 'mass', base: 'g', factor: 1000 },
  ml: { group: 'volume', base: 'ml', factor: 1 },
  cl: { group: 'volume', base: 'ml', factor: 10 },
  dl: { group: 'volume', base: 'ml', factor: 100 },
  tsp: { group: 'volume', base: 'ml', factor: 5 },
  tbsp: { group: 'volume', base: 'ml', factor: 15 },
  cup: { group: 'volume', base: 'ml', factor: 240, approximate: true },
  l: { group: 'volume', base: 'ml', factor: 1000 },
  unit: { group: 'count', base: 'unit', factor: 1 },
};

const ALIASES = {
  milligram: 'mg', milligrams: 'mg', gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml', centiliter: 'cl', centiliters: 'cl',
  deciliter: 'dl', deciliters: 'dl', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  teaspoon: 'tsp', teaspoons: 'tsp', tablespoon: 'tbsp', tablespoons: 'tbsp', cups: 'cup',
  units: 'unit', piece: 'unit', pieces: 'unit', pc: 'unit', pcs: 'unit', egg: 'unit', eggs: 'unit',
  cans: 'can', jars: 'jar', bottles: 'bottle', heads: 'head', bunches: 'bunch', loaves: 'loaf',
  slices: 'slice', cloves: 'clove', servings: 'serving', packs: 'pack',
};

export function normalizeUnit(unit) {
  const value = String(unit || '').trim().toLowerCase();
  return ALIASES[value] || value || 'unit';
}

export function unitInfo(unit) {
  const normalized = normalizeUnit(unit);
  return DEFINITIONS[normalized] || { group: normalized, base: normalized, factor: 1 };
}

export function compatibleUnitKey(unit) {
  const info = unitInfo(unit);
  return `${info.group}:${info.base}`;
}

export function toBaseQuantity(quantity, unit) {
  return Number(quantity || 0) * unitInfo(unit).factor;
}

export function fromBaseQuantity(quantity, unit) {
  const value = Number(quantity || 0) / unitInfo(unit).factor;
  return Math.round(value * 100) / 100;
}

export function convertQuantity(quantity, fromUnit, toUnit) {
  const from = unitInfo(fromUnit);
  const to = unitInfo(toUnit);
  if (from.group !== to.group || from.base !== to.base) return null;
  return {
    value: fromBaseQuantity(toBaseQuantity(quantity, fromUnit), toUnit),
    approximate: Boolean(from.approximate || to.approximate),
  };
}
