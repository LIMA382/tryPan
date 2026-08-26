import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPantryConsumptionPreview } from '../src/lib/pantryConsumption.mjs';

const meal = { servings: 2, ingredients: [{ name: 'Eggs', quantity: 2, unit: 'units' }, { name: 'Flour', quantity: 200, unit: 'g' }] };

test('scales pantry deductions to servings cooked', () => {
  const result = buildPantryConsumptionPreview(meal, [{ name: 'Egg', quantity: 6, unit: 'unit' }, { name: 'Flour', quantity: 1, unit: 'kg' }], 1);
  assert.equal(result[0].required_quantity, 1);
  assert.equal(result[0].remaining_quantity, 5);
  assert.equal(result[1].required_quantity, 100);
  assert.equal(result[1].status, 'ready');
});

test('marks shortages without creating negative quantities', () => {
  const [line] = buildPantryConsumptionPreview(meal, [{ name: 'Eggs', quantity: 1, unit: 'unit' }], 2);
  assert.equal(line.status, 'short');
  assert.equal(line.deducted_quantity, 1);
  assert.equal(line.remaining_quantity, 0);
});

test('shows recipe ingredients that are not tracked', () => {
  const result = buildPantryConsumptionPreview(meal, [], 2);
  assert.ok(result.every((line) => line.status === 'not-tracked'));
});

test('combines duplicate recipe ingredient lines before deducting', () => {
  const duplicateMeal = { servings: 1, ingredients: [{ name: 'Flour', quantity: 100, unit: 'g' }, { name: 'Flour', quantity: 0.2, unit: 'kg' }] };
  const [line] = buildPantryConsumptionPreview(duplicateMeal, [{ name: 'Flour', quantity: 1, unit: 'kg' }], 1);
  assert.equal(line.required_quantity, 300);
  assert.equal(line.remaining_quantity, 0.7);
});
