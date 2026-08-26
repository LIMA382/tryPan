'use client';

import { useEffect, useMemo, useState } from 'react';
import { createCatalogIngredient, loadIngredientCatalog, updateCatalogIngredient } from '@/lib/dataStore';
import { ingredientNamesMatch } from '@/lib/ingredientIdentity.mjs';

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
  const [newDefaultUnit, setNewDefaultUnit] = useState(ingredient?.unit || 'g');
  const [editingItem, setEditingItem] = useState(null);
  const [newAliases, setNewAliases] = useState('');
  const [busy, setBusy] = useState(false);
  const [createNotice, setCreateNotice] = useState('');

  useEffect(() => {
    setQuery(ingredient?.name || '');
    setNewPrice(ingredient?.estimated_price || '');
    setNewPriceUnit(ingredient?.price_unit || ingredient?.unit || 'kg');
    setNewCategory(ingredient?.category || 'Other');
    if (!editingItem) setNewDefaultUnit(ingredient?.unit || 'g');
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

  const matchingItem = useMemo(() => (
    catalog.find((item) => ingredientNamesMatch(item.name, query, item.aliases)) || null
  ), [catalog, query]);
  const exactMatch = Boolean(matchingItem);

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
    setNewAliases((item.aliases || []).join(', '));
    setOpen(false);
    setCreating(false);
    setEditingItem(null);
  }

  function startEditing(item) {
    setEditingItem(item);
    setCreating(true);
    setQuery(item.name);
    setNewCategory(item.category || 'Other');
    setNewDefaultUnit(item.default_unit || 'g');
    setNewPrice(item.estimated_price || '');
    setNewPriceUnit(item.price_unit || item.default_unit || 'kg');
    setNewAliases((item.aliases || []).join(', '));
  }

  async function createIngredient() {
    const name = query.trim();
    if (!name) return;

    setBusy(true);
    setCreateNotice('');
    try {
      const draft = {
        name,
        region,
        category: newCategory,
        default_unit: newDefaultUnit || ingredient.unit || 'g',
        estimated_price: Number(newPrice || 0),
        price_unit: newPriceUnit || ingredient.unit || 'kg',
        aliases: newAliases,
      };
      const item = editingItem
        ? await updateCatalogIngredient(user, { ...editingItem, ...draft })
        : await createCatalogIngredient(user, draft);
      setCatalog((current) => [item, ...current.filter((entry) => entry.id !== item.id && entry.name.toLowerCase() !== item.name.toLowerCase())]);
      selectIngredient(item);
      setCreateNotice(`“${item.name}” was ${editingItem ? 'updated' : 'created'} and selected.`);
    } catch (error) {
      const localItem = {
        id: `custom-${Date.now()}`,
        name,
        region,
        category: newCategory,
        default_unit: ingredient.unit || 'g',
        estimated_price: Number(newPrice || 0),
        price_unit: newPriceUnit || ingredient.unit || 'kg',
        is_user_created: true,
        aliases: newAliases.split(',').map((value) => value.trim()).filter(Boolean),
      };

      selectIngredient(localItem);
      setCreateNotice(`“${name}” is ready for this trip. The shared catalogue could not be updated.`);
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
        role="combobox"
        aria-label="Search ingredient"
        aria-expanded={open}
        aria-controls="ingredient-suggestions"
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(event) => manualNameChange(event.target.value)}
        placeholder="Search ingredient, e.g. rice"
      />

      {ingredient?.estimated_price ? (
        <span className="ingredient-price-hint">
          €{Number(ingredient.estimated_price).toFixed(2)} / {ingredient.price_unit || 'unit'}
        </span>
      ) : null}

      {createNotice ? <span className="ingredient-create-notice" role="status">{createNotice}</span> : null}

      {open && (
        <div id="ingredient-suggestions" className="ingredient-suggestions">
          {catalog.slice(0, 7).map((item) => {
            const canEdit = item.is_user_created && (String(item.id || '').startsWith('local-') || item.created_by === user?.id);
            return (
            <div className="ingredient-suggestion-row" key={item.id}>
              <button type="button" className="ingredient-select-button" onClick={() => selectIngredient(item)}>
                <span>
                <strong>{item.name}</strong>
                <small>{item.category} · {item.default_unit}{item.aliases?.length ? ` · also ${item.aliases.slice(0, 2).join(', ')}` : ''}</small>
                </span>
                <em>{formatPrice(item)}</em>
              </button>
              {canEdit ? <button type="button" className="ingredient-edit-button" aria-label={`Edit ${item.name}`} onClick={() => startEditing(item)}>Edit</button> : null}
            </div>
          );})}

          {query.trim() && !exactMatch && !creating && (
            <button type="button" className="create-ingredient-row" onClick={() => setCreating(true)}>
              + Create “{query.trim()}” for this region
            </button>
          )}

          {query.trim() && matchingItem && query.trim().toLowerCase() !== matchingItem.name.toLowerCase() && !creating ? (
            <div className="ingredient-match-notice">Already available as <strong>{matchingItem.name}</strong>. Select it above to avoid a duplicate.</div>
          ) : null}

          {creating && (
            <div className="create-ingredient-box">
              <strong>{editingItem ? `Edit “${editingItem.name}”` : `Create “${query.trim()}”`}</strong>
              <div className="create-ingredient-grid">
                <select aria-label="Ingredient category" value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <input aria-label="Ingredient default unit" value={newDefaultUnit} onChange={(event) => setNewDefaultUnit(event.target.value)} placeholder="Default unit" />
                <input aria-label="Ingredient price" type="number" min="0" step="0.01" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} placeholder="Price" />
                <input aria-label="Ingredient price unit" value={newPriceUnit} onChange={(event) => setNewPriceUnit(event.target.value)} placeholder="per kg" />
                <input aria-label="Ingredient aliases" value={newAliases} onChange={(event) => setNewAliases(event.target.value)} placeholder="Aliases, separated by commas" />
              </div>
              <div className="create-ingredient-actions">
                <button type="button" className="soft-btn" onClick={() => { setCreating(false); setEditingItem(null); }}>Cancel</button>
                <button type="button" className="primary-btn" disabled={busy} onClick={createIngredient}>{busy ? 'Saving…' : editingItem ? 'Save changes' : 'Create'}</button>
              </div>
            </div>
          )}

          <button type="button" className="close-suggestions" onClick={() => setOpen(false)}>Close suggestions</button>
        </div>
      )}
    </div>
  );
}
