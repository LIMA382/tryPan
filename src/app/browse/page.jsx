'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AppNav from '@/components/AppNav';
import MealCard from '@/components/MealCard';
import MealDetailsModal from '@/components/MealDetailsModal';
import { copyPublicMealForUser, loadPublicMeals } from '@/lib/dataStore';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

const FILTERS = ['All', 'Quick', 'Budget', 'Vegetarian', 'High protein', 'Dinner', 'Lunch', 'Breakfast'];

export default function BrowsePage() {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('featured');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);

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

        if (!active) return;
        setUser(currentUser);
        setMeals(await loadPublicMeals(currentUser));
      } catch (err) {
        setError(err.message || 'Could not load public meals.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const visibleMeals = useMemo(() => {
    const needle = filter.toLowerCase();
    let list = filter === 'All'
      ? meals
      : meals.filter((meal) => {
          const tags = (meal.tags || []).join(' ').toLowerCase();
          return tags.includes(needle) || String(meal.meal_type || '').toLowerCase().includes(needle);
        });

    if (sort === 'price') list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'time') list = [...list].sort((a, b) => Number(a.prep_time || 0) - Number(b.prep_time || 0));
    if (sort === 'ingredients') list = [...list].sort((a, b) => Number(a.ingredients?.length || 0) - Number(b.ingredients?.length || 0));

    return list;
  }, [meals, filter, sort]);

  async function save(meal) {
    if (!user) return;
    try {
      await copyPublicMealForUser(user, meal);
      setSavedId(meal.id);
    } catch (err) {
      setError(err.message || 'Could not save meal.');
    }
  }

  return (
    <>
      <AppNav user={user} />

      <main className={`page-shell browse-page page-transition ${!user ? 'guest-browse-page' : ''}`}>
        <section className="browse-hero-panel compact-browse-hero">
          <div>
            <div className="eyebrow">Community kitchen</div>
            <h2>{user ? 'Save public meals to your kitchen.' : 'Browse public meals before signing up.'}</h2>
            <p>{user ? 'Open a meal to see ingredients, instructions, videos and save it.' : 'You can explore meals freely. Log in when you want to save or plan one.'}</p>
          </div>
        </section>

        <div className="filter-row browse-controls simplified-browse-controls">
          {FILTERS.map((item) => (
            <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>{item}</button>
          ))}
          <select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">Featured</option>
            <option value="price">Cheapest first</option>
            <option value="time">Fastest first</option>
            <option value="ingredients">Fewest ingredients</option>
          </select>
          {!user && <Link className="primary-btn filter-login" href="/login">Log in to save</Link>}
        </div>

        {error && <div className="notice error-notice">{error}</div>}
        {loading ? <div className="card">Loading public meals…</div> : null}

        <motion.div layout className="grid meal-grid public-grid clean-public-grid">
          <AnimatePresence>
            {visibleMeals.map((meal) => (
              <motion.div key={meal.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }}>
                <MealCard meal={meal} publicView compact onOpen={() => setSelectedMeal(meal)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </main>

      <MealDetailsModal
        meal={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        guest={!user}
        actions={selectedMeal ? (
          user ? (
            <button className="primary-btn" onClick={() => save(selectedMeal)}>{savedId === selectedMeal.id ? 'Saved to my meals' : 'Save to my meals'}</button>
          ) : (
            <Link className="primary-btn" href="/login">Log in to save</Link>
          )
        ) : null}
      />
    </>
  );
}
