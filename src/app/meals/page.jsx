use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import MealCard from '@/components/MealCard';
import MealForm from '@/components/MealForm';
import { deleteMealForUser, loadMyMeals } from '@/lib/dataStore';

function MealsContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');

    try {
      setMeals(await loadMyMeals(user));
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      setError(err.message || 'Could not load meals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [user.id]);

  async function removeMeal(id) {
    if (!confirm('Delete this meal?')) return;
    await deleteMealForUser(user, id);
    await refresh();
  }

  const shown = meals.filter(
    (m) =>
      !filter ||
      m.title.toLowerCase().includes(filter.toLowerCase()) ||
      (m.tags || []).join(' ').toLowerCase().includes(filter.toLowerCase()) ||
      m.meal_type.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <AppFrame
      user={user}
      title="My meals"
      subtitle="Your personal database of meals you already know how to cook."
      action={<button className="primary-btn" onClick={() => setShowForm(true)}>Add meal</button>}
    >
      {error && <div className="notice error-notice">{error}</div>}

      {showForm || editing ? (
        <MealForm user={user} initial={editing} onSaved={refresh} onCancel={() => { setShowForm(false); setEditing(null); }} />
      ) : (
        <>
          <div className="toolbar">
            <input placeholder="Search meals, tags, lunch, dinner…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>

          {loading ? <div className="card">Loading meals…</div> : null}

          {!loading && !shown.length ? (
            <div className="card empty-state">No meals yet. Add your first meal to start planning.</div>
          ) : null}

          <div className="grid meal-grid">
            {shown.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                actions={
                  <>
                    <button className="soft-btn" onClick={() => setEditing(meal)}>Edit</button>
                    <button className="danger-btn" onClick={() => removeMeal(meal.id)}>Delete</button>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}
    </AppFrame>
  );
}

export default function MealsPage() {
  return <AuthGate>{(user) => <MealsContent user={user} />}</AuthGate>;
}
