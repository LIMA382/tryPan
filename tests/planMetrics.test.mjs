import test from 'node:test';
import assert from 'node:assert/strict';
import { plannedMealCost } from '../src/lib/planMetrics.mjs';

test('calculates planned value from the requested servings', () => {
  const meals = [{ id: 'pasta', price: 8, servings: 4 }];
  const plan = { slots: { 'Monday-Dinner': 'pasta', 'Tuesday-Dinner': 'pasta' }, servings: { 'Monday-Dinner': 1, 'Tuesday-Dinner': 3 } };
  assert.equal(plannedMealCost(meals, plan), 8);
});
