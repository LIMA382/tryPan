export function mergeActivityRows(serverRows = [], localRows = []) {
  const merged = new Map(serverRows.map((row) => [`${row.activity_type}:${row.recipe_key}`, row]));
  const updates = [];
  for (const row of localRows) {
    const key = `${row.activity_type}:${row.recipe_key}`;
    const current = merged.get(key);
    if (!current || new Date(row.occurred_at) > new Date(current.occurred_at)) {
      merged.set(key, row);
      updates.push(row);
    }
  }
  return { rows: Array.from(merged.values()), updates };
}
