import test from 'node:test';
import assert from 'node:assert/strict';
import { compatibleUnitKey, convertQuantity, normalizeUnit, toBaseQuantity } from '../src/lib/unitConversion.mjs';

test('normalizes common cooking unit names', () => {
  assert.equal(normalizeUnit('grams'), 'g');
  assert.equal(normalizeUnit('eggs'), 'unit');
  assert.equal(normalizeUnit('tablespoons'), 'tbsp');
});

test('converts compatible mass and volume units', () => {
  assert.deepEqual(convertQuantity(1, 'kg', 'g'), { value: 1000, approximate: false });
  assert.deepEqual(convertQuantity(2, 'tbsp', 'ml'), { value: 30, approximate: false });
  assert.equal(toBaseQuantity(1.5, 'l'), 1500);
  assert.equal(compatibleUnitKey('tsp'), compatibleUnitKey('ml'));
});

test('does not guess incompatible conversions', () => {
  assert.equal(convertQuantity(1, 'can', 'g'), null);
  assert.deepEqual(convertQuantity(1, 'cup', 'ml'), { value: 240, approximate: true });
});
