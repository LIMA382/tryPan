'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import MealCard from '@/components/MealCard';
import MealForm from '@/components/MealForm';
import MealDetailsModal from '@/components/MealDetailsModal';
import { deleteMealForUser, loadAllVisibleMeals, loadMyMeals, loadProfileForUser, saveMealForUser } from '@/lib/dataStore';
import { loadLibraryHistoryForUser } from '@/lib/libraryHistory';
import { recipePath, recipeSlug } from '@/lib/recipeUtils';
import { hasSupabaseEnv } from '@/lib/supabaseClient';

function MealsContent({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [meals, setMeals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [libraryTab, setLibraryTab] = useState('created');
  const [history, setHistory] = useState({ saved: [], cooked: [], recent: [] });
  const [visibleCatalog, setVisibleCatalog] = useState([]);

  const load = useCallback(async function load() {
    setLoading(true);
    setError('');

    try {
      // The visible-meals query already includes the user's meals. Reusing it
      // avoids fetching every recipe and ingredient twice on each Library visit.
      const [loadedCatalog, loadedHistory] = await Promise.all([loadAllVisibleMeals(user), loadLibraryHistoryForUser(user)]);
      const loadedMeals = hasSupabaseEnv()
        ? loadedCatalog.filter((meal) => meal.user_id === user.id)
        : await loadMyMeals(user);
      setMeals(loadedMeals);
      setVisibleCatalog(loadedCatalog);
      setHistory(loadedHistory);
    } catch (err) {
      setError(err.message || 'Could not load meals.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingMeal(null);
      setShowForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showForm || profile) return;
    loadProfileForUser(user).then(setProfile).catch(() => setProfile({ region: 'pt' }));
  }, [profile, showForm, user]);

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (['created', 'saved', 'cooked', 'recent'].includes(requested)) setLibraryTab(requested);
  }, [searchParams]);

  const tabMeals = useMemo(() => {
    if (!pathname.startsWith('/library') || libraryTab === 'created') return meals;
    const entries = history[libraryTab] || [];
    const allMeals = [...meals, ...visibleCatalog];
    const byId = new Map(allMeals.map((meal) => [String(meal.id), meal]));
    const bySlug = new Map(allMeals.map((meal) => [recipeSlug(meal.title), meal]));
    // Built-in numeric/public IDs can shift as the catalogue grows. Prefer the
    // stable title slug so history never resolves to a different recipe.
    return entries.map((entry) => bySlug.get(entry.recipe_key || recipeSlug(entry.title || entry.slug)) || byId.get(String(entry.meal_id || entry.id))).filter(Boolean);
  }, [history, libraryTab, meals, pathname, visibleCatalog]);

  const filters = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Quick', 'Leftovers', 'Pantry', 'Public', 'Private'];
  const visibleMeals = useMemo(() => {
    if (filter === 'All') return tabMeals;
    if (filter === 'Public') return tabMeals.filter((meal) => meal.is_public);
    if (filter === 'Private') return tabMeals.filter((meal) => !meal.is_public);
    return tabMeals.filter((meal) => {
      const tagText = (meal.tags || []).join(' ').toLowerCase();
      return meal.meal_type === filter.toLowerCase() || meal.meal_type === 'both' || tagText.includes(filter.toLowerCase());
    });
  }, [tabMeals, filter]);

  useEffect(() => {
    visibleMeals.slice(0, 12).forEach((meal) => router.prefetch(recipePath(meal)));
  }, [router, visibleMeals]);

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
      title={pathname.startsWith('/library') ? 'Your library' : 'My meals'}
      subtitle="Recipes you created, saved and rely on. Open one to plan, edit or share it."
      action={<button className="primary-btn" onClick={startNewMeal}>Add recipe</button>}
    >
      {pathname.startsWith('/library') ? (
        <nav className="library-tabs" aria-label="Library sections">
          <Link className={libraryTab === 'created' ? 'active' : ''} href="/library/created?tab=created">Created <span>{meals.length}</span></Link>
          <Link className={libraryTab === 'saved' ? 'active' : ''} href="/library/created?tab=saved">Saved <span>{history.saved.length}</span></Link>
          <Link className={libraryTab === 'cooked' ? 'active' : ''} href="/library/created?tab=cooked">Cooked <span>{history.cooked.length}</span></Link>
          <Link className={libraryTab === 'recent' ? 'active' : ''} href="/library/created?tab=recent">Recent <span>{history.recent.length}</span></Link>
        </nav>
      ) : null}
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
          <h3>{tabMeals.length ? 'No meals match this filter' : libraryTab === 'created' ? 'No meals yet' : `No ${libraryTab} recipes yet`}</h3>
          <p>{tabMeals.length ? 'Try All or another tag.' : libraryTab === 'saved' ? 'Save a recipe from Discover and it will appear here.' : libraryTab === 'cooked' ? 'Complete a recipe in Cooking mode and it will appear here.' : libraryTab === 'recent' ? 'Recipes you open will appear here for quick access.' : 'Add the first meal you already know how to cook. Leftovers and easy meals count too.'}</p>
          {libraryTab === 'created' ? <button className="primary-btn" onClick={startNewMeal}>{meals.length ? 'Add another meal' : 'Add your first meal'}</button> : <Link className="primary-btn" href="/discover">Browse recipes</Link>}
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
                  onOpen={() => router.push(recipePath(meal))}
                  actions={
                    <div className="meal-card-actions">
                      <Link className="soft-btn" href={recipePath(meal)}>Open</Link>
                      {meal.user_id === user.id || meals.some((item) => item.id === meal.id) ? <button className="soft-btn" onClick={() => startEditMeal(meal)}>Edit</button> : null}
                      {meal.user_id === user.id || meals.some((item) => item.id === meal.id) ? <button className="danger-btn" onClick={() => remove(meal.id)}>Delete</button> : null}
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
