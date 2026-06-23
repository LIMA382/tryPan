'use client';

import { useEffect, useMemo, useState } from 'react';
import { createCatalogIngredient, loadIngredientCatalog } from '@/lib/dataStore';

const CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Pantry', 'Frozen', 'Spices', 'Bakery', 'Other'];

function formatPrice(item) {
  const value = Number(item?.estimated_price || 0);
  if (!value) return 'No price yet';
  return `€${value.toFixed(2)} / ${item.price_unit || item.default_unit || 'unit'}`;
}

export default function IngredientPicker({ user, region = 'pt', ingredient, onChange }) {
  const [query, setQuery] = useState(ingredient?.name || '');
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPrice, setNewPrice] = useState(ingredient?.estimated_price || '');
  const [newPriceUnit, setNewPriceUnit] = useState(ingredient?.price_unit || ingredient?.unit || 'kg');
  const [newCategory, setNewCategory] = useState(ingredient?.category || 'Other');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuery(ingredient?.name || '');
    setNewPrice(ingredient?.estimated_price || '');
    setNewPriceUnit(ingredient?.price_unit || ingredient?.unit || 'kg');
    setNewCategory(ingredient?.category || 'Other');
  }, [ingredient?.name, ingredient?.estimated_price, ingredient?.price_unit, ingredient?.unit, ingredient?.category]);

  useEffect(() => {
    let active = true;

    async function load() {
      const items = await loadIngredientCatalog(region, query);
      if (active) setCatalog(items);
    }

    load();
    return () => { active = false; };
  }, [region, query]);

  const exactMatch = useMemo(() => (
    catalog.some((item) => item.name.toLowerCase() === query.trim().toLowerCase())
  ), [catalog, query]);

  function selectIngredient(item) {
    onChange({
      ...ingredient,
      ingredient_id: item.id,
      name: item.name,
      category: item.category || 'Other',
      unit: ingredient.unit || item.default_unit || '',
      estimated_price: Number(item.estimated_price || 0),
      price_unit: item.price_unit || item.default_unit || '',
    });
    setQuery(item.name);
    setNewPrice(item.estimated_price || '');
    setNewPriceUnit(item.price_unit || item.default_unit || 'kg');
    setNewCategory(item.category || 'Other');
    setOpen(false);
    setCreating(false);
  }

  async function createIngredient() {
    const name = query.trim();
    if (!name) return;

    setBusy(true);
    try {
      const item = await createCatalogIngredient(user, {
        name,
        region,
        category: newCategory,
        default_unit: ingredient.unit || 'g',
        estimated_price: Number(newPrice || 0),
        price_unit: newPriceUnit || ingredient.unit || 'kg',
      });
      selectIngredient(item);
    } finally {
      setBusy(false);
    }
  }

  function manualNameChange(value) {
    setQuery(value);
    setOpen(true);
    onChange({ ...ingredient, name: value, ingredient_id: null });
  }

  return (
    <div className="ingredient-picker">
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => manualNameChange(event.target.value)}
        placeholder="Search ingredient, e.g. rice"
      />

      {ingredient?.estimated_price ? (
        <span className="ingredient-price-hint">
          €{Number(ingredient.estimated_price).toFixed(2)} / {ingredient.price_unit || 'unit'}
        </span>
      ) : null}

      {open && (
        <div className="ingredient-suggestions">
          {catalog.slice(0, 7).map((item) => (
            <button type="button" key={item.id} onClick={() => selectIngredient(item)}>
              <span>
                <strong>{item.name}</strong>
                <small>{item.category} · {item.default_unit}</small>
              </span>
              <em>{formatPrice(item)}</em>
            </button>
          ))}

          {query.trim() && !exactMatch && !creating && (
            <button type="button" className="create-ingredient-row" onClick={() => setCreating(true)}>
              + Create “{query.trim()}” for this region
            </button>
          )}

          {creating && (
            <div className="create-ingredient-box">
              <strong>Create “{query.trim()}”</strong>
              <div className="create-ingredient-grid">
                <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input type="number" min="0" step="0.01" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} placeholder="Price" />
                <input value={newPriceUnit} onChange={(event) => setNewPriceUnit(event.target.value)} placeholder="per kg" />
              </div>
              <div className="create-ingredient-actions">
                <button type="button" className="soft-btn" onClick={() => setCreating(false)}>Cancel</button>
                <button type="button" className="primary-btn" disabled={busy} onClick={createIngredient}>{busy ? 'Creating…' : 'Create'}</button>
              </div>
            </div>
          )}

          <button type="button" className="close-suggestions" onClick={() => setOpen(false)}>Close suggestions</button>
        </div>
      )}
    </div>
  );
}
