'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import MealCard from '@/components/MealCard';
import { copyPublicMealForUser, loadPublicMeals } from '@/lib/dataStore';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

export default function BrowsePage() {
  const [user, setUser] = useState(null);
  const [meals, setMeals] = useState([]);
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

    return () => {
      active = false;
    };
  }, []);

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

      <main className="page-shell browse-page">
        <section className="toolbar browse-hero">
          <div>
            <div className="eyebrow">Public meal library</div>

            <h2>Browse meals before you sign up.</h2>

            <p>
              Anyone can explore public meals. Log in when you want to save one to your own kitchen,
              edit the ingredients, or drag it into your weekly plan.
            </p>
          </div>

          {!user && (
            <Link className="primary-btn" href="/login">
              Log in to save meals
            </Link>
          )}
        </section>

        {error && <div className="notice error-notice">{error}</div>}

        {loading ? <div className="card">Loading public meals…</div> : null}

        <div className="grid meal-grid">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              actions={
                user ? (
                  <button className="primary-btn" onClick={() => save(meal)}>
                    {savedId === meal.id ? 'Saved' : 'Save to my meals'}
                  </button>
                ) : (
                  <Link className="soft-btn" href="/login">
                    Log in to save
                  </Link>
                )
              }
            />
          ))}
        </div>
      </main>
    </>
  );
}
