import test from 'node:test';
import assert from 'node:assert/strict';
import { recipeSlug } from '../src/lib/recipeUtils.js';
import { mergeActivityRows } from '../src/lib/libraryActivityMerge.mjs';

test('library identity remains stable across built-in and database copies', () => {
  const builtIn = { id: 'public-34', title: 'Fluffy everyday pancakes' };
  const copied = { id: '94b9c550-1f91-4da2-8ad1-bef75c9fc19c', title: 'Fluffy everyday pancakes' };
  assert.equal(recipeSlug(builtIn.title), recipeSlug(copied.title));
});

test('keeps the newest activity when local and server histories overlap', () => {
  const base = { user_id: 'user', recipe_key: 'pancakes', activity_type: 'recent', title: 'Pancakes' };
  const server = { ...base, occurred_at: '2026-08-26T12:00:00.000Z' };
  const olderLocal = { ...base, occurred_at: '2026-08-25T12:00:00.000Z' };
  const newerLocal = { ...base, occurred_at: '2026-08-27T12:00:00.000Z' };
  assert.deepEqual(mergeActivityRows([server], [olderLocal]).rows, [server]);
  assert.deepEqual(mergeActivityRows([server], [newerLocal]).updates, [newerLocal]);
});
