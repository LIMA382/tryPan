'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { consumePantryForMeal, loadAllVisibleMeals } from '@/lib/dataStore';

function CookContent({ user }) {
  const { id } = useParams();
  const [meal, setMeal] = useState(null);
  const [checked, setChecked] = useState([]);
  const [done, setDone] = useState(false);
  const [pantryUpdates, setPantryUpdates] = useState([]);

  useEffect(() => { loadAllVisibleMeals(user).then((items) => setMeal(items.find((item) => String(item.id) === decodeURIComponent(String(id))) || null)); }, [id, user]);
  if (!meal) return <AppFrame user={user} title="Cooking mode" subtitle="Loading recipe…"><div className="card">Preparing your recipe…</div></AppFrame>;

  async function finish() {
    const updates = await consumePantryForMeal(user, meal);
    setPantryUpdates(updates);
    setDone(true);
    const history = JSON.parse(localStorage.getItem('trypan.cooked-recipes.v1') || '[]');
    localStorage.setItem('trypan.cooked-recipes.v1', JSON.stringify([{ id: meal.id, title: meal.title, cooked_at: new Date().toISOString() }, ...history].slice(0, 50)));
  }

  return <AppFrame user={user} title={meal.title} subtitle="A calm, distraction-free cooking mode." eyebrow="Cooking mode">
    <div className="cook-mode-grid">
      <section className="panel-soft recipe-section"><h2>Get everything ready</h2>{meal.ingredients.map((ingredient, index) => <label className="cook-check" key={ingredient.id || index}><input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /><span><strong>{ingredient.name}</strong><small>{ingredient.quantity} {ingredient.unit}</small></span></label>)}</section>
      <section className="panel-soft recipe-section"><h2>Cook</h2><p className="recipe-instructions">{meal.instructions || 'Follow your usual method for this meal.'}</p>{done ? <div className="cook-complete"><strong>Nice work — meal completed.</strong><p>{pantryUpdates.length ? `${pantryUpdates.length} pantry ${pantryUpdates.length === 1 ? 'item was' : 'items were'} updated automatically.` : 'This recipe is now in your cooked history.'}</p><Link className="primary-btn" href="/app">Back home</Link></div> : <button className="primary-btn" type="button" onClick={finish}>I cooked this</button>}</section>
    </div>
  </AppFrame>;
}

export default function CookPage() { return <AuthGate>{(user) => <CookContent user={user} />}</AuthGate>; }
