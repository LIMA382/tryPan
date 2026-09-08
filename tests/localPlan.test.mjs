import test from 'node:test';
import assert from 'node:assert/strict';

const values = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};

const { emptyPlan, savePlan, setPlannedMeal } = await import('../src/lib/localStore.js');

test('removes one local meal without clearing the other meals in its slot', () => {
  values.clear();
  savePlan(emptyPlan());
  setPlannedMeal('Monday', 'Dinner', 'soup', 1, { mode: 'add' });
  setPlannedMeal('Monday', 'Dinner', 'bread', 2, { mode: 'add' });
  const result = setPlannedMeal('Monday', 'Dinner', null, 1, { mode: 'remove', removeMealId: 'soup' });

  assert.deepEqual(result.slots['Monday-Dinner'], ['bread']);
  assert.equal(result.servings['Monday-Dinner:soup'], undefined);
  assert.equal(result.servings['Monday-Dinner:bread'], 2);
});

test('clearing a local slot also clears stale serving quantities', () => {
  values.clear();
  savePlan(emptyPlan());
  setPlannedMeal('Tuesday', 'Lunch', 'pasta', 4, { mode: 'add' });
  setPlannedMeal('Tuesday', 'Lunch', null, 1, { mode: 'replace' });
  const result = setPlannedMeal('Tuesday', 'Lunch', 'pasta', 1, { mode: 'add' });

  assert.equal(result.servings['Tuesday-Lunch:pasta'], 1);
});
