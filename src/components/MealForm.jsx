'use client';

import { useEffect, useState } from 'react';
import IngredientPicker from './IngredientPicker';

const CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Frozen', 'Spices', 'Bakery', 'Other'];

const emptyIngredient = { name: '', ingredient_id: null, quantity: 1, unit: '', category: 'Other', estimated_price: 0, price_unit: '' };

function getInitialMeal(initialMeal) {
  return {
    title: initialMeal?.title || '',
    description: initialMeal?.description || '',
    instructions: initialMeal?.instructions || '',
    video_url: initialMeal?.video_url || '',
    meal_type: initialMeal?.meal_type || 'both',
    prep_time: initialMeal?.prep_time || 20,
    servings: initialMeal?.servings || 2,
    price: initialMeal?.price || 0,
    tags: Array.isArray(initialMeal?.tags) ? initialMeal.tags.join(', ') : '',
    is_public: Boolean(initialMeal?.is_public),
    ingredients: initialMeal?.ingredients?.length
      ? initialMeal.ingredients.map((ing) => ({
          name: ing.name || '',
          ingredient_id: ing.ingredient_id || null,
          quantity: ing.quantity || 1,
          unit: ing.unit || '',
          category: ing.category || 'Other',
          estimated_price: ing.estimated_price || 0,
          price_unit: ing.price_unit || '',
        }))
      : [{ ...emptyIngredient }],
  };
}

export default function MealForm({ initialMeal, onSave, onCancel, saving, user, region = 'pt' }) {
  const [meal, setMeal] = useState(() => getInitialMeal(initialMeal));

  useEffect(() => {
    setMeal(getInitialMeal(initialMeal));
  }, [initialMeal?.id]);

  function update(field, value) {
    setMeal((current) => ({ ...current, [field]: value }));
  }

  function updateIngredient(index, field, value) {
    setMeal((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, i) => i === index ? { ...ingredient, [field]: value } : ingredient),
    }));
  }

  function addIngredient() {
    setMeal((current) => ({ ...current, ingredients: [...current.ingredients, { ...emptyIngredient }] }));
  }

  function removeIngredient(index) {
    setMeal((current) => ({ ...current, ingredients: current.ingredients.filter((_, i) => i !== index) }));
  }

  function submit(event) {
    event.preventDefault();

    onSave({
      ...initialMeal,
      ...meal,
      prep_time: Number(meal.prep_time || 0),
      servings: Number(meal.servings || 1),
      price: Number(meal.price || 0),
      tags: String(meal.tags || '').split(',').map((x) => x.trim()).filter(Boolean),
      ingredients: meal.ingredients
        .filter((ingredient) => ingredient.name.trim())
        .map((ingredient) => ({ ...ingredient, quantity: Number(ingredient.quantity || 0) })),
    });
  }

  return (
    <form className="card meal-form" onSubmit={submit}>
      <div className="form-topline">
        <div>
          <div className="eyebrow">{initialMeal?.id ? 'Edit meal' : 'New meal'}</div>
          <h3>{initialMeal?.id ? 'Update this meal' : 'Add a meal you know'}</h3>
        </div>
        <button type="button" className="soft-btn" onClick={onCancel}>Close</button>
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Meal name</label>
          <input required value={meal.title} onChange={(event) => update('title', event.target.value)} placeholder="Chicken rice bowl" />
        </div>

        <div className="field">
          <label>Meal type</label>
          <select value={meal.meal_type} onChange={(event) => update('meal_type', event.target.value)}>
            <option value="both">Lunch + dinner</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>

        <div className="field">
          <label>Prep time</label>
          <input type="number" min="0" value={meal.prep_time} onChange={(event) => update('prep_time', event.target.value)} />
        </div>

        <div className="field">
          <label>Servings</label>
          <input type="number" min="1" value={meal.servings} onChange={(event) => update('servings', event.target.value)} />
        </div>

        <div className="field">
          <label>Estimated price (€)</label>
          <input type="number" min="0" step="0.01" value={meal.price} onChange={(event) => update('price', event.target.value)} />
        </div>

        <div className="field">
          <label>Tags</label>
          <input value={meal.tags} onChange={(event) => update('tags', event.target.value)} placeholder="Quick, Healthy, Budget" />
        </div>

        <div className="field full">
          <label>Description</label>
          <textarea value={meal.description} onChange={(event) => update('description', event.target.value)} placeholder="A short note about this meal…" />
        </div>

        <div className="field full">
          <label>Instructions optional</label>
          <textarea value={meal.instructions} onChange={(event) => update('instructions', event.target.value)} placeholder="Write the cooking steps here, or leave empty if you already know the recipe." />
        </div>

        <div className="field full">
          <label>Video link optional</label>
          <input value={meal.video_url} onChange={(event) => update('video_url', event.target.value)} placeholder="YouTube, TikTok, Instagram, blog link…" />
        </div>

        <div className="field full">
          <label>Visibility</label>
          <select value={meal.is_public ? 'public' : 'private'} onChange={(event) => update('is_public', event.target.value === 'public')}>
            <option value="private">Private — only me</option>
            <option value="public">Public — visible in Browse</option>
          </select>
        </div>
      </div>

      <div className="section-header ingredients-header">
        <h3>Ingredients</h3>
        <button type="button" className="soft-btn" onClick={addIngredient}>Add ingredient</button>
      </div>

      <div className="grid ingredients-grid">
        {meal.ingredients.map((ingredient, index) => (
          <div className="ingredient-row" key={index}>
            <div className="field ingredient-name-field">
              <label>Ingredient</label>
              <IngredientPicker
                user={user}
                region={region}
                ingredient={ingredient}
                onChange={(nextIngredient) => {
                  setMeal((current) => ({
                    ...current,
                    ingredients: current.ingredients.map((item, i) => i === index ? nextIngredient : item),
                  }));
                }}
              />
            </div>

            <div className="field">
              <label>Qty</label>
              <input type="number" min="0" step="0.01" value={ingredient.quantity} onChange={(event) => updateIngredient(index, 'quantity', event.target.value)} />
            </div>

            <div className="field">
              <label>Unit</label>
              <input value={ingredient.unit} onChange={(event) => updateIngredient(index, 'unit', event.target.value)} placeholder="g" />
            </div>

            <div className="field">
              <label>Category</label>
              <select value={ingredient.category} onChange={(event) => updateIngredient(index, 'category', event.target.value)}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>

            <button type="button" className="danger-btn" onClick={() => removeIngredient(index)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="hero-actions form-actions">
        <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : initialMeal?.id ? 'Save changes' : 'Save meal'}</button>
        <button type="button" className="soft-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
