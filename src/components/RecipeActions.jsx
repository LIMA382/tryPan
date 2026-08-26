'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { copyPublicMealForUser } from '@/lib/dataStore';
import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';
import { recordRecipeActivity } from '@/lib/libraryHistory';

export default function RecipeActions({ meal }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Record locally immediately so Recent never waits on a slow or unavailable
    // auth request. Once the session resolves, the same event is synced online.
    recordRecipeActivity(null, meal, 'recent').catch(() => null);
    if (!hasSupabaseEnv()) { const demo = { id: 'demo-user', email: 'demo@trypan.app' }; setUser(demo); setReady(true); return; }
    supabase?.auth.getSession()
      .then(({ data }) => {
        const sessionUser = data?.session?.user || null;
        setUser(sessionUser);
        if (sessionUser) recordRecipeActivity(sessionUser, meal, 'recent').catch(() => null);
      })
      .catch(() => null)
      .finally(() => setReady(true));
  }, [meal]);

  async function saveRecipe() {
    if (!user || saving) return;
    setSaving(true);
    try {
      const copied = await copyPublicMealForUser(user, meal);
      await recordRecipeActivity(user, copied || meal, 'saved').catch(() => null);
      setSaved(true);
    } finally { setSaving(false); }
  }

  const planPath = `/plan/week?recipe=${encodeURIComponent(meal.id)}`;
  const loginPath = `/login?mode=signup&returnTo=${encodeURIComponent(planPath)}`;

  return (
    <aside className="recipe-action-card panel-soft">
      <span>Ready to use this recipe?</span>
      <p>Turn it into a real plan and buy only what your pantry is missing.</p>
      <Link className="primary-btn" href={ready && user ? planPath : loginPath}>Add to my week</Link>
      {ready && user && meal.user_id !== user.id ? <button className="soft-btn" type="button" disabled={saving || saved} onClick={saveRecipe}>{saved ? 'Saved to Library' : saving ? 'Saving…' : 'Save to Library'}</button> : null}
      {!user && ready ? <Link className="soft-btn" href={`/login?mode=signup&returnTo=${encodeURIComponent(`/recipes/${meal.slug}`)}`}>Create free account</Link> : null}
      <Link className="soft-btn" href={`/recipes/${meal.slug}/cook`}>Start cooking</Link>
      <small>Recipe by {meal.creator}</small>
    </aside>
  );
}
