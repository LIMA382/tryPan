'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import MealCard from '@/components/MealCard';
import { copyPublicMealForUser, loadPublicMeals } from '@/lib/dataStore';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

const FILTERS = ['All', 'Quick', 'Budget', 'Vegetarian', 'High protein', 'Dinner', 'Lunch'];

export default function BrowsePage() {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [filter, setFilter] = useState('All');
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
    if (filter === 'All') return meals;
    const needle = filter.toLowerCase();
    return meals.filter((meal) => {
      const tags = (meal.tags || []).join(' ').toLowerCase();
      return tags.includes(needle) || String(meal.meal_type || '').toLowerCase().includes(needle);
    });
  }, [meals, filter]);

  const avgPrice = useMemo(() => {
    if (!visibleMeals.length) return 0;
    return visibleMeals.reduce((sum, meal) => sum + Number(meal.price || 0), 0) / visibleMeals.length;
  }, [visibleMeals]);

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

      <main className="page-shell browse-page page-transition">
        <section className="browse-hero-panel">
          <div>
            <div className="eyebrow">Community kitchen</div>
            <h2>Find meals worth adding to your week.</h2>
            <p>
              Browse public meals with estimated prices, prep time and ingredient counts. Save a meal when you want to edit it or add it to your planner.
            </p>
          </div>

          <div className="browse-stats">
            <div><strong>{visibleMeals.length}</strong><span>meals</span></div>
            <div><strong>€{avgPrice.toFixed(2)}</strong><span>avg price</span></div>
          </div>
        </section>

        <div className="filter-row">
          {FILTERS.map((item) => (
            <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
          {!user && <Link className="primary-btn filter-login" href="/login">Log in to save</Link>}
        </div>

        {error && <div className="notice error-notice">{error}</div>}
        {loading ? <div className="card">Loading public meals…</div> : null}

        <div className="grid meal-grid public-grid">
          {visibleMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              publicView
              actions={
                user ? (
                  <button className="primary-btn" onClick={() => save(meal)}>
                    {savedId === meal.id ? 'Saved' : 'Save meal'}
                  </button>
                ) : (
                  <Link className="soft-btn" href="/login">Log in to save</Link>
                )
              }
            />
          ))}
        </div>
      </main>
    </>
  );
}
