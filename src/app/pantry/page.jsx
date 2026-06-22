'use client';

import { useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import IngredientPicker from '@/components/IngredientPicker';
import {
  addPantryTripForUser,
  deletePantryItemForUser,
  loadPantryItemsForUser,
  loadPantryTripsForUser,
  loadProfileForUser,
  savePantryItemForUser,
} from '@/lib/dataStore';

const emptyTripItem = {
  ingredient_id: null,
  name: '',
  quantity: 1,
  unit: '',
  category: 'Other',
  estimated_price: 0,
  price_unit: '',
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function toPriceQuantity(quantity, unit, priceUnit) {
  const amount = Number(quantity || 0);
  const cleanUnit = String(unit || '').toLowerCase();
  const cleanPriceUnit = String(priceUnit || '').toLowerCase();

  if (!amount) return 0;
  if (cleanUnit === cleanPriceUnit) return amount;
  if (cleanUnit === 'g' && cleanPriceUnit === 'kg') return amount / 1000;
  if (cleanUnit === 'kg' && cleanPriceUnit === 'g') return amount * 1000;
  if (cleanUnit === 'ml' && cleanPriceUnit === 'l') return amount / 1000;
  if (cleanUnit === 'l' && cleanPriceUnit === 'ml') return amount * 1000;
  return amount;
}

function estimateItemValue(item) {
  return toPriceQuantity(item.quantity, item.unit, item.price_unit) * Number(item.estimated_price || 0);
}

function PantryContent({ user }) {
  const [region, setRegion] = useState(user?.user_metadata?.region === 'nl' ? 'nl' : 'pt');
  const [items, setItems] = useState([]);
  const [trips, setTrips] = useState([]);
  const [editing, setEditing] = useState({});
  const [tripStore, setTripStore] = useState('');
  const [tripDate, setTripDate] = useState(today());
  const [tripNotes, setTripNotes] = useState('');
  const [tripItems, setTripItems] = useState([{ ...emptyTripItem }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const profile = await loadProfileForUser(user);
      const cleanRegion = profile.region || 'pt';
      setRegion(cleanRegion);

      const [loadedItems, loadedTrips] = await Promise.all([
        loadPantryItemsForUser(user),
        loadPantryTripsForUser(user),
      ]);

      setItems(loadedItems);
      setTrips(loadedTrips);
      setEditing(Object.fromEntries(loadedItems.map((item) => [item.id, { ...item }])));
    } catch (err) {
      setError(err.message || 'Could not load pantry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  const totalValue = useMemo(() => items.reduce((sum, item) => sum + estimateItemValue(item), 0), [items]);

  const groupedItems = useMemo(() => items.reduce((acc, item) => {
    const category = item.category || 'Other';
    (acc[category] ||= []).push(item);
    return acc;
  }, {}), [items]);

  function updateTripItem(index, nextIngredient) {
    setTripItems((current) => current.map((item, i) => (i === index ? nextIngredient : item)));
  }

  function updateTripField(index, field, value) {
    setTripItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addTripRow() {
    setTripItems((current) => [...current, { ...emptyTripItem }]);
  }

  function removeTripRow(index) {
    setTripItems((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));
  }

  async function submitTrip(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const cleanItems = tripItems.filter((item) => item.name?.trim() && Number(item.quantity || 0) > 0);

    if (!cleanItems.length) {
      setError('Add at least one bought ingredient.');
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
      setTripItems([{ ...emptyTripItem }]);
      setMessage('Supermarket trip added and pantry updated.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not save supermarket trip.');
    } finally {
      setSaving(false);
    }
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

  function editItemField(itemId, field, value) {
    setEditing((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] || {}),
        [field]: value,
      },
    }));
  }

  return (
    <AppFrame
      user={user}
      title="Pantry"
      subtitle="Track what you have at home. Add supermarket trips, then adjust quantities whenever reality changes."
      action={<div className="week-total"><span>Pantry value</span><strong>{formatMoney(totalValue)}</strong></div>}
    >
      {error && <div className="notice error-notice">{error}</div>}
      {message && <div className="notice">{message}</div>}
      {loading ? <div className="card">Loading pantry…</div> : null}

      <div className="pantry-layout page-transition">
        <section className="panel-soft pantry-trip-panel">
          <div className="card-header">
            <div>
              <h3>Add supermarket trip</h3>
              <p>Tell tryPan what you bought. It adds those amounts to your pantry.</p>
            </div>
            <span className="badge">{region === 'nl' ? 'Netherlands' : 'Portugal'}</span>
          </div>

          <form onSubmit={submitTrip} className="pantry-trip-form">
            <div className="form-grid compact-form-grid">
              <div className="field">
                <label>Store optional</label>
                <input value={tripStore} onChange={(event) => setTripStore(event.target.value)} placeholder="Continente, Pingo Doce, Albert Heijn…" />
              </div>

              <div className="field">
                <label>Date</label>
                <input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
              </div>

              <div className="field full">
                <label>Notes optional</label>
                <input value={tripNotes} onChange={(event) => setTripNotes(event.target.value)} placeholder="Weekly shop, refill, market run…" />
              </div>
            </div>

            <div className="section-header ingredients-header">
              <h3>Bought items</h3>
              <button type="button" className="soft-btn" onClick={addTripRow}>Add item</button>
            </div>

            <div className="grid pantry-trip-items">
              {tripItems.map((item, index) => (
                <div className="pantry-trip-row" key={index}>
                  <div className="field ingredient-name-field">
                    <label>Ingredient</label>
                    <IngredientPicker user={user} region={region} ingredient={item} onChange={(next) => updateTripItem(index, next)} />
                  </div>

                  <div className="field">
                    <label>Qty</label>
                    <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateTripField(index, 'quantity', event.target.value)} />
                  </div>

                  <div className="field">
                    <label>Unit</label>
                    <input value={item.unit} onChange={(event) => updateTripField(index, 'unit', event.target.value)} placeholder="g" />
                  </div>

                  <button type="button" className="danger-btn" onClick={() => removeTripRow(index)}>Remove</button>
                </div>
              ))}
            </div>

            <button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Add trip to pantry'}</button>
          </form>
        </section>

        <section className="panel-soft pantry-current-panel">
          <div className="card-header">
            <div>
              <h3>Current pantry</h3>
              <p>Edit quantities directly when something changes.</p>
            </div>
            <span className="badge">{items.length} items</span>
          </div>

          {!items.length && !loading ? (
            <div className="empty-state-card card">
              <h3>No pantry items yet</h3>
              <p>Add your latest supermarket trip to start tracking what you have.</p>
            </div>
          ) : null}

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
                        <small>{item.estimated_price ? `${formatMoney(item.estimated_price)} / ${item.price_unit || item.unit || 'unit'}` : 'No price set'}</small>
                      </div>

                      <input type="number" min="0" step="0.01" value={draft.quantity} onChange={(event) => editItemField(item.id, 'quantity', event.target.value)} />
                      <input value={draft.unit || ''} onChange={(event) => editItemField(item.id, 'unit', event.target.value)} />

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

        <aside className="panel-soft pantry-history-panel">
          <h3>Recent trips</h3>
          <p>These are saved so later we can explain pantry changes.</p>

          <div className="trip-history-list">
            {trips.slice(0, 8).map((trip) => (
              <div className="trip-history-card" key={trip.id}>
                <strong>{trip.store || 'Supermarket trip'}</strong>
                <span>{trip.bought_at}</span>
                <small>{trip.item_count || 0} items</small>
              </div>
            ))}

            {!trips.length && !loading ? <p>No trips yet.</p> : null}
          </div>
        </aside>
      </div>
    </AppFrame>
  );
}

export default function PantryPage() {
  return <AuthGate>{(user) => <PantryContent user={user} />}</AuthGate>;
}
