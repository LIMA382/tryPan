'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AppNav from '@/components/AppNav';
import MealCard from '@/components/MealCard';
import MealDetailsModal from '@/components/MealDetailsModal';
import { copyPublicMealForUser, loadPublicMeals } from '@/lib/dataStore';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';
import { motionTokens } from '@/lib/motion';

const FILTERS = ['All', 'Quick', 'Cheap', 'Leftovers', 'Pantry', 'Vegetarian', 'High protein', 'Dinner', 'Lunch', 'Breakfast'];

function BrowseSkeleton() {
  return (
    <div className="grid meal-grid public-grid clean-public-grid" aria-label="Loading public meals">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div className="card meal-card skeleton-card" key={item}>
          <div className="skeleton-line wide" />
          <div className="skeleton-line" />
          <div className="skeleton-pill-row"><span /><span /><span /></div>
          <div className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export default function BrowsePage() {
  const reduceMotion = useReducedMotion();
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('featured');
  const [search, setSearch] = useState('');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        let currentUser = null;
        if (hasSupabaseEnv() && supabase) {
          const { data } = await supabase.auth.getSession();
          currentUser = data?.session?.user || null;
        }

        const loadedMeals = await loadPublicMeals(currentUser);
        if (!active) return;
        setUser(currentUser);
        setMeals(loadedMeals);
      } catch (err) {
        if (active) setError(err.message || 'Could not load public meals. Try refreshing.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const visibleMeals = useMemo(() => {
    const needle = filter.toLowerCase();
    const query = search.trim().toLowerCase();

    let list = filter === 'All'
      ? meals
      : meals.filter((meal) => {
          const tags = (meal.tags || []).join(' ').toLowerCase();
          return tags.includes(needle) || String(meal.meal_type || '').toLowerCase().includes(needle);
        });

    if (query) {
      list = list.filter((meal) => [meal.title, meal.description, meal.creator, ...(meal.tags || [])].join(' ').toLowerCase().includes(query));
    }

    if (sort === 'price') list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'time') list = [...list].sort((a, b) => Number(a.prep_time || 0) - Number(b.prep_time || 0));
    if (sort === 'ingredients') list = [...list].sort((a, b) => Number(a.ingredients?.length || 0) - Number(b.ingredients?.length || 0));

    return list;
  }, [meals, filter, sort, search]);

  async function save(meal) {
    if (!user) return;
    setError('');
    setSavingId(meal.id);
    try {
      await copyPublicMealForUser(user, meal);
      setSavedId(meal.id);
    } catch (err) {
      setError(err.message || 'Could not save meal. Try again.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <AppNav user={user} />

      <main className={`page-shell browse-page page-transition ${!user ? 'guest-browse-page' : ''}`}>
        <section className="browse-hero-panel compact-browse-hero">
          <div>
            <div className="eyebrow">Public meals</div>
            <h1>{user ? 'Save public meals to your kitchen.' : 'Browse familiar meals before signing up.'}</h1>
            <p>{user ? 'Open a meal, check the ingredients, then save the ones that fit your real week.' : 'Explore meals freely. When you want to save one or plan it, log in and add it to your kitchen.'}</p>
          </div>
        </section>

        <section className="browse-control-panel panel-soft" aria-label="Browse controls">
          <div className="field browse-search-field">
            <label htmlFor="browse-search">Search public meals</label>
            <input id="browse-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search leftovers, pasta, high protein…" />
          </div>

          <div className="filter-row browse-controls simplified-browse-controls">
            {FILTERS.map((item) => (
              <button type="button" key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item}</button>
            ))}
            <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort public meals">
              <option value="featured">Featured</option>
              <option value="price">Cheapest first</option>
              <option value="time">Fastest first</option>
              <option value="ingredients">Fewest ingredients</option>
            </select>
            {!user && <Link className="primary-btn filter-login" href="/login">Log in to save</Link>}
          </div>
        </section>

        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {loading ? <BrowseSkeleton /> : null}

        {!loading && !error && !visibleMeals.length && (
          <div className="empty-state-card card public-empty-state">
            <h2>No public meals yet</h2>
            <p>{meals.length ? 'No meals match your filters. Try a broader search.' : 'Create an account to add your own meals, or check back later.'}</p>
            {!user && <Link className="primary-btn" href="/login">Create account</Link>}
          </div>
        )}

        {!loading && visibleMeals.length > 0 && (
          <motion.div layout className="grid meal-grid public-grid clean-public-grid">
            <AnimatePresence>
              {visibleMeals.map((meal) => (
                <motion.div key={meal.id} layout initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }} transition={{ duration: reduceMotion ? 0 : motionTokens.base, ease: motionTokens.ease }}>
                  <MealCard meal={meal} publicView compact onOpen={() => setSelectedMeal(meal)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <MealDetailsModal
        meal={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        guest={!user}
        actions={selectedMeal ? (
          user ? (
            <button className="primary-btn" disabled={savingId === selectedMeal.id} onClick={() => save(selectedMeal)}>{savedId === selectedMeal.id ? 'Saved to my meals' : savingId === selectedMeal.id ? 'Saving…' : 'Save to my meals'}</button>
          ) : (
            <Link className="primary-btn" href="/login">Log in to save</Link>
          )
        ) : null}
      />
    </>
  );
}
