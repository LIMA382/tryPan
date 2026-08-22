'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGate from '@/components/AuthGate';
import AppFrame from '@/components/AppFrame';
import { buildPantryAwareGroceryList, loadAllVisibleMeals, loadPantryItemsForUser, loadPantryTripsForUser, loadPlanForUser, suggestMealsFromPantry } from '@/lib/dataStore';
import { DAYS } from '@/lib/date';
import { defaultStudentSettings, loadStudentProgress, loadStudentSettings, saveStudentSettings, toggleStudentChallenge } from '@/lib/studentStore';

const money = (value) => `€${Number(value || 0).toFixed(2)}`;

function StudentContent({ user }) {
  const [settings, setSettings] = useState(defaultStudentSettings);
  const [progress, setProgress] = useState({ completed: [] });
  const [data, setData] = useState({ meals: [], pantry: [], trips: [], plan: null });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setSettings(loadStudentSettings());
    setProgress(loadStudentProgress());
    const [meals, pantry, trips, plan] = await Promise.all([
      loadAllVisibleMeals(user), loadPantryItemsForUser(user), loadPantryTripsForUser(user), loadPlanForUser(user),
    ]);
    setData({ meals, pantry, trips, plan });
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    const byId = new Map(data.meals.map((meal) => [meal.id, meal]));
    const planned = Object.values(data.plan?.slots || {}).map((id) => byId.get(id)).filter(Boolean);
    const planCost = planned.reduce((sum, meal) => sum + Number(meal.price || 0), 0);
    const grocery = buildPantryAwareGroceryList(data.meals, data.plan, data.pantry);
    const missingCost = grocery.reduce((sum, item) => sum + Number(item.missing_cost || 0), 0);
    const coverage = grocery.length ? Math.round((grocery.filter((item) => item.has_enough).length / grocery.length) * 100) : 0;
    const quickLimit = settings.examMode ? Math.min(15, settings.maxPrepTime) : settings.maxPrepTime;
    const quickMeals = data.meals.filter((meal) => Number(meal.prep_time || 0) <= quickLimit).sort((a, b) => Number(a.price || 0) - Number(b.price || 0)).slice(0, 4);
    const rescueMeals = suggestMealsFromPantry(data.meals, data.pantry).slice(0, 4);
    return { planned, planCost, missingCost, coverage, quickMeals, rescueMeals };
  }, [data, settings]);

  const budgetLeft = Number(settings.weeklyBudget || 0) - summary.missingCost;
  const challenges = [
    { id: 'plan-five', label: 'Plan 5 meals', done: summary.planned.length >= 5, detail: `${summary.planned.length}/5 planned` },
    { id: 'pantry-first', label: 'Use what you own', done: summary.coverage >= 50, detail: `${summary.coverage}% pantry coverage` },
    { id: 'budget-week', label: 'Stay inside budget', done: budgetLeft >= 0 && summary.planned.length > 0, detail: `${money(Math.abs(budgetLeft))} ${budgetLeft >= 0 ? 'left' : 'over'}` },
    { id: 'cook-one', label: 'Cook one planned meal', done: progress.completed.includes('cook-one'), detail: 'Tap when completed' },
  ];
  const completedCount = challenges.filter((challenge) => challenge.done || progress.completed.includes(challenge.id)).length;

  function updateSetting(key, value) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function persistSettings() {
    setSettings(saveStudentSettings(settings));
    setSaved(true);
  }

  function toggleDay(day) {
    updateSetting('campusDays', settings.campusDays.includes(day) ? settings.campusDays.filter((item) => item !== day) : [...settings.campusDays, day]);
  }

  function toggleChallenge(id) {
    setProgress(toggleStudentChallenge(id));
  }

  return (
    <AppFrame user={user} title="Student hub" subtitle="Keep meals quick, affordable and realistic around classes." eyebrow="Campus mode" action={<div className="student-level"><span>Weekly progress</span><strong>{completedCount}/4</strong></div>}>
      {loading ? <div className="card skeleton-card"><div className="skeleton-line wide" /><div className="skeleton-line" /></div> : (
        <div className="student-dashboard page-transition">
          <section className="student-hero panel-soft">
            <div>
              <span className="student-kicker">This week</span>
              <h3>{budgetLeft >= 0 ? `${money(budgetLeft)} left for groceries` : `${money(Math.abs(budgetLeft))} over your goal`}</h3>
              <p>Your plan needs about {money(summary.missingCost)} after checking the pantry.</p>
            </div>
            <div className="budget-ring" style={{ '--progress': `${Math.min(100, Math.max(0, (summary.missingCost / Math.max(1, settings.weeklyBudget)) * 100))}%` }}>
              <strong>{summary.coverage}%</strong><span>covered</span>
            </div>
            <div className="student-hero-actions">
              <Link className="primary-btn" href="/planner">Plan the week</Link>
              <Link className="soft-btn" href="/grocery">Open grocery list</Link>
            </div>
          </section>

          <section className="student-stat-grid">
            <article><span>Planned meals</span><strong>{summary.planned.length}</strong><small>of 21 available slots</small></article>
            <article><span>Food budget</span><strong>{money(settings.weeklyBudget)}</strong><small>your weekly target</small></article>
            <article><span>Pantry coverage</span><strong>{summary.coverage}%</strong><small>less waste, fewer purchases</small></article>
            <article><span>Cooking pace</span><strong>≤ {settings.examMode ? Math.min(15, settings.maxPrepTime) : settings.maxPrepTime} min</strong><small>{settings.examMode ? 'exam mode is on' : 'your preferred maximum'}</small></article>
          </section>

          <div className="student-main-grid">
            <section className="panel-soft student-card">
              <div className="card-header"><div><span className="student-kicker">Smart picks</span><h3>{settings.examMode ? 'Exam-week meals' : 'Quick meals between classes'}</h3></div><span className="badge">{summary.quickMeals.length} ideas</span></div>
              <div className="student-meal-list">
                {summary.quickMeals.map((meal) => <Link href="/planner" key={meal.id}><div><strong>{meal.title}</strong><span>{meal.prep_time} min · {meal.servings || 1} servings</span></div><em>{money(meal.price)}</em></Link>)}
                {!summary.quickMeals.length && <p>Add a faster meal to your library to see it here.</p>}
              </div>
            </section>

            <section className="panel-soft student-card">
              <div className="card-header"><div><span className="student-kicker">Pantry rescue</span><h3>Cook before buying more</h3></div><Link href="/pantry">View pantry</Link></div>
              <div className="student-meal-list">
                {summary.rescueMeals.map((meal) => <Link href="/planner" key={meal.id}><div><strong>{meal.title}</strong><span>{meal.pantry_matches} ingredients ready</span></div><em>{meal.pantry_coverage}%</em></Link>)}
                {!summary.rescueMeals.length && <p>Add pantry items to unlock matching meals.</p>}
              </div>
            </section>
          </div>

          <div className="student-main-grid">
            <section className="panel-soft student-card">
              <div className="card-header"><div><span className="student-kicker">Weekly quest</span><h3>Build a better routine</h3></div><span className="student-xp">+{completedCount * 25} XP</span></div>
              <div className="challenge-list">
                {challenges.map((challenge) => {
                  const done = challenge.done || progress.completed.includes(challenge.id);
                  return <button type="button" key={challenge.id} className={done ? 'done' : ''} onClick={() => !challenge.done && toggleChallenge(challenge.id)}><span>{done ? '✓' : '○'}</span><div><strong>{challenge.label}</strong><small>{challenge.detail}</small></div></button>;
                })}
              </div>
            </section>

            <section className="panel-soft student-card student-settings">
              <div className="card-header"><div><span className="student-kicker">Preferences</span><h3>Fit tryPan to student life</h3></div>{saved && <span className="saved-label">Saved</span>}</div>
              <div className="student-settings-grid">
                <label>Weekly budget (€)<input type="number" min="5" step="5" value={settings.weeklyBudget} onChange={(event) => updateSetting('weeklyBudget', Number(event.target.value))} /></label>
                <label>Max cooking time<input type="number" min="5" step="5" value={settings.maxPrepTime} onChange={(event) => updateSetting('maxPrepTime', Number(event.target.value))} /></label>
                <label>People to feed<input type="number" min="1" max="12" value={settings.householdSize} onChange={(event) => updateSetting('householdSize', Number(event.target.value))} /></label>
                <label className="exam-toggle"><input type="checkbox" checked={settings.examMode} onChange={(event) => updateSetting('examMode', event.target.checked)} /><span><strong>Exam mode</strong><small>Prioritize meals under 15 minutes</small></span></label>
              </div>
              <div><span className="settings-label">Days on campus</span><div className="campus-days">{DAYS.map((day) => <button type="button" className={settings.campusDays.includes(day) ? 'active' : ''} key={day} onClick={() => toggleDay(day)}>{day.slice(0, 2)}</button>)}</div></div>
              <button type="button" className="primary-btn" onClick={persistSettings}>Save student preferences</button>
            </section>
          </div>
        </div>
      )}
    </AppFrame>
  );
}

export default function StudentPage() {
  return <AuthGate>{(user) => <StudentContent user={user} />}</AuthGate>;
}

