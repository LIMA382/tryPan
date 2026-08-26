import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalIngredientName,
  ingredientIdentityKey,
  ingredientAliasesForName,
  ingredientMatchesQuery,
  ingredientMatchRank,
  ingredientNamesMatch,
  normalizedAliases,
} from '../src/lib/ingredientIdentity.mjs';

const equivalentNames = [
  ['Tomato', 'Tomatoes'], ['Egg', 'Eggs'], ['Shrimp', 'Prawns'], ['Chickpeas', 'Garbanzo beans'],
  ['Courgette', 'Zucchini'], ['Coriander', 'Cilantro'], ['Ground beef', 'Beef mince'],
  ['Green onion', 'Scallions'], ['Green onion', 'Spring onions'], ['Bell pepper', 'Capsicum'],
  ['Wrap', 'Tortillas'], ['Yoghurt', 'Yogurt'], ['Aubergine', 'Eggplant'], ['Rocket', 'Arugula'],
  ['All purpose flour', 'Plain flour'], ['Icing sugar', 'Powdered sugar'], ['Baking soda', 'Bicarbonate of soda'],
  ['Double cream', 'Heavy cream'], ['Ground pork', 'Pork mince'], ['Soy sauce', 'Soya sauce'],
  ['Maize', 'Sweetcorn'], ['Potato', 'Potatoes'], ['Carrot', 'Carrots'], ['Mushroom', 'Mushrooms'],
  ['Onion', 'Onions'], ['Banana', 'Bananas'], ['Kidney bean', 'Kidney beans'], ['Black bean', 'Black beans'],
  ['Lentil', 'Lentils'], ['Chilli pepper', 'Chili peppers'],
];

test('recognizes common English ingredient aliases', () => {
  for (const [left, right] of equivalentNames) {
    assert.equal(ingredientNamesMatch(left, right), true, `${left} should match ${right}`);
    assert.equal(canonicalIngredientName(left), canonicalIngredientName(right));
  }
});

test('supports aliases added by a user', () => {
  assert.equal(ingredientNamesMatch('Cannellini beans', 'White beans', ['white beans']), true);
  assert.deepEqual(normalizedAliases(' White beans, white beans,  Cannellini  '), ['white beans', 'cannellini']);
});

test('exposes built-in aliases for catalogue suggestions', () => {
  assert.ok(ingredientAliasesForName('Tomatoes').includes('fresh tomato'));
  assert.ok(ingredientAliasesForName('Shrimp').includes('prawns'));
});

test('does not merge distinct ingredients', () => {
  assert.equal(ingredientNamesMatch('Tomato', 'Tomato paste'), false);
  assert.equal(ingredientNamesMatch('Milk', 'Coconut milk'), false);
  assert.equal(ingredientNamesMatch('Pasta', 'Spaghetti'), false);
});

test('searches names, aliases and categories with useful ranking', () => {
  const tomato = { name: 'Tomatoes', aliases: ['fresh tomato'], category: 'Produce' };
  assert.equal(ingredientMatchesQuery(tomato, 'tomato'), true);
  assert.equal(ingredientMatchesQuery(tomato, 'fresh'), true);
  assert.equal(ingredientMatchesQuery(tomato, 'produce'), true);
  assert.ok(ingredientMatchRank({ name: 'Eggs', aliases: ['egg'] }, 'egg') < ingredientMatchRank({ name: 'Egg noodles' }, 'egg'));
});

test('uses canonical catalogue names for grocery identity', () => {
  assert.equal(ingredientIdentityKey({ name: 'Tomato' }), 'name:tomato');
  assert.equal(ingredientIdentityKey({ name: 'Fresh tomatoes' }), 'name:tomato');
  assert.equal(ingredientIdentityKey({ name: 'White beans', canonical_name: 'Cannellini beans' }), 'name:cannellini beans');
});
