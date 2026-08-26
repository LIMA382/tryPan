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
    const match = pantryItems.find((item) => ingredientIdentityKey(item) === ingredientIdentityKey(ingredient)
      && compatibleUnitKey(item.unit) === compatibleUnitKey(ingredient.unit));
    const availableBase = match ? toBaseQuantity(match.quantity, match.unit) : 0;
    const deductedBase = Math.min(requiredBase, availableBase);
    return {
      ingredient,
      pantryItem: match || null,
      required_quantity: fromBaseQuantity(requiredBase, ingredient.unit),
      available_quantity: fromBaseQuantity(availableBase, ingredient.unit),
      deducted_quantity: fromBaseQuantity(deductedBase, ingredient.unit),
      remaining_quantity: match ? fromBaseQuantity(Math.max(0, availableBase - requiredBase), match.unit) : 0,
      unit: ingredient.unit || '',
      status: !match ? 'not-tracked' : availableBase + 0.000001 < requiredBase ? 'short' : 'ready',
    };
  });
}
