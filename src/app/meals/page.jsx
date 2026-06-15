'use client';

import { useEffect, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import MealCard from '@/components/MealCard';
import MealForm from '@/components/MealForm';
import { deleteMealForUser, loadMyMeals, saveMealForUser } from '@/lib/dataStore';

function MealsContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [editingMeal, setEditingMeal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      setMeals(await loadMyMeals(user));
    } catch (err) {
      setError(err.message || 'Could not load meals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user.id]);

  function startNewMeal() {
    setEditingMeal(null);
    setShowForm(true);
  }

  function startEditMeal(meal) {
    setEditingMeal(meal);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(meal) {
    setSaving(true);
    setError('');

    try {
      await saveMealForUser(user, meal);
      setShowForm(false);
      setEditingMeal(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save meal.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const ok = window.confirm('Delete this meal?');
    if (!ok) return;

    setError('');

    try {
      await deleteMealForUser(user, id);
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete meal.');
    }
  }

  return (
    <AppFrame
      user={user}
      title="My meals"
      subtitle="Meals you actually know how to cook. Add prices, ingredients, instructions, and optional recipe videos."
      action={
        <button className="primary-btn" onClick={startNewMeal}>
          Add meal
        </button>
      }
    >
      {error && <div className="notice error-notice">{error}</div>}

      {showForm && (
        <div className="page-transition form-section">
          <MealForm
            initialMeal={editingMeal}
            onSave={save}
            onCancel={() => {
              setShowForm(false);
              setEditingMeal(null);
            }}
            saving={saving}
          />
        </div>
      )}

      {loading ? <div className="card">Loading meals…</div> : null}

      {!loading && !showForm && meals.length === 0 ? (
        <div className="card empty-state-card">
          <h3>No meals yet</h3>
          <p>Add the first meal you already know how to cook.</p>
          <button className="primary-btn" onClick={startNewMeal}>
            Add your first meal
          </button>
        </div>
      ) : null}

      {!loading && (
        <div className="grid meal-grid meals-library">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              actions={
                <div className="meal-card-actions">
                  <button className="soft-btn" onClick={() => startEditMeal(meal)}>
                    Edit
                  </button>

                  <button className="danger-btn" onClick={() => remove(meal.id)}>
                    Delete
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </AppFrame>
  );
}

export default function MealsPage() {
  return <AuthGate>{(user) => <MealsContent user={user} />}</AuthGate>;
}
