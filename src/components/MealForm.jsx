'use client';

import { useState } from 'react';
import { saveMealForUser } from '@/lib/dataStore';

const emptyIngredient = { name: '', quantity: 1, unit: '', category: 'Produce' };

export default function MealForm({ user, initial, onSaved, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [meal, setMeal] = useState(
    initial || {
      title: '',
      description: '',
      meal_type: 'both',
      prep_time: 20,
      servings: 2,
      tags: ['Healthy'],
      is_public: false,
      ingredients: [{ ...emptyIngredient }],
    }
  );

  function setField(key, value) {
    setMeal((m) => ({ ...m, [key]: value }));
  }

  function setIngredient(index, key, value) {
    setMeal((m) => ({
      ...m,
      ingredients: m.ingredients.map((ing, i) => (i === index ? { ...ing, [key]: value } : ing)),
    }));
  }

  function addIngredient() {
    setMeal((m) => ({ ...m, ingredients: [...m.ingredients, { ...emptyIngredient }] }));
  }

  function removeIngredient(index) {
    setMeal((m) => ({ ...m, ingredients: m.ingredients.filter((_, i) => i !== index) }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const normalized = {
        ...meal,
        tags: Array.isArray(meal.tags)
          ? meal.tags
          : String(meal.tags || '')
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
        ingredients: (meal.ingredients || []).filter((i) => String(i.name || '').trim()),
      };

      const saved = await saveMealForUser(user, normalized);
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || 'Could not save meal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="preview-card" onSubmit={submit}>
      {error && <div className="notice error-notice">{error}</div>}

      <div className="form-grid">
        <div className="field">
          <label>Meal name</label>
          <input required value={meal.title} onChange={(e) => setField('title', e.target.value)} placeholder="Chicken rice bowl" />
        </div>

        <div className="field">
          <label>Meal type</label>
          <select value={meal.meal_type} onChange={(e) => setField('meal_type', e.target.value)}>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div className="field">
          <label>Prep time</label>
          <input type="number" value={meal.prep_time} onChange={(e) => setField('prep_time', Number(e.target.value))} />
        </div>

        <div className="field">
          <label>Servings</label>
          <input type="number" value={meal.servings} onChange={(e) => setField('servings', Number(e.target.value))} />
        </div>

        <div className="field full">
          <label>Description</label>
          <textarea value={meal.description || ''} onChange={(e) => setField('description', e.target.value)} />
        </div>

        <div className="field">
          <label>Tags, comma separated</label>
          <input value={(Array.isArray(meal.tags) ? meal.tags : []).join(', ')} onChange={(e) => setField('tags', e.target.value)} />
        </div>

        <div className="field">
          <label>Visibility</label>
          <select value={meal.is_public ? 'public' : 'private'} onChange={(e) => setField('is_public', e.target.value === 'public')}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Ingredients</h3>

      <div className="grid" style={{ marginTop: 10 }}>
        {(meal.ingredients || []).map((ing, index) => (
          <div className="ingredient-row" key={ing.id || index}>
            <div className="field">
              <label>Name</label>
              <input value={ing.name} onChange={(e) => setIngredient(index, 'name', e.target.value)} placeholder="Rice" />
            </div>

            <div className="field">
              <label>Qty</label>
              <input type="number" value={ing.quantity} onChange={(e) => setIngredient(index, 'quantity', Number(e.target.value))} />
            </div>

            <div className="field">
              <label>Unit</label>
              <input value={ing.unit} onChange={(e) => setIngredient(index, 'unit', e.target.value)} placeholder="g" />
            </div>

            <div className="field">
              <label>Category</label>
              <select value={ing.category} onChange={(e) => setIngredient(index, 'category', e.target.value)}>
                {['Produce', 'Protein', 'Dairy', 'Pantry', 'Frozen', 'Spices', 'Bakery', 'Other'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <button type="button" className="danger-btn" onClick={() => removeIngredient(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" className="soft-btn" onClick={addIngredient}>
          Add ingredient
        </button>
        <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save meal'}</button>
        {onCancel && (
          <button type="button" className="soft-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
