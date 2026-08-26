import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSmartWeekPlan, rankMeals } from '../src/lib/mealRecommendations.mjs';

const meals = [
  { id: 'fast-eggs', title: 'Fast eggs', meal_type: 'breakfast', prep_time: 8, price: 2, servings: 2, ingredients: [{ name: 'Eggs', quantity: 2, unit: 'unit' }] },
  { id: 'slow-toast', title: 'Slow toast', meal_type: 'breakfast', prep_time: 40, price: 1, servings: 1, ingredients: [{ name: 'Bread', quantity: 2, unit: 'slice' }] },
  { id: 'soup', title: 'Soup', meal_type: 'both', prep_time: 20, price: 4, servings: 2, ingredients: [{ name: 'Carrots', quantity: 2, unit: 'unit' }] },
];

test('ranks available and expiring ingredients above cheap but missing food', () => {
  const ranked = rankMeals(meals, [{ name: 'Egg', quantity: 6, unit: 'units', expiry_date: '2026-08-27' }], { now: new Date('2026-08-26T12:00:00'), maxPrepTime: 15 });
  assert.equal(ranked[0].id, 'fast-eggs');
  assert.equal(ranked[0].pantry_coverage, 100);
  assert.equal(ranked[0].expiring_matches, 1);
});

test('builds a Monday-to-Sunday preview without overwriting filled slots', () => {
  const plan = { slots: { 'Monday-Breakfast': 'existing' }, servings: {} };
  const result = buildSmartWeekPlan(meals, [{ name: 'Eggs', quantity: 6, unit: 'unit' }], plan, { maxPrepTime: 25, householdSize: 2, campusDays: ['Tuesday'] });
  assert.equal(result.slots['Monday-Breakfast'], 'existing');
  assert.ok(result.additions.length > 0);
  assert.ok(result.additions.every((item) => item.servings === 2));
  assert.ok(result.additions.every((item) => item.day !== 'Monday' || item.slot !== 'Breakfast'));
});
