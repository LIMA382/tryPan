import test from 'node:test';
import assert from 'node:assert/strict';
import { MEAL_COMPLETIONS_STORAGE_KEY, mealCompletionCost, plannedCompletionKey, readMealCompletions } from '../src/lib/mealCompletion.mjs';

test('charges only for the portions that were eaten', () => {
  assert.equal(mealCompletionCost({ price: 6, servings: 4 }, 1), 1.5);
  assert.equal(mealCompletionCost({ price: 6, servings: 4 }, 3), 4.5);
});

test('planned completion keys distinguish each calendar slot', () => {
  const base = { weekStartDate: '2026-08-31', day: 'Monday', mealId: 'soup' };
  assert.notEqual(plannedCompletionKey({ ...base, slot: 'Lunch' }), plannedCompletionKey({ ...base, slot: 'Dinner' }));
});

test('migrates legacy completions once and keeps them scoped to that user', () => {
  const values = new Map([[MEAL_COMPLETIONS_STORAGE_KEY, JSON.stringify([{ id: 'legacy', cost: 2 }])]]);
  global.window = {};
  global.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(readMealCompletions('user-a').length, 1);
  assert.equal(readMealCompletions('user-b').length, 0);
  delete global.window;
  delete global.localStorage;
});
