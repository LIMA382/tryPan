'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import MealCard from '@/components/MealCard';
import { copyPublicMealForUser, loadPublicMeals } from '@/lib/dataStore';

function BrowseContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');

    try {
      setMeals(await loadPublicMeals(user));
    } catch (err) {
      setError(err.message || 'Could not load public meals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  async function save(meal) {
    try {
      await copyPublicMealForUser(user, meal);
      setSavedId(meal.id);
    } catch (err) {
      setError(err.message || 'Could not save meal.');
    }
  }

  return (
    <AppFrame user={user} title="Browse public meals" subtitle="Save meal ideas from other people, then edit them for your own kitchen.">
      {error && <div className="notice error-notice">{error}</div>}
      {loading ? <div className="card">Loading public meals…</div> : null}
      {!loading && !meals.length ? <div className="card">No public meals yet. Make one of your meals public to start the library.</div> : null}

      <div className="grid meal-grid">
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            actions={
              <button className="primary-btn" onClick={() => save(meal)}>
                {savedId === meal.id ? 'Saved' : 'Save to my meals'}
              </button>
            }
          />
        ))}
      </div>
    </AppFrame>
  );
}

export default function BrowsePage() {
  return <AuthGate>{(user) => <BrowseContent user={user} />}</AuthGate>;
}
