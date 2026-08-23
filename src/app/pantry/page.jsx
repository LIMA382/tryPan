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

const SUPERMARKETS = {
  pt: [
    'Continente', 'Continente Bom Dia', 'Continente Modelo', 'Pingo Doce', 'Lidl', 'Aldi',
    'Auchan', 'Auchan MyAuchan', 'Intermarché', 'Mercadona', 'Minipreço', 'El Corte Inglés',
    'Supercor', 'E.Leclerc', 'Froiz', 'Apolónia', 'Meu Super', 'Amanhecer', 'Coviran',
    'SPAR', 'Makro', 'Recheio', 'Celeiro', 'Go Natural', 'The Food Co.',
  ],
  nl: [
    'Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'PLUS', 'Dirk', 'Coop', 'SPAR', 'DekaMarkt',
    'Hoogvliet', 'Vomar', 'Nettorama', 'Boni', 'Poiesz', 'Ekoplaza', 'Marqt', 'Picnic',
    'Crisp', 'Makro', 'Sligro', 'Amazing Oriental', 'Odin', 'Landi', 'Vers & Fijn',
  ],
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
  const [storeSuggestionsOpen, setStoreSuggestionsOpen] = useState(false);
  const [tripDate, setTripDate] = useState(today());
  const [tripNotes, setTripNotes] = useState('');
  const [draftItem, setDraftItem] = useState({ ...emptyItem });
  const [tripItems, setTripItems] = useState([]);
  const [tripStep, setTripStep] = useState(0);
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
  const useSoonItems = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 5);
    return items.filter((item) => item.expiry_date && new Date(`${item.expiry_date}T12:00:00`) <= limit).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  }, [items]);
  const tripTotal = useMemo(() => tripItems.reduce((sum, item) => sum + estimatePantryItemValue(item), 0), [tripItems]);
  const supermarketSuggestions = useMemo(() => {
    const needle = tripStore.trim().toLowerCase();
    const brands = SUPERMARKETS[region] || SUPERMARKETS.pt;
    if (!needle) return brands.slice(0, 10);
    return brands
      .filter((brand) => brand.toLowerCase().includes(needle))
      .sort((a, b) => Number(!a.toLowerCase().startsWith(needle)) - Number(!b.toLowerCase().startsWith(needle)))
      .slice(0, 10);
  }, [region, tripStore]);

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
      setTripStep(0);
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

  async function adjustItem(item, delta) {
    const quantity = Math.max(0, Number(item.quantity || 0) + delta);
    setSaving(true);
    setError('');
    try {
      if (!quantity) await deletePantryItemForUser(user, item.id);
      else await savePantryItemForUser(user, { ...item, quantity });
      setMessage(quantity ? `${item.name} updated.` : `${item.name} removed.`);
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

      {useSoonItems.length ? <section className="use-soon-panel panel-soft"><div><span className="student-kicker">Use soon</span><h3>Save these before they expire</h3></div><div>{useSoonItems.map((item) => <span key={item.id}><strong>{item.name}</strong><small>{item.expiry_date}</small></span>)}</div></section> : null}

      <div className="pantry-layout cleaner-pantry-layout">
        <section className="panel-soft pantry-trip-panel lesson-trip-panel">
          <div className="lesson-topline">
            <div>
              <span className="lesson-label">Supermarket lesson</span>
              <h3>{['Where did you shop?', 'What did you bring home?', 'Ready to update your pantry?'][tripStep]}</h3>
            </div>
            <span className="lesson-region">{region === 'nl' ? 'NL' : 'PT'}</span>
          </div>

          <div className="lesson-progress" aria-label={`Step ${tripStep + 1} of 3`}>
            {[0, 1, 2].map((step) => <span className={step <= tripStep ? 'complete' : ''} key={step} />)}
          </div>
          <p className="lesson-step-count">Step {tripStep + 1} of 3</p>

          <form onSubmit={submitTrip} className="pantry-trip-form lesson-trip-form">
            {tripStep === 0 && (
              <div className="lesson-stage">
                <div className="lesson-prompt-icon" aria-hidden="true">1</div>
                <div className="field lesson-main-question supermarket-picker">
                  <label>Supermarket name</label>
                  <input
                    autoFocus
                    role="combobox"
                    aria-label="Search supermarket"
                    aria-expanded={storeSuggestionsOpen}
                    aria-controls="supermarket-suggestions"
                    value={tripStore}
                    onFocus={() => setStoreSuggestionsOpen(true)}
                    onChange={(event) => { setTripStore(event.target.value); setStoreSuggestionsOpen(true); }}
                    onBlur={() => window.setTimeout(() => setStoreSuggestionsOpen(false), 120)}
                    placeholder={region === 'nl' ? 'Start typing Albert Heijn, Jumbo…' : 'Start typing Continente, Pingo Doce…'}
                  />
                  {storeSuggestionsOpen && supermarketSuggestions.length ? (
                    <div className="supermarket-suggestions" id="supermarket-suggestions">
                      {supermarketSuggestions.map((brand) => (
                        <button type="button" key={brand} onMouseDown={(event) => event.preventDefault()} onClick={() => { setTripStore(brand); setStoreSuggestionsOpen(false); }}>
                          <span className="supermarket-mark" aria-hidden="true">{brand.slice(0, 1)}</span>
                          <span><strong>{brand}</strong><small>{region === 'nl' ? 'Netherlands' : 'Portugal'}</small></span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <small>Optional, but useful when comparing prices later.</small>
                </div>
                <div className="field">
                  <label>Shopping date</label>
                  <input type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
                </div>
                <div className="field">
                  <label>Trip note</label>
                  <input value={tripNotes} onChange={(event) => setTripNotes(event.target.value)} placeholder="Weekly shop, quick top-up…" />
                </div>
              </div>
            )}

            {tripStep === 1 && (
              <div className="lesson-stage">
                <div className="lesson-prompt-icon" aria-hidden="true">2</div>
                <div className="simple-item-adder lesson-item-adder">
                  <div className="field ingredient-name-field"><label>Choose an ingredient</label><IngredientPicker user={user} region={region} ingredient={draftItem} onChange={updateDraftIngredient} /></div>
                  <div className="field trip-qty-field"><label>Quantity</label><input type="number" min="0" step="0.01" value={draftItem.quantity} onChange={(event) => updateDraft('quantity', event.target.value)} /></div>
                  <div className="field trip-unit-field"><label>Unit</label><input value={draftItem.unit} onChange={(event) => updateDraft('unit', event.target.value)} placeholder="g" /></div>
                  <div className="field trip-price-field"><label>Price</label><input type="number" min="0" step="0.01" value={draftItem.estimated_price} onChange={(event) => updateDraft('estimated_price', event.target.value)} placeholder="0.00" disabled={Boolean(draftItem.is_free)} /></div>
                  <div className="field trip-price-unit-field"><label>Price unit</label><input value={draftItem.price_unit} onChange={(event) => updateDraft('price_unit', event.target.value)} placeholder={draftItem.unit || 'unit'} disabled={Boolean(draftItem.is_free)} /></div>
                  <label className="free-toggle trip-free-toggle"><input type="checkbox" checked={Boolean(draftItem.is_free)} onChange={(event) => updateDraft('is_free', event.target.checked)} />Free / already had it</label>
                  <button type="button" className="lesson-add-button" onClick={addDraftToTrip}>Add item</button>
                </div>

                <div className="lesson-basket">
                  <div className="trip-basket-header"><h4>Your basket</h4><strong>{tripItems.length} {tripItems.length === 1 ? 'item' : 'items'}</strong></div>
                  {tripItems.map((item, index) => <div className="lesson-basket-row" key={`${item.name}-${index}`}><span className="lesson-check">✓</span><div><strong>{item.name}</strong><small>{item.quantity} {item.unit} · {item.is_free ? 'Free' : money(estimatePantryItemValue(item))}</small></div><button type="button" onClick={() => removeTripItem(index)} aria-label={`Remove ${item.name}`}>×</button></div>)}
                  {!tripItems.length && <p>Add your first item to continue.</p>}
                </div>
              </div>
            )}

            {tripStep === 2 && (
              <div className="lesson-stage lesson-review">
                <div className="lesson-finish-icon" aria-hidden="true">★</div>
                <p>You completed the trip. Check the details before adding everything to your pantry.</p>
                <dl><div><dt>Store</dt><dd>{tripStore || 'Not specified'}</dd></div><div><dt>Date</dt><dd>{tripDate}</dd></div><div><dt>Items</dt><dd>{tripItems.length}</dd></div><div><dt>Trip total</dt><dd>{money(tripTotal)}</dd></div></dl>
                <div className="lesson-review-items">{tripItems.map((item, index) => <div key={`${item.name}-${index}`}><span>{item.name}</span><strong>{item.quantity} {item.unit}</strong><em>{item.is_free ? 'Free' : money(estimatePantryItemValue(item))}</em></div>)}</div>
              </div>
            )}

            <div className="lesson-controls">
              {tripStep > 0 ? <button type="button" className="lesson-back" onClick={() => setTripStep((step) => step - 1)} disabled={saving}>Back</button> : <span />}
              {tripStep < 2 ? <button type="button" className="lesson-continue" onClick={() => setTripStep((step) => step + 1)} disabled={tripStep === 1 && !tripItems.length}>Continue</button> : <button className="lesson-continue lesson-finish" disabled={saving}>{saving ? 'Saving…' : 'Finish trip'}</button>}
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
                      <div className="quantity-stepper">
                        <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => adjustItem(item, -1)} disabled={saving}>−</button>
                        <strong>{draft.quantity}</strong>
                        <button type="button" aria-label={`Add one ${item.name}`} onClick={() => adjustItem(item, 1)} disabled={saving}>+</button>
                      </div>
                      <input type="number" min="0" step="0.01" value={draft.quantity} onChange={(event) => editItemField(item.id, 'quantity', event.target.value)} />
                      <input value={draft.unit || ''} onChange={(event) => editItemField(item.id, 'unit', event.target.value)} />
                      <input type="date" aria-label={`${item.name} expiry date`} value={draft.expiry_date || ''} onChange={(event) => editItemField(item.id, 'expiry_date', event.target.value)} />
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
