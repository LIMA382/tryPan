import test from 'node:test';
import assert from 'node:assert/strict';
import { mealCompletionCost, plannedCompletionKey } from '../src/lib/mealCompletion.mjs';

test('charges only for the portions that were eaten', () => {
  assert.equal(mealCompletionCost({ price: 6, servings: 4 }, 1), 1.5);
  assert.equal(mealCompletionCost({ price: 6, servings: 4 }, 3), 4.5);
});

test('planned completion keys distinguish each calendar slot', () => {
  const base = { weekStartDate: '2026-08-31', day: 'Monday', mealId: 'soup' };
  assert.notEqual(plannedCompletionKey({ ...base, slot: 'Lunch' }), plannedCompletionKey({ ...base, slot: 'Dinner' }));
});
