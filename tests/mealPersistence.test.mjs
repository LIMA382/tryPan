import test from 'node:test';
import assert from 'node:assert/strict';
import { isDatabaseMealId } from '../src/lib/mealPersistence.mjs';

test('distinguishes Supabase meal UUIDs from built-in recipe IDs', () => {
  assert.equal(isDatabaseMealId('94b9c550-1f91-4da2-8ad1-bef75c9fc19c'), true);
  assert.equal(isDatabaseMealId('public-34'), false);
  assert.equal(isDatabaseMealId('starter-public-fluffy-pancakes'), false);
  assert.equal(isDatabaseMealId('meal-12-12345'), false);
});
