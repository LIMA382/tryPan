'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import IngredientPicker from '@/components/IngredientPicker';
import {
  addPantryTripForUser,
  deletePantryItemForUser,
  estimatePantryItemValue,
  loadAllVisibleMeals,
  loadPantryItemsForUser,
  loadPantryTripsForUser,
  loadProfileForUser,
  savePantryItemForUser,
  suggestMealsFromPantry,
} from '@/lib/dataStore';

const emptyItem = {
  ingredient_id: null,
  name: '',
  quantity: 1,
  unit: '',
  category: 'Other',
  estimated_price: 0,
  price_unit: '',
  is_free: false,
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function PantryContent({ user }) {
  const [region, setRegion] = useState(user?.user_metadata?.region === 'nl' ? 'nl' : 'pt');
  const [items, setItems] = useState([]);
  const [trips, setTrips] = useState([]);
  const [meals, setMeals] = useState([]);
  const [editing, setEditing] = useState({});
  const [tripStore, setTripStore] = useState('');
  const [tripDate, setTripDate] = useState(today());
  const [tripNotes, setTripNotes] = useState('');
  const [draftItem, setDraftItem] = useState({ ...emptyItem });
  const [tripItems, setTripItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async function load() {
    setLoading(true);
    setError('');

    try {
      const profile = await loadProfileForUser(user);
      const cleanRegion = profile.region || 'pt';
      setRegion(cleanRegion);

      const [loadedItems, loadedTrips, loadedMeals] = await Promise.all([
        loadPantryItemsForUser(user),
        loadPantryTripsForUser(user),
        loadAllVisibleMeals(user),
      ]);

      setItems(loadedItems);
      setTrips(loadedTrips);
      setMeals(loadedMeals);
      setEditing(Object.fromEntries(loadedItems.map((item) => [item.id, { ...item }])));
    } catch (err) {
      setError(err.message || 'Could not load pantry.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const pantryValue = useMemo(() => items.reduce((sum, item) => sum + estimatePantryItemValue(item), 0), [items]);
  const suggestedMeals = useMemo(() => suggestMealsFromPantry(meals, items), [meals, items]);

  const groupedItems = useMemo(() => items.reduce((acc, item) => {
    const category = item.category || 'Other';
    (acc[category] ||= []).push(item);
    return acc;
  }, {}), [items]);

  function updateDraftIngredient(nextIngredient) {
    setDraftItem((current) => ({
      ...nextIngredient,
      is_free: current.is_free || false,
      estimated_price: current.is_free ? 0 : nextIngredient.estimated_price,
    }));
  }

  function updateDraft(field, value) {
    setDraftItem((current) => {
      if (field === 'is_free') {
        return { ...current, is_free: value, estimated_price: value ? 0 : current.estimated_price };
      }
      return { ...current, [field]: value };
    });
  }

  function addDraftToTrip() {
    const cleanName = draftItem.name?.trim();
    if (!cleanName || Number(draftItem.quantity || 0) <= 0) {
      setError('Pick an ingredient and quantity first.');
      return;
    }

    setError('');
    setTripItems((current) => [...current, { ...draftItem, estimated_price: draftItem.is_free ? 0 : Number(draftItem.estimated_price || 0) }]);
    setDraftItem({ ...emptyItem });
  }

  function removeTripItem(index) {
    setTripItems((current) => current.filter((_, i) => i !== index));
  }

  function clearTripBasket() {
    setTripItems([]);
    setDraftItem({ ...emptyItem });
  }

  async function submitTrip(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    let cleanItems = [...tripItems];
    if (draftItem.name?.trim() && Number(draftItem.quantity || 0) > 0) {
      cleanItems.push({ ...draftItem, estimated_price: draftItem.is_free ? 0 : Number(draftItem.estimated_price || 0) });
    }

    if (!cleanItems.length) {
      setError('Add at least one item to this trip.');
      setSaving(false);
      return;
    }

    try {
      await addPantryTripForUser(user, {
        store: tripStore,
        bought_at: tripDate || today(),
        notes: tripNotes,
        items: cleanItems,
      });

      setTripStore('');
      setTripDate(today());
      setTripNotes('');
      setDraftItem({ ...emptyItem });
      setTripItems([]);
      setMessage('Trip saved. Pantry updated.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not save supermarket trip.');
    } finally {
      setSaving(false);
    }
  }

  function editItemField(itemId, field, value) {
    setEditing((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        [field]: field === 'is_free' ? Boolean(value) : value,
        ...(field === 'is_free' && value ? { estimated_price: 0 } : {}),
      },
    }));
  }

  async function saveItem(itemId) {
    const item = editing[itemId];
    if (!item) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await savePantryItemForUser(user, item);
      setMessage('Pantry item updated.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not update pantry item.');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(itemId) {
    const ok = window.confirm('Remove this item from your pantry?');
    if (!ok) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await deletePantryItemForUser(user, itemId);
      setMessage('Pantry item removed.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not remove pantry item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppFrame
      user={user}
      title="Pantry"
      subtitle="Add what you have at home. Mark free items when they should not count toward spending."
      action={<div className="week-total"><span>Pantry value</span><strong>{money(pantryValue)}</strong></div>}
    >
      {error && <div className="notice error-notice">{error}</div>}
      {message && <div className="notice">{message}</div>}
      {loading && <div className="card">Loading pantry…</div>}

      <section className="panel-soft pantry-suggestions">
        <div className="card-header">
          <div>
            <h3>Meals you can make soon</h3>
            <p>Based on the ingredients currently in your pantry.</p>
          </div>
          <span className="badge">{suggestedMeals.length} suggestions</span>
        </div>
        <div className="suggested-meals-row">
          {suggestedMeals.map((meal) => (
            <div className="suggested-meal-card" key={meal.id}>
              <strong>{meal.title}</strong>
              <span>{meal.pantry_coverage}% covered</span>
              <small>{meal.pantry_matched} of {meal.pantry_total} ingredients matched · {money(meal.price)}</small>
            </div>
          ))}
          {!suggestedMeals.length && <p>Add pantry items and matching meals to get suggestions.</p>}
        </div>
      </section>

      <div className="pantry-layout cleaner-pantry-layout">
        <section className="panel-soft pantry-trip-panel">
          <div className="card-header">
            <div>
              <h3>Add supermarket trip</h3>
              <p>Build a small basket, then save it once.</p>
            </div>
            <span className="badge">{region === 'nl' ? 'Netherlands' : 'Portugal'}</span>
          </div>

          <form onSubmit={submitTrip} className="pantry-trip-form simple-trip-form">
            <div className="form-grid compact-form-grid">
              <div className="field">
                <label>Store optional</label>
                <input value={tripStore} onChange={(event) => setTripStore(event.target.value)} placeholder="Pingo Doce, Albert Heijn…" />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
              </div>
              <div className="field full">
                <label>Notes optional</label>
                <input value={tripNotes} onChange={(event) => setTripNotes(event.target.value)} placeholder="Weekly shop, market run, already had food…" />
              </div>
            </div>

            <div className="simple-item-adder">
              <div className="field ingredient-name-field">
                <label>Ingredient</label>
                <IngredientPicker user={user} region={region} ingredient={draftItem} onChange={updateDraftIngredient} />
              </div>
              <div className="field">
                <label>Qty</label>
                <input type="number" min="0" step="0.01" value={draftItem.quantity} onChange={(event) => updateDraft('quantity', event.target.value)} />
              </div>
              <div className="field">
                <label>Unit</label>
                <input value={draftItem.unit} onChange={(event) => updateDraft('unit', event.target.value)} placeholder="g" />
              </div>
              <div className="field">
                <label>Price optional</label>
                <input type="number" min="0" step="0.01" value={draftItem.estimated_price} onChange={(event) => updateDraft('estimated_price', event.target.value)} placeholder="0.00" disabled={Boolean(draftItem.is_free)} />
              </div>
              <div className="field">
                <label>Price unit</label>
                <input value={draftItem.price_unit} onChange={(event) => updateDraft('price_unit', event.target.value)} placeholder={draftItem.unit || 'unit'} disabled={Boolean(draftItem.is_free)} />
              </div>
              <label className="free-toggle">
                <input type="checkbox" checked={Boolean(draftItem.is_free)} onChange={(event) => updateDraft('is_free', event.target.checked)} />
                Free / already had it
              </label>
              <button type="button" className="soft-btn" onClick={addDraftToTrip}>Add to trip</button>
            </div>

            <div className="trip-basket">
              <div className="trip-basket-header">
                <h3>Trip basket</h3>
                {tripItems.length ? <button type="button" className="mini-btn" onClick={clearTripBasket}>Clear</button> : null}
              </div>
              {tripItems.map((item, index) => (
                <div className="trip-basket-row" key={`${item.name}-${index}`}>
                  <span>{item.name}</span>
                  <strong>{item.quantity} {item.unit}</strong>
                  <em>{item.is_free ? 'Free' : money(estimatePantryItemValue(item))}</em>
                  <button type="button" className="mini-btn" onClick={() => removeTripItem(index)}>Remove</button>
                </div>
              ))}
              {!tripItems.length && <p>No items added yet. You can also save the current ingredient row directly.</p>}
            </div>

            <div className="trip-save-row">
              <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save trip and update pantry'}</button>
              <button type="button" className="soft-btn" onClick={clearTripBasket} disabled={saving || (!tripItems.length && !draftItem.name)}>Clear basket</button>
            </div>
          </form>
        </section>

        <section className="panel-soft pantry-current-panel">
          <div className="card-header">
            <div>
              <h3>Current pantry</h3>
              <p>Edit quantities when reality changes.</p>
            </div>
            <span className="badge">{items.length} items</span>
          </div>

          {!items.length && !loading && (
            <div className="empty-state-card card">
              <h3>No pantry items yet</h3>
              <p>Add a supermarket trip or what you already have to start tracking.</p>
            </div>
          )}

          <div className="pantry-groups">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div className="pantry-category" key={category}>
                <h4>{category}</h4>
                {categoryItems.map((item) => {
                  const draft = editing[item.id] || item;
                  return (
                    <div className="pantry-item-row" key={item.id}>
                      <div className="pantry-item-main">
                        <strong>{item.name}</strong>
                        <small>{draft.is_free ? 'Free / no-cost' : draft.estimated_price ? `${money(draft.estimated_price)} / ${draft.price_unit || draft.unit || 'unit'}` : 'No price set'}</small>
                      </div>
                      <input type="number" min="0" step="0.01" value={draft.quantity} onChange={(event) => editItemField(item.id, 'quantity', event.target.value)} />
                      <input value={draft.unit || ''} onChange={(event) => editItemField(item.id, 'unit', event.target.value)} />
                      <label className="free-toggle compact"><input type="checkbox" checked={Boolean(draft.is_free)} onChange={(event) => editItemField(item.id, 'is_free', event.target.checked)} />Free</label>
                      <div className="pantry-row-actions">
                        <button type="button" className="soft-btn" disabled={saving} onClick={() => saveItem(item.id)}>Save</button>
                        <button type="button" className="danger-btn" disabled={saving} onClick={() => removeItem(item.id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppFrame>
  );
}

export default function PantryPage() {
  return <AuthGate>{(user) => <PantryContent user={user} />}</AuthGate>;
}
