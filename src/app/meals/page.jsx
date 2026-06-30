'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import MealCard from '@/components/MealCard';
import MealForm from '@/components/MealForm';
import MealDetailsModal from '@/components/MealDetailsModal';
import { deleteMealForUser, loadMyMeals, loadProfileForUser, saveMealForUser } from '@/lib/dataStore';

function MealsContent({ user }) {
  const [meals, setMeals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async function load() {
    setLoading(true);
    setError('');

    try {
      const [loadedMeals, loadedProfile] = await Promise.all([loadMyMeals(user), loadProfileForUser(user)]);
      setMeals(loadedMeals);
      setProfile(loadedProfile);
    } catch (err) {
      setError(err.message || 'Could not load meals.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filters = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Quick', 'Leftovers', 'Pantry', 'Public', 'Private'];
  const visibleMeals = useMemo(() => {
    if (filter === 'All') return meals;
    if (filter === 'Public') return meals.filter((meal) => meal.is_public);
    if (filter === 'Private') return meals.filter((meal) => !meal.is_public);
    return meals.filter((meal) => {
      const tagText = (meal.tags || []).join(' ').toLowerCase();
      return meal.meal_type === filter.toLowerCase() || meal.meal_type === 'both' || tagText.includes(filter.toLowerCase());
    });
  }, [meals, filter]);

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
      subtitle="Meals you actually know how to cook. Add price, ingredients, instructions and optional video links."
      action={<button className="primary-btn" onClick={startNewMeal}>Add meal</button>}
    >
      {error && <div className="notice error-notice">{error}</div>}

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            key={editingMeal?.id || 'new-meal'}
            className="form-section"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <MealForm
              initialMeal={editingMeal}
              onSave={save}
              onCancel={() => {
                setShowForm(false);
                setEditingMeal(null);
              }}
              saving={saving}
              user={user}
              region={profile?.region || 'pt'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="filter-row meals-filter-row">
        {filters.map((item) => (
          <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid meal-grid" aria-label="Loading your meals">
          {[0, 1, 2].map((item) => (
            <div className="card meal-card skeleton-card" key={item}>
              <div className="skeleton-line wide" />
              <div className="skeleton-line" />
              <div className="skeleton-pill-row"><span /><span /><span /></div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !visibleMeals.length ? (
        <div className="card empty-state-card">
          <h3>{meals.length ? 'No meals match this filter' : 'No meals yet'}</h3>
          <p>{meals.length ? 'Try All or another tag.' : 'Add the first meal you already know how to cook. Leftovers and easy meals count too.'}</p>
          <button className="primary-btn" onClick={startNewMeal}>{meals.length ? 'Add another meal' : 'Add your first meal'}</button>
        </div>
      ) : null}

      {!loading && visibleMeals.length > 0 && (
        <motion.div layout className="grid meal-grid meals-library">
          <AnimatePresence>
            {visibleMeals.map((meal) => (
              <motion.div
                layout
                key={meal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
              >
                <MealCard
                  meal={meal}
                  onOpen={() => setSelectedMeal(meal)}
                  actions={
                    <div className="meal-card-actions">
                      <button className="soft-btn" onClick={() => startEditMeal(meal)}>Edit</button>
                      <button className="danger-btn" onClick={() => remove(meal.id)}>Delete</button>
                    </div>
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <MealDetailsModal
        meal={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        actions={selectedMeal ? (
          <div className="meal-card-actions">
            <button className="soft-btn" onClick={() => { startEditMeal(selectedMeal); setSelectedMeal(null); }}>Edit meal</button>
            <button className="danger-btn" onClick={() => { remove(selectedMeal.id); setSelectedMeal(null); }}>Delete</button>
          </div>
        ) : null}
      />
    </AppFrame>
  );
}

export default function MealsPage() {
  return <AuthGate>{(user) => <MealsContent user={user} />}</AuthGate>;
}
