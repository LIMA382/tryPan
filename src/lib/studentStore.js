'use client';

import { getMonday } from './date';

const SETTINGS_KEY = 'trypan.student-settings.v1';
const PROGRESS_KEY = 'trypan.student-progress.v1';

export const defaultStudentSettings = {
  weeklyBudget: 45,
  maxPrepTime: 25,
  householdSize: 1,
  examMode: false,
  campusDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
};

export function loadStudentSettings() {
  if (typeof window === 'undefined') return defaultStudentSettings;
  try {
    return { ...defaultStudentSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return defaultStudentSettings;
  }
}

export function saveStudentSettings(settings) {
  const clean = { ...defaultStudentSettings, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
  return clean;
}

export function loadStudentProgress() {
  if (typeof window === 'undefined') return { week: getMonday(), completed: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    if (saved.week !== getMonday()) return { week: getMonday(), completed: [] };
    return { week: getMonday(), completed: saved.completed || [] };
  } catch {
    return { week: getMonday(), completed: [] };
  }
}

export function toggleStudentChallenge(id) {
  const progress = loadStudentProgress();
  const completed = progress.completed.includes(id)
    ? progress.completed.filter((item) => item !== id)
    : [...progress.completed, id];
  const next = { ...progress, completed };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  return next;
}
