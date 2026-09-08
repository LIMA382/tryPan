import { ingredientIdentityKey } from './ingredientIdentity.mjs';
import { compatibleUnitKey, fromBaseQuantity, toBaseQuantity } from './unitConversion.mjs';

export function buildPantryConsumptionPreview(meal, pantryItems = [], servingsCooked = null) {
  const recipeServings = Math.max(1, Number(meal?.servings || 1));
  const cooked = Math.max(1, Number(servingsCooked || recipeServings));
  const scale = cooked / recipeServings;

  const combined = new Map();
  for (const ingredient of meal?.ingredients || []) {
    const key = `${ingredientIdentityKey(ingredient)}|${compatibleUnitKey(ingredient.unit)}`;
    const existing = combined.get(key);
    if (existing) existing.quantityBase += toBaseQuantity(ingredient.quantity, ingredient.unit);
    else combined.set(key, { ingredient, quantityBase: toBaseQuantity(ingredient.quantity, ingredient.unit) });
  }

  return Array.from(combined.values()).map(({ ingredient, quantityBase }) => {
    const requiredBase = quantityBase * scale;
    const matches = pantryItems.filter((item) => ingredientIdentityKey(item) === ingredientIdentityKey(ingredient)
      && compatibleUnitKey(item.unit) === compatibleUnitKey(ingredient.unit));
    const availableBase = matches.reduce((sum, item) => sum + toBaseQuantity(item.quantity, item.unit), 0);
    const deductedBase = Math.min(requiredBase, availableBase);
    let stillNeededBase = deductedBase;
    const deductions = matches.map((pantryItem) => {
      const beforeBase = toBaseQuantity(pantryItem.quantity, pantryItem.unit);
      const usedBase = Math.min(beforeBase, stillNeededBase);
      stillNeededBase -= usedBase;
      return {
        pantryItem,
        before: Number(pantryItem.quantity || 0),
        after: fromBaseQuantity(Math.max(0, beforeBase - usedBase), pantryItem.unit),
        deducted: fromBaseQuantity(usedBase, pantryItem.unit),
      };
    }).filter((item) => item.deducted > 0.000001);
    return {
      ingredient,
      pantryItem: matches[0] || null,
      pantryItems: matches,
      deductions,
      required_quantity: fromBaseQuantity(requiredBase, ingredient.unit),
      available_quantity: fromBaseQuantity(availableBase, ingredient.unit),
      deducted_quantity: fromBaseQuantity(deductedBase, ingredient.unit),
      remaining_quantity: matches[0] ? deductions.find((item) => item.pantryItem.id === matches[0].id)?.after ?? Number(matches[0].quantity || 0) : 0,
      unit: ingredient.unit || '',
      status: !matches.length ? 'not-tracked' : availableBase + 0.000001 < requiredBase ? 'short' : 'ready',
    };
  });
}
