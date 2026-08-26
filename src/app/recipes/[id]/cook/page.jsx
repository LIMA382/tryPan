'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { buildPantryConsumptionPreview, consumePantryForMeal, deletePantryItemForUser, loadAllVisibleMeals, loadPantryItemsForUser, saveLeftoversForUser, savePantryItemForUser, undoPantryConsumption } from '@/lib/dataStore';
import { recipeSlug } from '@/lib/recipeUtils';
import { rememberCookedRecipe } from '@/lib/libraryHistory';

function CookContent({ user }) {
  const { id } = useParams();
  const [meal, setMeal] = useState(null);
  const [checked, setChecked] = useState([]);
  const [done, setDone] = useState(false);
  const [pantryUpdates, setPantryUpdates] = useState([]);
  const [portionsEaten, setPortionsEaten] = useState(1);
  const [leftovers, setLeftovers] = useState(0);
  const [pantry, setPantry] = useState([]);
  const [servingsCooked, setServingsCooked] = useState(1);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoData, setUndoData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { Promise.all([loadAllVisibleMeals(user), loadPantryItemsForUser(user)]).then(([items, pantryItems]) => { const requested = decodeURIComponent(String(id)); const found = items.find((item) => String(item.id) === requested || recipeSlug(item.title) === requested) || null; setMeal(found); setPantry(pantryItems); setServingsCooked(Math.max(1, Number(found?.servings || 1))); setPortionsEaten(Math.max(1, Number(found?.servings || 1))); }); }, [id, user]);
  if (!meal) return <AppFrame user={user} title="Cooking mode" subtitle="Loading recipe…"><div className="card">Preparing your recipe…</div></AppFrame>;

  async function finish() {
    setSaving(true); setError('');
    try {
      const updates = await consumePantryForMeal(user, meal, servingsCooked);
      const remaining = Math.max(0, Number(servingsCooked || 1) - Number(portionsEaten || 0));
      const leftoverBefore = pantry.find((item) => String(item.name).toLowerCase() === `leftover: ${meal.title}`.toLowerCase()) || null;
      const leftoverItem = remaining ? await saveLeftoversForUser(user, meal, remaining) : null;
      setPantryUpdates(updates); setLeftovers(remaining); setUndoData({ updates, leftoverBefore, leftoverItem });
      setDone(true); rememberCookedRecipe(meal);
    } catch (err) { setError(err.message || 'Could not update your pantry.'); }
    finally { setSaving(false); }
  }

  async function undo() {
    if (!undoData) return;
    setSaving(true); setError('');
    try {
      await undoPantryConsumption(user, undoData.updates);
      if (undoData.leftoverBefore) await savePantryItemForUser(user, undoData.leftoverBefore);
      else if (undoData.leftoverItem?.id) await deletePantryItemForUser(user, undoData.leftoverItem.id);
      setDone(false); setReviewing(false); setUndoData(null); setPantry(await loadPantryItemsForUser(user));
    } catch (err) { setError(err.message || 'Could not undo the pantry update.'); }
    finally { setSaving(false); }
  }

  const preview = buildPantryConsumptionPreview(meal, pantry, servingsCooked);

  return <AppFrame user={user} title={meal.title} subtitle="A calm, distraction-free cooking mode." eyebrow="Cooking mode">
    <div className="cook-mode-grid">
      <section className="panel-soft recipe-section"><h2>Get everything ready</h2>{meal.ingredients.map((ingredient, index) => <label className="cook-check" key={ingredient.id || index}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /><span><strong>{ingredient.name}</strong><small>{ingredient.quantity} {ingredient.unit}</small></span></label>)}</section>
      <section className="panel-soft recipe-section"><h2>Cook</h2><p className="recipe-instructions">{meal.instructions || 'Follow your usual method for this meal.'}</p>{error ? <div className="notice error-notice">{error}</div> : null}{done ? <div className="cook-complete"><strong>Nice work — meal completed.</strong><p>{pantryUpdates.length ? `${pantryUpdates.length} pantry ${pantryUpdates.length === 1 ? 'item was' : 'items were'} updated.` : 'This recipe is now in your cooked history.'}{leftovers ? ` ${leftovers} leftover ${leftovers === 1 ? 'portion is' : 'portions are'} saved for three days.` : ''}</p><div className="cook-complete-actions"><Link className="primary-btn" href="/app">Back home</Link><button className="soft-btn" type="button" onClick={undo} disabled={saving}>{saving ? 'Undoing…' : 'Undo pantry update'}</button></div></div> : reviewing ? <div className="cook-review"><div className="card-header"><div><span className="student-kicker">Review pantry update</span><h3>Here is what will change</h3></div><button className="soft-btn" type="button" onClick={() => setReviewing(false)}>Back</button></div>{preview.map((line, index) => <div className={`cook-review-line ${line.status}`} key={line.ingredient.id || index}><div><strong>{line.ingredient.name}</strong><small>Need {line.required_quantity} {line.unit} · Have {line.available_quantity} {line.unit}</small></div><span>{line.status === 'ready' ? `−${line.deducted_quantity} ${line.unit}` : line.status === 'short' ? 'Use what is tracked' : 'Not in pantry'}</span></div>)}<p className="cook-review-note">Items that are missing or short will never produce a negative pantry balance.</p><button className="primary-btn" type="button" onClick={finish} disabled={saving}>{saving ? 'Updating pantry…' : 'Confirm and finish'}</button></div> : <div className="cook-finish-controls"><label>Servings cooked<input type="number" min="1" max="12" step="1" value={servingsCooked} onChange={(event) => { const value = Math.max(1, Number(event.target.value || 1)); setServingsCooked(value); setPortionsEaten((current) => Math.min(value, Number(current || 0))); }} /></label><label>Portions eaten<input type="number" min="0" max={servingsCooked} step="1" value={portionsEaten} onChange={(event) => setPortionsEaten(Math.min(servingsCooked, Math.max(0, Number(event.target.value || 0))))} /></label><small>{Math.max(0, Number(servingsCooked || 1) - Number(portionsEaten || 0))} portions will be saved as leftovers.</small><button className="primary-btn" type="button" onClick={() => setReviewing(true)}>Review pantry update</button></div>}</section>
    </div>
  </AppFrame>;
}

export default function CookPage() { return <AuthGate>{(user) => <CookContent user={user} />}</AuthGate>; }
