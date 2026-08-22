'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppNav from '@/components/AppNav';
import { copyPublicMealForUser, loadAllVisibleMeals, loadPublicMeals } from '@/lib/dataStore';
import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';

const money = (value) => `€${Number(value || 0).toFixed(2)}`;

export default function RecipePage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      let currentUser = !hasSupabaseEnv() ? { id: 'demo-user', email: 'demo@trypan.app' } : null;
      if (hasSupabaseEnv() && supabase) {
        const { data } = await supabase.auth.getSession();
        currentUser = data?.session?.user || null;
      }
      const meals = currentUser ? await loadAllVisibleMeals(currentUser) : await loadPublicMeals();
      const found = meals.find((item) => String(item.id) === decodeURIComponent(String(id)));
      if (!active) return;
      setUser(currentUser);
      setMeal(found || null);
      setLoading(false);
      if (found && typeof window !== 'undefined') {
        const recent = JSON.parse(localStorage.getItem('trypan.recent-recipes.v1') || '[]').filter((item) => item.id !== found.id);
        localStorage.setItem('trypan.recent-recipes.v1', JSON.stringify([{ id: found.id, title: found.title, viewed_at: new Date().toISOString() }, ...recent].slice(0, 20)));
      }
    }
    load().catch(() => setLoading(false));
    return () => { active = false; };
  }, [id]);

  async function saveRecipe() {
    if (!user || !meal) return;
    await copyPublicMealForUser(user, meal);
    setSaved(true);
  }

  return (
    <>
      <AppNav user={user} />
      <main className="page-shell recipe-detail-page page-transition">
        <nav className="recipe-breadcrumb" aria-label="Breadcrumb"><Link href="/discover">Discover</Link><span>›</span><span>{meal?.title || 'Recipe'}</span></nav>
        {loading ? <div className="card skeleton-card"><div className="skeleton-line wide" /><div className="skeleton-line" /></div> : null}
        {!loading && !meal ? <div className="card empty-state-card"><h1>Recipe not found</h1><p>It may be private or no longer available.</p><Link className="primary-btn" href="/discover">Discover recipes</Link></div> : null}
        {meal ? (
          <article className="recipe-detail-layout">
            <header className="recipe-detail-hero panel-soft">
              <div className="eyebrow">{meal.is_public ? 'Community recipe' : 'Your recipe'}</div>
              <h1>{meal.title}</h1>
              <p>{meal.description || 'A recipe ready for your next week.'}</p>
              <div className="badges">{(meal.tags || []).map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div>
              <div className="recipe-facts">
                <div><span>Time</span><strong>{meal.prep_time} min</strong></div>
                <div><span>Servings</span><strong>{meal.servings || 1}</strong></div>
                <div><span>Estimated cost</span><strong>{money(meal.price)}</strong></div>
                <div><span>Per serving</span><strong>{money(Number(meal.price || 0) / Math.max(1, Number(meal.servings || 1)))}</strong></div>
              </div>
            </header>

            <div className="recipe-detail-content">
              <section className="panel-soft recipe-section"><h2>Ingredients</h2><div className="recipe-ingredient-list">{(meal.ingredients || []).map((ingredient, index) => <div key={ingredient.id || `${ingredient.name}-${index}`}><strong>{ingredient.name}</strong><span>{ingredient.quantity} {ingredient.unit}</span></div>)}</div></section>
              <section className="panel-soft recipe-section" id="instructions"><h2>How to make it</h2><p className="recipe-instructions">{meal.instructions || 'The creator has not added instructions yet.'}</p>{meal.video_url ? <a className="soft-btn" href={meal.video_url} target="_blank" rel="noreferrer">Watch recipe video</a> : null}</section>
            </div>

            <aside className="recipe-action-card panel-soft">
              <span>Ready to use this recipe?</span>
              <Link className="primary-btn" href={`/plan/week?recipe=${encodeURIComponent(meal.id)}`}>Add to week</Link>
              {user && meal.user_id !== user.id ? <button className="soft-btn" type="button" onClick={saveRecipe}>{saved ? 'Saved to Library' : 'Save to Library'}</button> : null}
              {!user ? <Link className="soft-btn" href="/login">Log in to save</Link> : null}
              <Link className="soft-btn" href={`/recipes/${encodeURIComponent(meal.id)}/cook`}>Start cooking</Link>
              {meal.creator ? <small>Shared by {meal.creator}</small> : null}
            </aside>
          </article>
        ) : null}
      </main>
    </>
  );
}

