const PREFIX = 'trypan.offline.v1';
const QUEUE_KEY = `${PREFIX}.queue`;

function browserStorage(storage) {
  if (storage) return storage;
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export function snapshotKey(userId, resource) { return `${PREFIX}.${userId}.${resource}`; }

export function writeSnapshot(userId, resource, data, storage) {
  const target = browserStorage(storage);
  if (!target || !userId) return data;
  target.setItem(snapshotKey(userId, resource), JSON.stringify({ savedAt: new Date().toISOString(), data }));
  return data;
}

export function readSnapshot(userId, resource, storage) {
  const target = browserStorage(storage);
  if (!target || !userId) return null;
  try { return JSON.parse(target.getItem(snapshotKey(userId, resource)) || 'null'); }
  catch { return null; }
}

export function pendingMutations(storage) {
  const target = browserStorage(storage);
  if (!target) return [];
  try { const value = JSON.parse(target.getItem(QUEUE_KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export function enqueueMutation(mutation, storage) {
  const target = browserStorage(storage);
  if (!target) return [];
  const current = pendingMutations(target).filter((item) => item.key !== mutation.key);
  const next = [...current, { ...mutation, queuedAt: new Date().toISOString() }];
  target.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
}

export function removeMutation(key, storage) {
  const target = browserStorage(storage);
  if (!target) return [];
  const next = pendingMutations(target).filter((item) => item.key !== key);
  target.setItem(QUEUE_KEY, JSON.stringify(next));
  return next;
}

export function isOffline() { return typeof navigator !== 'undefined' && navigator.onLine === false; }
