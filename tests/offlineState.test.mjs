import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueMutation, pendingMutations, readSnapshot, removeMutation, writeSnapshot } from '../src/lib/offlineState.mjs';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('stores user-scoped offline snapshots', () => {
  const storage = memoryStorage();
  writeSnapshot('user-a', 'pantry', [{ name: 'Eggs' }], storage);
  assert.deepEqual(readSnapshot('user-a', 'pantry', storage).data, [{ name: 'Eggs' }]);
  assert.equal(readSnapshot('user-b', 'pantry', storage), null);
});

test('deduplicates repeated offline edits to the same record', () => {
  const storage = memoryStorage();
  enqueueMutation({ key: 'pantry:1', quantity: 2 }, storage);
  enqueueMutation({ key: 'pantry:1', quantity: 3 }, storage);
  enqueueMutation({ key: 'pantry:2', quantity: 1 }, storage);
  assert.equal(pendingMutations(storage).length, 2);
  assert.equal(pendingMutations(storage).find((item) => item.key === 'pantry:1').quantity, 3);
  removeMutation('pantry:1', storage);
  assert.deepEqual(pendingMutations(storage).map((item) => item.key), ['pantry:2']);
});

test('keeps queued changes from different users separate', () => {
  const storage = memoryStorage();
  enqueueMutation({ key: 'user-a:pantry:1', userId: 'user-a' }, storage);
  enqueueMutation({ key: 'user-b:pantry:1', userId: 'user-b' }, storage);
  assert.equal(pendingMutations(storage).length, 2);
});
